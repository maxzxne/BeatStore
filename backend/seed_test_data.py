"""
Скрипт для заполнения базы данных тестовыми данными
Запускается автоматически при деплое, если данных нет.
Досыпает биты/курсы до целевого объёма, если уже есть, но мало
(чтобы каталог и обучение занимали несколько экранов).
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Beat, Course, CoursePurchase, PromoBanner, Purchase, ServiceOrder, User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Чтобы на десктопе/мобиле было «несколько страниц» скролла
TARGET_BEATS = 28
TARGET_COURSES = 14

BEAT_TITLES = [
    "Midnight Run",
    "Acid Rain",
    "Neon Drift",
    "Glass House",
    "Smoke Signal",
    "Low Voltage",
    "Chrome Heart",
    "After Hours",
    "Static Bloom",
    "Velvet Trap",
    "Iron Lungs",
    "Soft Launch",
    "Cold Open",
    "Pocket Knife",
    "Red Mirror",
    "Blue Room",
    "Ghost Note",
    "Hard Reset",
    "Slow Burn",
    "Night Bus",
    "Flatline",
    "Gold Dust",
    "Black Ice",
    "Warm Up",
    "Cut Scene",
    "Echo Chamber",
    "Paper Thin",
    "Last Frame",
    "Wide Angle",
    "Deep Focus",
]

COURSE_TITLES = [
    "Бит с нуля: FL Studio",
    "Сведение вокала под трэп",
    "Саунддизайн 808",
    "Аранжировка за вечер",
    "Микс в наушниках",
    "Мелодии без теории",
    "Драм-паттерны Drill",
    "Автотюн без пластика",
    "Сэмплы и клиринг",
    "Экспорт под витрину",
    "Стем-сведение",
    "Мастеринг лёгкий",
    "Ритм и свинг",
    "Патчи Serum",
    "Рабочий шаблон проекта",
    "От демо до релиза",
]

ARTISTS = ["XWinner", "maxzxne", "sint", "Studio North", "Night Desk"]
GENRES = ["Hip-Hop", "Trap", "R&B", "Pop", "Drill", "Boom Bap", "Afro"]
KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "Am", "Em", "Gm"]
BPMS = [128, 132, 140, 144, 150, 155, 160, 170, 92, 98, 110]
PURPOSES = ["битмэйкинг", "сведение", "саунддизайн", "аранжировка", "микс"]


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def _list_media(directory: str, exts: tuple[str, ...]) -> list[str]:
    if not os.path.isdir(directory):
        return []
    files = [
        f
        for f in os.listdir(directory)
        if f.lower().endswith(exts) and not f.startswith(".")
    ]
    return sorted(files)


def collect_media() -> dict:
    demos = _list_media("static/demos", (".mp3", ".wav", ".m4a"))
    audio = _list_media("static/audio", (".mp3", ".wav", ".m4a"))
    covers = _list_media("static/covers", (".jpg", ".jpeg", ".png", ".webp"))
    # svg — декоративные, для обложек каталога лучше растр
    covers = [c for c in covers if not c.lower().endswith(".svg")]
    previews = _list_media("static/course_previews", (".mp4", ".mov", ".avi", ".webm"))
    videos = _list_media("static/course_videos", (".mp4", ".mov", ".avi", ".webm"))
    wavs = _list_media("static/audio", (".wav",)) or _list_media("static/test_files", (".wav",))
    zips = _list_media("static/audio", (".zip",)) or _list_media("static/test_files", (".zip",))
    # seed-*.wav в demos тоже можно как demo
    print(
        f"📁 Медиа: {len(demos)} demo, {len(audio)} audio, {len(covers)} covers, "
        f"{len(previews)} previews, {len(videos)} videos, {len(wavs)} wav, {len(zips)} zip"
    )
    return {
        "demos": demos,
        "audio": audio,
        "covers": covers,
        "previews": previews,
        "videos": videos,
        "wavs": wavs,
        "zips": zips,
    }


def seed_demo_banners(db: Session) -> None:
    """Идемпотентно кладёт демо-баннеры из static/demo-banners."""
    existing = db.query(PromoBanner).count()
    if existing > 0:
        print("🖼️  Промо-баннеры уже есть, пропускаем")
        return

    banners_dir = "static/demo-banners"
    if not os.path.isdir(banners_dir):
        print(f"⚠️  Нет каталога {banners_dir}, баннеры не созданы")
        return

    now = datetime.utcnow()
    specs = [
        {
            "file": "01-novyi-drop.png",
            "title": "Новый drop",
            "body": "Свежие инструменталы в каталоге — слушай демо и бери лицензию.",
            "link_url": "/",
            "sort_order": 0,
        },
        {
            "file": "02-nedelya-licenzij.png",
            "title": "Неделя лицензий",
            "body": "Спецпредложение на MP3 / WAV — успей до конца недели.",
            "link_url": "/",
            "sort_order": 1,
        },
        {
            "file": "03-masterklass.png",
            "title": "Мастер-класс",
            "body": "Разбор битмейкинга и сведения — смотри курсы.",
            "link_url": "/courses",
            "sort_order": 2,
        },
    ]

    created = 0
    for spec in specs:
        path = os.path.join(banners_dir, spec["file"])
        if not os.path.isfile(path):
            print(f"⚠️  Файл баннера не найден: {path}")
            continue
        db.add(
            PromoBanner(
                title=spec["title"],
                body=spec["body"],
                image_url=f"/static/demo-banners/{spec['file']}",
                link_url=spec["link_url"],
                sort_order=spec["sort_order"],
                enabled=True,
                starts_at=now - timedelta(days=1),
                ends_at=now + timedelta(days=60),
            )
        )
        created += 1
        print(f"✅ Баннер: {spec['title']}")

    if created:
        db.commit()
        print(f"✅ Создано баннеров: {created}")


def _beat_pricing(index: int) -> tuple[float, float, float, float]:
    """Первые 2 — бесплатные, дальше платные."""
    if index < 2:
        return 0.0, 0.0, 0.0, 0.0
    base = 4000.0 + (index % 10) * 800.0
    return base, base, base * 1.5, base * 2.5


def create_beats(db: Session, media: dict, *, start_index: int, count: int) -> int:
    demos = media["demos"]
    audio = media["audio"]
    covers = media["covers"]
    wavs = media["wavs"]
    zips = media["zips"]
    if not demos and not audio:
        print("⚠️  Нет demo/audio — биты не создаём")
        return 0

    created = 0
    for i in range(start_index, start_index + count):
        title = BEAT_TITLES[i % len(BEAT_TITLES)]
        if i >= len(BEAT_TITLES):
            title = f"{title} {i // len(BEAT_TITLES) + 1}"
        # 3–5 индексы в первой партии — одноразовые (как раньше)
        is_one_shot = 3 <= i <= 5
        if is_one_shot and "(одноразовый)" not in title:
            title = f"{title} (одноразовый)"

        price, price_mp3, price_wav, price_exclusive = _beat_pricing(i)
        demo_file = demos[i % len(demos)] if demos else None
        if audio:
            mp3_url = f"/static/audio/{audio[i % len(audio)]}"
        elif demo_file:
            mp3_url = f"/static/demos/{demo_file}"
        else:
            mp3_url = None
        cover_file = covers[i % len(covers)] if covers else None

        beat = Beat(
            title=title,
            artist=ARTISTS[i % len(ARTISTS)],
            genre=GENRES[i % len(GENRES)],
            bpm=BPMS[i % len(BPMS)],
            key=KEYS[i % len(KEYS)],
            price=price,
            price_mp3=price_mp3,
            price_wav=price_wav,
            price_exclusive=price_exclusive,
            demo_url=f"/static/demos/{demo_file}" if demo_file else None,
            mp3_url=mp3_url,
            wav_url=f"/static/audio/{wavs[0]}" if wavs else None,
            exclusive_url=f"/static/audio/{zips[0]}" if zips else None,
            cover_url=f"/static/covers/{cover_file}" if cover_file else None,
            is_available=True,
            allow_multiple_purchases=not is_one_shot,
        )

        db.add(beat)
        created += 1
        print(f"✅ Бит: {title} ({price_mp3}₽)")

    if created:
        db.commit()
    return created


def create_courses(db: Session, media: dict, *, start_index: int, count: int) -> int:
    previews = media["previews"]
    videos = media["videos"]
    if not videos and not previews:
        print("⚠️  Нет course videos/previews — курсы не создаём")
        return 0

    # Превью можно крутить, полное видео — по кругу из имеющихся
    pool_videos = videos or previews
    pool_previews = previews or videos

    created = 0
    for i in range(start_index, start_index + count):
        title = COURSE_TITLES[i % len(COURSE_TITLES)]
        if i >= len(COURSE_TITLES):
            title = f"{title} · часть {i // len(COURSE_TITLES) + 1}"
        price = 0.0 if i == 0 else (9000.0 + (i % 8) * 1500.0)
        purpose = PURPOSES[i % len(PURPOSES)]
        preview = pool_previews[i % len(pool_previews)]
        video = pool_videos[i % len(pool_videos)]
        preview_dir = "course_previews" if preview in (previews or []) else "course_videos"
        video_dir = "course_videos" if video in (videos or []) else "course_previews"

        course = Course(
            title=title,
            description=f"Практический курс: {purpose}. Разборы, шаблоны и экспорт под витрину.",
            purpose=purpose,
            price=price,
            preview_video_url=f"/static/{preview_dir}/{preview}",
            full_video_url=f"/static/{video_dir}/{video}",
        )
        db.add(course)
        created += 1
        print(f"✅ Курс: {title} ({price}₽)")

    if created:
        db.commit()
    return created


def ensure_catalog_volume(db: Session, media: dict) -> None:
    """Досыпает биты/курсы до TARGET_*, если уже есть каталог, но он короткий."""
    beat_count = db.query(Beat).count()
    course_count = db.query(Course).count()

    if beat_count < TARGET_BEATS:
        need = TARGET_BEATS - beat_count
        print(f"📈 Досыпаем биты: есть {beat_count}, нужно +{need}")
        create_beats(db, media, start_index=beat_count, count=need)
    else:
        print(f"📦 Битов достаточно: {beat_count}")

    if course_count < TARGET_COURSES:
        need = TARGET_COURSES - course_count
        print(f"📈 Досыпаем курсы: есть {course_count}, нужно +{need}")
        create_courses(db, media, start_index=course_count, count=need)
    else:
        print(f"📦 Курсов достаточно: {course_count}")


def seed_orders_and_purchases(db: Session) -> None:
    now = datetime.utcnow()
    test_user = db.query(User).filter(User.username == "test_user").first()
    if not test_user:
        test_user = User(
            username="test_user",
            email="test@example.com",
            password_hash=get_password_hash("test123"),
            is_active=True,
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)
        print("✅ Создан тестовый пользователь test_user / test123")

    all_beats = db.query(Beat).order_by(Beat.id).all()
    all_courses = db.query(Course).order_by(Course.id).all()

    if len(all_beats) >= 3 and db.query(Purchase).filter(Purchase.user_id == test_user.id).count() == 0:
        for i, beat in enumerate(all_beats[:3]):
            purchase_type = "mp3" if i < 2 else "wav"
            if purchase_type == "mp3":
                actual_price = beat.price_mp3 if beat.price_mp3 is not None else beat.price
            elif purchase_type == "wav":
                actual_price = beat.price_wav if beat.price_wav is not None else beat.price
            else:
                actual_price = beat.price_exclusive if beat.price_exclusive is not None else beat.price
            db.add(
                Purchase(
                    user_id=test_user.id,
                    beat_id=beat.id,
                    purchase_date=now - timedelta(days=10 - i * 2),
                    price_paid=actual_price,
                    purchase_type=purchase_type,
                )
            )
            print(f"✅ Покупка бита: {beat.title}")
        db.commit()

    if len(all_courses) >= 2 and db.query(CoursePurchase).filter(CoursePurchase.user_id == test_user.id).count() == 0:
        for i, course in enumerate(all_courses[:2]):
            db.add(
                CoursePurchase(
                    user_id=test_user.id,
                    course_id=course.id,
                    purchase_date=now - timedelta(days=8 - i * 3),
                    price_paid=course.price,
                )
            )
            print(f"✅ Покупка курса: {course.title}")
        db.commit()

    if db.query(ServiceOrder).count() == 0:
        orders = [
            {
                "order_type": "know",
                "service_categories": json.dumps(["бит", "сведение"]),
                "deadline_days": 14,
                "prepayment_percent": 50,
                "price": 55000.0,
                "status": "completed",
                "description": "Старая заявка - знаю что хочу",
                "created_at": now - timedelta(days=20),
            },
            {
                "order_type": "dont_know",
                "service_categories": None,
                "deadline_days": None,
                "prepayment_percent": None,
                "price": 30000.0,
                "status": "completed",
                "description": "Старая заявка - не знаю что хочу",
                "created_at": now - timedelta(days=15),
            },
            {
                "order_type": "know",
                "service_categories": json.dumps(["бит в стиле трэп", "бит"]),
                "deadline_days": 7,
                "prepayment_percent": 100,
                "price": 45000.0,
                "status": "confirmed",
                "description": "Новая заявка - знаю что хочу",
                "created_at": now - timedelta(days=3),
            },
            {
                "order_type": "dont_know",
                "service_categories": None,
                "deadline_days": None,
                "prepayment_percent": None,
                "price": None,
                "status": "pending",
                "description": "Новая заявка - не знаю что хочу, нужна консультация",
                "created_at": now - timedelta(days=1),
            },
            {
                "order_type": "know",
                "service_categories": json.dumps(["трек под ключ"]),
                "deadline_days": 21,
                "prepayment_percent": 50,
                "price": 25000.0,
                "status": "paid",
                "description": "Заявка в работе",
                "created_at": now - timedelta(days=5),
            },
        ]
        for order_data in orders:
            db.add(
                ServiceOrder(
                    user_id=test_user.id,
                    order_type=order_data["order_type"],
                    service_categories=order_data["service_categories"],
                    deadline_days=order_data["deadline_days"],
                    prepayment_percent=order_data["prepayment_percent"],
                    price=order_data["price"],
                    status=order_data["status"],
                    description=order_data["description"],
                    created_at=order_data["created_at"],
                    updated_at=order_data["created_at"],
                )
            )
            print(f"✅ Заявка: {order_data['order_type']} ({order_data['status']})")
        db.commit()


def seed_test_data():
    """Заполняет / досыпает тестовые биты, курсы, заявки и баннеры."""
    db = SessionLocal()

    try:
        seed_demo_banners(db)
        media = collect_media()

        existing_beats = db.query(Beat).count()
        existing_courses = db.query(Course).count()

        if existing_beats == 0 and existing_courses == 0:
            print("🌱 Полное заполнение тестовыми данными...")
            create_beats(db, media, start_index=0, count=TARGET_BEATS)
            create_courses(db, media, start_index=0, count=TARGET_COURSES)
            seed_orders_and_purchases(db)
            print("✅ Тестовые данные успешно созданы!")
        else:
            print("🔄 Каталог уже есть — проверяем объём и досыпаем при необходимости")
            # Старое поведение: починить одноразовые Test Beat 4–6
            if existing_beats > 0:
                updated = 0
                for i, beat in enumerate(sorted(db.query(Beat).all(), key=lambda b: b.id), 1):
                    if "(одноразовый)" in beat.title and beat.allow_multiple_purchases:
                        beat.allow_multiple_purchases = False
                        updated += 1
                    elif beat.title.startswith("Test Beat") and 4 <= i <= 6:
                        if beat.allow_multiple_purchases:
                            beat.allow_multiple_purchases = False
                            if "(одноразовый)" not in beat.title:
                                beat.title = beat.title + " (одноразовый)"
                            updated += 1
                if updated:
                    db.commit()
                    print(f"✅ Обновлено одноразовых битов: {updated}")

            ensure_catalog_volume(db, media)
            seed_orders_and_purchases(db)
            print("✅ Объём каталога проверен")

    except Exception as e:
        print(f"❌ Ошибка при создании тестовых данных: {e}")
        import traceback

        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_test_data()
