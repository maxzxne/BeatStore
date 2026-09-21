"""Invite-only contributor cabinet. Included from main after auth deps exist."""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models import Beat, BeatSubmission, Contributor, ContributorInvite, User
from submit_rules import (
    FILE_MAX_BYTES,
    INVITE_TTL,
    OPEN_STATUSES,
    STORE_BENEFICIARY_NAME,
    SubmitDenied,
    UploadRateLimiter,
    assert_can_create_submission,
    assert_contributor_active,
    assert_file_size,
    created_today_count,
    hash_invite_token,
    invite_is_valid,
    new_invite_token,
)

upload_limiter = UploadRateLimiter()

FILE_KIND_BY_FIELD = {
    "demo_file": ("demo", "audio", "demo_url"),
    "mp3_file": ("mp3", "audio", "mp3_url"),
    "wav_file": ("wav", "audio", "wav_url"),
    "exclusive_file": ("exclusive", "archive", "exclusive_url"),
    "cover_file": ("cover", "image", "cover_url"),
}


class ContributorCreate(BaseModel):
    name: str
    notes: Optional[str] = None


class ContributorPatch(BaseModel):
    name: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class JoinPayload(BaseModel):
    token: str
    username: str
    password: str
    email: Optional[str] = None


class RejectPayload(BaseModel):
    reason: Optional[str] = None


def _http_denied(exc: SubmitDenied) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=exc.detail)


def _frontend_origin() -> str:
    return os.getenv("FRONTEND_URL", "").rstrip("/")


def contributor_out(contributor: Contributor) -> dict:
    return {
        "id": contributor.id,
        "name": contributor.name,
        "notes": contributor.notes,
        "is_active": bool(contributor.is_active),
        "user_id": contributor.user_id,
        "quota_reset_at": contributor.quota_reset_at,
        "created_at": contributor.created_at,
    }


def submission_out(item: BeatSubmission) -> dict:
    return {
        "id": item.id,
        "contributor_id": item.contributor_id,
        "status": item.status,
        "title": item.title,
        "artist": item.artist,
        "genre": item.genre,
        "key": item.key,
        "bpm": item.bpm,
        "price": item.price,
        "price_mp3": item.price_mp3,
        "price_wav": item.price_wav,
        "price_exclusive": item.price_exclusive,
        "description": item.description,
        "allow_multiple_purchases": bool(item.allow_multiple_purchases),
        "demo_url": item.demo_url,
        "wav_url": item.wav_url,
        "mp3_url": item.mp3_url,
        "exclusive_url": item.exclusive_url,
        "cover_url": item.cover_url,
        "storage_bytes": item.storage_bytes or 0,
        "reject_reason": item.reject_reason,
        "approved_beat_id": item.approved_beat_id,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def _open_count(db: Session, contributor_id: int) -> int:
    return (
        db.query(BeatSubmission)
        .filter(
            BeatSubmission.contributor_id == contributor_id,
            BeatSubmission.status.in_(tuple(OPEN_STATUSES)),
        )
        .count()
    )


def _created_today(
    db: Session,
    contributor_id: int,
    now: datetime,
    reset_at: Optional[datetime] = None,
) -> int:
    rows = (
        db.query(BeatSubmission.created_at)
        .filter(BeatSubmission.contributor_id == contributor_id)
        .all()
    )
    return created_today_count([row[0] for row in rows if row[0]], now, reset_at=reset_at)


def _storage_bytes(db: Session, contributor_id: int) -> int:
    rows = (
        db.query(BeatSubmission.storage_bytes)
        .filter(BeatSubmission.contributor_id == contributor_id)
        .all()
    )
    return sum(row[0] or 0 for row in rows)


def _unlink(url: Optional[str]) -> None:
    if not url:
        return
    path = url.lstrip("/")
    if os.path.exists(path):
        try:
            os.remove(path)
        except OSError:
            pass


def _save_limited_file(
    upload: UploadFile,
    dest_path: str,
    kind: str,
    allowed_types: list,
    file_type: str,
    validate_file,
    sanitize_filename,
) -> int:
    is_valid, error_msg = validate_file(upload, allowed_types, FILE_MAX_BYTES[kind], file_type)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    limit = FILE_MAX_BYTES[kind]
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    written = 0
    try:
        with open(dest_path, "wb") as buffer:
            while True:
                chunk = upload.file.read(1024 * 1024)
                if not chunk:
                    break
                written += len(chunk)
                if written > limit:
                    raise SubmitDenied("Файл слишком большой", 400)
                buffer.write(chunk)
    except SubmitDenied:
        _unlink("/" + dest_path)
        raise
    assert_file_size(kind, written)
    return written


def register_submit_routes(app):
    from main import (
        ALLOWED_ARCHIVE_TYPES,
        ALLOWED_AUDIO_TYPES,
        ALLOWED_IMAGE_TYPES,
        create_access_token,
        get_current_admin_user,
        get_current_user,
        get_db,
        get_password_hash,
        sanitize_filename,
        validate_file,
        verify_password,
    )

    allowed_by_type = {
        "audio": ALLOWED_AUDIO_TYPES,
        "image": ALLOWED_IMAGE_TYPES,
        "archive": ALLOWED_ARCHIVE_TYPES,
    }

    def get_current_contributor(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> Contributor:
        contributor = (
            db.query(Contributor).filter(Contributor.user_id == current_user.id).first()
        )
        if not contributor or not contributor.is_active:
            raise HTTPException(status_code=403, detail="Нет доступа")
        return contributor

    def own_submission(
        submission_id: int,
        contributor: Contributor,
        db: Session,
    ) -> BeatSubmission:
        item = (
            db.query(BeatSubmission)
            .filter(
                BeatSubmission.id == submission_id,
                BeatSubmission.contributor_id == contributor.id,
            )
            .first()
        )
        if not item:
            raise HTTPException(status_code=404, detail="Заявка не найдена")
        return item

    def attach_files(item: BeatSubmission, files: dict, now: datetime) -> None:
        added = 0
        for field, upload in files.items():
            if not upload or not getattr(upload, "filename", None):
                continue
            kind, file_type, url_attr = FILE_KIND_BY_FIELD[field]
            try:
                upload_limiter.assert_allowed(item.contributor_id, now)
            except SubmitDenied as exc:
                raise _http_denied(exc)
            safe_name = sanitize_filename(upload.filename or "file")
            stored = f"{kind}_{item.id}_{uuid.uuid4().hex[:8]}_{safe_name}"
            dest = f"static/submissions/{item.id}/{stored}"
            try:
                size = _save_limited_file(
                    upload,
                    dest,
                    kind,
                    allowed_by_type[file_type],
                    file_type,
                    validate_file,
                    sanitize_filename,
                )
            except SubmitDenied as exc:
                raise _http_denied(exc)
            old_url = getattr(item, url_attr)
            if old_url:
                _unlink(old_url)
                old_path = old_url.lstrip("/")
                if os.path.exists(old_path):
                    try:
                        item.storage_bytes = max(0, (item.storage_bytes or 0) - os.path.getsize(old_path))
                    except OSError:
                        pass
            setattr(item, url_attr, f"/static/submissions/{item.id}/{stored}")
            added += size
        item.storage_bytes = (item.storage_bytes or 0) + added
        item.updated_at = now

    def editable(item: BeatSubmission) -> None:
        if item.status == "approved":
            raise HTTPException(status_code=400, detail="Принятую заявку нельзя менять")

    @app.post("/api/admin/contributors")
    def create_contributor(
        payload: ContributorCreate,
        current_admin: User = Depends(get_current_admin_user),
        db: Session = Depends(get_db),
    ):
        name = (payload.name or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Имя обязательно")
        person = Contributor(name=name, notes=(payload.notes or "").strip() or None, is_active=True)
        db.add(person)
        db.commit()
        db.refresh(person)
        return contributor_out(person)

    @app.get("/api/admin/contributors")
    def list_contributors(
        current_admin: User = Depends(get_current_admin_user),
        db: Session = Depends(get_db),
    ):
        rows = db.query(Contributor).order_by(Contributor.id.asc()).all()
        return [contributor_out(row) for row in rows]

    @app.patch("/api/admin/contributors/{contributor_id}")
    def patch_contributor(
        contributor_id: int,
        payload: ContributorPatch,
        current_admin: User = Depends(get_current_admin_user),
        db: Session = Depends(get_db),
    ):
        person = db.query(Contributor).filter(Contributor.id == contributor_id).first()
        if not person:
            raise HTTPException(status_code=404, detail="Человек не найден")
        if payload.name is not None:
            name = payload.name.strip()
            if not name:
                raise HTTPException(status_code=400, detail="Имя обязательно")
            person.name = name
        if payload.notes is not None:
            person.notes = payload.notes.strip() or None
        if payload.is_active is not None:
            person.is_active = bool(payload.is_active)
        db.commit()
        db.refresh(person)
        return contributor_out(person)

    @app.post("/api/admin/contributors/{contributor_id}/reset-quota")
    def reset_contributor_quota(
        contributor_id: int,
        current_admin: User = Depends(get_current_admin_user),
        db: Session = Depends(get_db),
    ):
        person = db.query(Contributor).filter(Contributor.id == contributor_id).first()
        if not person:
            raise HTTPException(status_code=404, detail="Человек не найден")
        person.quota_reset_at = datetime.utcnow()
        upload_limiter.reset(person.id)
        db.commit()
        db.refresh(person)
        return contributor_out(person)

    @app.post("/api/admin/contributors/{contributor_id}/invite")
    def invite_contributor(
        contributor_id: int,
        current_admin: User = Depends(get_current_admin_user),
        db: Session = Depends(get_db),
    ):
        person = db.query(Contributor).filter(Contributor.id == contributor_id).first()
        if not person:
            raise HTTPException(status_code=404, detail="Человек не найден")
        token = new_invite_token()
        now = datetime.utcnow()
        invite = ContributorInvite(
            contributor_id=person.id,
            token_hash=hash_invite_token(token),
            expires_at=now + INVITE_TTL,
        )
        db.add(invite)
        db.commit()
        origin = _frontend_origin()
        return {
            "token": token,
            "expires_at": invite.expires_at,
            "invite_url": f"{origin}/submit/join?token={token}",
        }

    @app.get("/api/admin/submissions")
    def admin_list_submissions(
        status: Optional[str] = None,
        contributor_id: Optional[int] = None,
        current_admin: User = Depends(get_current_admin_user),
        db: Session = Depends(get_db),
    ):
        query = db.query(BeatSubmission)
        if status:
            query = query.filter(BeatSubmission.status == status)
        if contributor_id:
            query = query.filter(BeatSubmission.contributor_id == contributor_id)
        rows = query.order_by(BeatSubmission.created_at.desc()).all()
        people = {row.id: row.name for row in db.query(Contributor).all()}
        result = []
        for item in rows:
            payload = submission_out(item)
            payload["contributor_name"] = people.get(item.contributor_id)
            result.append(payload)
        return result

    @app.post("/api/admin/submissions/{submission_id}/approve")
    def approve_submission(
        submission_id: int,
        current_admin: User = Depends(get_current_admin_user),
        db: Session = Depends(get_db),
    ):
        item = db.query(BeatSubmission).filter(BeatSubmission.id == submission_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Заявка не найдена")
        if item.status == "approved" and item.approved_beat_id:
            return {"beat_id": item.approved_beat_id, "message": "already approved"}
        beat = Beat(
            title=item.title,
            artist=item.artist,
            genre=item.genre,
            key=item.key,
            bpm=item.bpm,
            price=item.price,
            price_mp3=item.price_mp3,
            price_wav=item.price_wav,
            price_exclusive=item.price_exclusive,
            description=item.description,
            demo_url=item.demo_url,
            wav_url=item.wav_url,
            mp3_url=item.mp3_url,
            exclusive_url=item.exclusive_url,
            cover_url=item.cover_url,
            allow_multiple_purchases=bool(item.allow_multiple_purchases),
            is_available=False,
            beneficiary_id=item.contributor_id,
        )
        db.add(beat)
        db.commit()
        db.refresh(beat)
        item.status = "approved"
        item.approved_beat_id = beat.id
        item.updated_at = datetime.utcnow()
        db.commit()
        return {"beat_id": beat.id, "message": "approved"}

    @app.post("/api/admin/submissions/{submission_id}/reject")
    def reject_submission(
        submission_id: int,
        payload: RejectPayload,
        current_admin: User = Depends(get_current_admin_user),
        db: Session = Depends(get_db),
    ):
        item = db.query(BeatSubmission).filter(BeatSubmission.id == submission_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Заявка не найдена")
        if item.status == "approved":
            raise HTTPException(status_code=400, detail="Принятую заявку нельзя отклонить")
        item.status = "rejected"
        item.reject_reason = (payload.reason or "").strip() or None
        item.updated_at = datetime.utcnow()
        db.commit()
        return submission_out(item)

    @app.post("/api/submit/join")
    def join_submit(payload: JoinPayload, db: Session = Depends(get_db)):
        token = (payload.token or "").strip()
        username = (payload.username or "").strip()
        password = payload.password or ""
        if not token or not username or not password:
            raise HTTPException(status_code=400, detail="Нужны токен, логин и пароль")
        now = datetime.utcnow()
        offered_hash = hash_invite_token(token)
        invite = (
            db.query(ContributorInvite)
            .filter(ContributorInvite.token_hash == offered_hash)
            .first()
        )
        if not invite or not invite_is_valid(
            token_hash=invite.token_hash,
            offered_token=token,
            expires_at=invite.expires_at,
            used_at=invite.used_at,
            now=now,
        ):
            raise HTTPException(status_code=400, detail="Ссылка недействительна")
        person = db.query(Contributor).filter(Contributor.id == invite.contributor_id).first()
        if not person or not person.is_active:
            raise HTTPException(status_code=403, detail="Доступ к загрузке отключён")
        if person.user_id:
            raise HTTPException(status_code=400, detail="Приглашение уже использовано")
        user = db.query(User).filter(User.username == username).first()
        if user:
            if not user.password_hash or not verify_password(password, user.password_hash):
                raise HTTPException(status_code=400, detail="Неверный логин или пароль")
            taken = db.query(Contributor).filter(Contributor.user_id == user.id).first()
            if taken:
                raise HTTPException(status_code=400, detail="Этот аккаунт уже привязан")
        else:
            email = (payload.email or "").strip() or None
            user = User(
                username=username,
                email=email,
                password_hash=get_password_hash(password),
                is_active=True,
                is_admin=False,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        person.user_id = user.id
        invite.used_at = now
        db.commit()
        access = create_access_token({"sub": user.username}, expires_delta=timedelta(minutes=480))
        return {
            "access_token": access,
            "token_type": "bearer",
            "contributor_id": person.id,
        }

    @app.get("/api/submit/me")
    def submit_me(contributor: Contributor = Depends(get_current_contributor)):
        return contributor_out(contributor)

    @app.get("/api/submit/submissions")
    def list_own_submissions(
        contributor: Contributor = Depends(get_current_contributor),
        db: Session = Depends(get_db),
    ):
        rows = (
            db.query(BeatSubmission)
            .filter(BeatSubmission.contributor_id == contributor.id)
            .order_by(BeatSubmission.created_at.desc())
            .all()
        )
        return [submission_out(row) for row in rows]

    @app.get("/api/submit/submissions/{submission_id}")
    def get_own_submission(
        submission_id: int,
        contributor: Contributor = Depends(get_current_contributor),
        db: Session = Depends(get_db),
    ):
        return submission_out(own_submission(submission_id, contributor, db))

    @app.post("/api/submit/submissions")
    async def create_submission(
        title: str = Form(...),
        artist: str = Form("Producer"),
        genre: str = Form(...),
        bpm: int = Form(...),
        price: float = Form(...),
        price_mp3: Optional[float] = Form(None),
        price_wav: Optional[float] = Form(None),
        price_exclusive: Optional[float] = Form(None),
        key: str = Form(None),
        description: str = Form(None),
        allow_multiple_purchases: str = Form("false"),
        demo_file: UploadFile = File(None),
        wav_file: UploadFile = File(None),
        mp3_file: UploadFile = File(None),
        exclusive_file: UploadFile = File(None),
        cover_file: UploadFile = File(None),
        contributor: Contributor = Depends(get_current_contributor),
        db: Session = Depends(get_db),
    ):
        now = datetime.utcnow()
        try:
            assert_can_create_submission(
                is_active=bool(contributor.is_active),
                open_count=_open_count(db, contributor.id),
                created_today=_created_today(
                    db, contributor.id, now, getattr(contributor, "quota_reset_at", None)
                ),
                storage_bytes=_storage_bytes(db, contributor.id),
            )
        except SubmitDenied as exc:
            raise _http_denied(exc)
        item = BeatSubmission(
            contributor_id=contributor.id,
            status="draft",
            title=title.strip(),
            artist=(artist or "Producer").strip() or "Producer",
            genre=genre.strip(),
            key=(key or "").strip() or None,
            bpm=bpm,
            price=price,
            price_mp3=price_mp3,
            price_wav=price_wav,
            price_exclusive=price_exclusive,
            description=(description or "").strip() or None,
            allow_multiple_purchases=str(allow_multiple_purchases).lower() == "true",
            storage_bytes=0,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        try:
            attach_files(
                item,
                {
                    "demo_file": demo_file,
                    "wav_file": wav_file,
                    "mp3_file": mp3_file,
                    "exclusive_file": exclusive_file,
                    "cover_file": cover_file,
                },
                now,
            )
        except HTTPException:
            db.delete(item)
            db.commit()
            raise
        db.commit()
        db.refresh(item)
        return submission_out(item)

    @app.put("/api/submit/submissions/{submission_id}")
    def update_submission(
        submission_id: int,
        payload: dict,
        contributor: Contributor = Depends(get_current_contributor),
        db: Session = Depends(get_db),
    ):
        item = own_submission(submission_id, contributor, db)
        editable(item)
        allowed = {
            "title",
            "artist",
            "genre",
            "key",
            "bpm",
            "price",
            "price_mp3",
            "price_wav",
            "price_exclusive",
            "description",
            "allow_multiple_purchases",
        }
        for key, value in payload.items():
            if key in allowed:
                setattr(item, key, value)
        item.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(item)
        return submission_out(item)

    @app.post("/api/submit/submissions/{submission_id}/files")
    async def update_submission_files(
        submission_id: int,
        demo_file: UploadFile = File(None),
        wav_file: UploadFile = File(None),
        mp3_file: UploadFile = File(None),
        exclusive_file: UploadFile = File(None),
        cover_file: UploadFile = File(None),
        contributor: Contributor = Depends(get_current_contributor),
        db: Session = Depends(get_db),
    ):
        item = own_submission(submission_id, contributor, db)
        editable(item)
        attach_files(
            item,
            {
                "demo_file": demo_file,
                "wav_file": wav_file,
                "mp3_file": mp3_file,
                "exclusive_file": exclusive_file,
                "cover_file": cover_file,
            },
            datetime.utcnow(),
        )
        db.commit()
        db.refresh(item)
        return submission_out(item)

    @app.post("/api/submit/submissions/{submission_id}/send")
    def send_submission(
        submission_id: int,
        contributor: Contributor = Depends(get_current_contributor),
        db: Session = Depends(get_db),
    ):
        item = own_submission(submission_id, contributor, db)
        editable(item)
        if not item.demo_url:
            raise HTTPException(status_code=400, detail="Нужно демо")
        item.status = "pending"
        item.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(item)
        return submission_out(item)

    @app.delete("/api/submit/submissions/{submission_id}")
    def delete_submission(
        submission_id: int,
        contributor: Contributor = Depends(get_current_contributor),
        db: Session = Depends(get_db),
    ):
        item = own_submission(submission_id, contributor, db)
        editable(item)
        for url in (item.demo_url, item.wav_url, item.mp3_url, item.exclusive_url, item.cover_url):
            _unlink(url)
        db.delete(item)
        db.commit()
        return {"message": "deleted"}
