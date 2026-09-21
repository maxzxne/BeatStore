"""Contributor submit cabinet — invite, isolation, quotas, approve, revenue."""
from __future__ import annotations

import os
import sys
import unittest
from datetime import datetime, timedelta
from io import BytesIO

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from helpers import (  # noqa: E402
    PASSWORD,
    add_beat,
    add_user,
    api_client,
    auth,
    reset_schema,
    token_for,
)
from models import Beat, BeatSubmission, Contributor, Purchase  # noqa: E402
from submit_routes import upload_limiter  # noqa: E402
from submit_rules import MAX_OPEN_SUBMISSIONS, STORE_BENEFICIARY_NAME  # noqa: E402


def _mp3_file(name: str = "demo.mp3"):
    return (name, BytesIO(b"ID3" + b"\x00" * 64), "audio/mpeg")


class SubmitApiTests(unittest.TestCase):
    def setUp(self):
        self.db = reset_schema()
        self.client = api_client()
        upload_limiter._hits.clear()
        self.user = add_user(self.db, "buyer")
        self.admin = add_user(self.db, "root", admin=True)
        self.friend = add_user(self.db, "vasya")
        self.other = add_user(self.db, "petya")
        self.token = token_for("buyer")
        self.admin_token = token_for("root", admin=True)
        self.friend_token = token_for("vasya")
        self.other_token = token_for("petya")

    def tearDown(self):
        self.db.close()

    def _create_contributor(self, name="Вася"):
        response = self.client.post(
            "/api/admin/contributors",
            headers=auth(self.admin_token),
            json={"name": name, "notes": "друг"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def _invite(self, contributor_id):
        response = self.client.post(
            f"/api/admin/contributors/{contributor_id}/invite",
            headers=auth(self.admin_token),
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def _join(self, token, username="vasya", password=PASSWORD):
        response = self.client.post(
            "/api/submit/join",
            json={"token": token, "username": username, "password": password},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_buyer_cannot_open_submit_cabinet(self):
        listed = self.client.get("/api/submit/submissions", headers=auth(self.token))
        self.assertEqual(listed.status_code, 403)
        me = self.client.get("/api/submit/me", headers=auth(self.token))
        self.assertEqual(me.status_code, 403)
        anonymous = self.client.get("/api/submit/submissions")
        self.assertIn(anonymous.status_code, (401, 403))

    def test_buyer_cannot_create_contributor(self):
        response = self.client.post(
            "/api/admin/contributors",
            headers=auth(self.token),
            json={"name": "Вася"},
        )
        self.assertIn(response.status_code, (401, 403))

    def test_invite_join_marks_me_as_contributor(self):
        person = self._create_contributor()
        invite = self._invite(person["id"])
        self.assertIn("/submit/join?token=", invite["invite_url"])
        self._join(invite["token"])
        me = self.client.get("/me", headers=auth(self.friend_token))
        self.assertEqual(me.status_code, 200)
        self.assertTrue(me.json()["is_contributor"])
        self.assertEqual(me.json()["contributor_id"], person["id"])
        cabinet = self.client.get("/api/submit/me", headers=auth(self.friend_token))
        self.assertEqual(cabinet.status_code, 200)
        self.assertEqual(cabinet.json()["name"], "Вася")

    def test_used_invite_cannot_be_reused(self):
        person = self._create_contributor()
        invite = self._invite(person["id"])
        self._join(invite["token"])
        again = self.client.post(
            "/api/submit/join",
            json={"token": invite["token"], "username": "petya", "password": PASSWORD},
        )
        self.assertEqual(again.status_code, 400)

    def test_contributor_sees_only_own_submissions(self):
        first = self._create_contributor("Вася")
        second = self._create_contributor("Петя")
        self._join(self._invite(first["id"])["token"], username="vasya")
        self._join(self._invite(second["id"])["token"], username="petya")

        created = self.client.post(
            "/api/submit/submissions",
            headers=auth(self.friend_token),
            data={"title": "Vasya Beat", "artist": "Vasya", "genre": "trap", "bpm": "140", "price": "1000"},
            files={"demo_file": _mp3_file()},
        )
        self.assertEqual(created.status_code, 200, created.text)

        own = self.client.get("/api/submit/submissions", headers=auth(self.friend_token))
        other = self.client.get("/api/submit/submissions", headers=auth(self.other_token))
        self.assertEqual(len(own.json()), 1)
        self.assertEqual(own.json()[0]["title"], "Vasya Beat")
        self.assertEqual(other.json(), [])

        foreign_id = own.json()[0]["id"]
        stolen = self.client.get(
            f"/api/submit/submissions/{foreign_id}",
            headers=auth(self.other_token),
        )
        self.assertEqual(stolen.status_code, 404)

    def test_daily_create_cap_returns_429(self):
        from submit_rules import MAX_SUBMISSIONS_PER_DAY

        person = self._create_contributor()
        self._join(self._invite(person["id"])["token"])
        contributor = self.db.get(Contributor, person["id"])
        now = datetime.utcnow()
        for index in range(MAX_SUBMISSIONS_PER_DAY):
            self.db.add(
                BeatSubmission(
                    contributor_id=contributor.id,
                    title=f"Today {index}",
                    artist="Vasya",
                    genre="trap",
                    bpm=140,
                    price=1000,
                    status="draft",
                    created_at=now,
                )
            )
        self.db.commit()
        blocked = self.client.post(
            "/api/submit/submissions",
            headers=auth(self.friend_token),
            data={"title": "Too many", "artist": "Vasya", "genre": "trap", "bpm": "140", "price": "1000"},
            files={"demo_file": _mp3_file()},
        )
        self.assertEqual(blocked.status_code, 429)

    def test_admin_reset_quota_allows_upload_again_today(self):
        from submit_rules import MAX_SUBMISSIONS_PER_DAY

        person = self._create_contributor()
        self._join(self._invite(person["id"])["token"])
        contributor = self.db.get(Contributor, person["id"])
        now = datetime.utcnow()
        for index in range(MAX_SUBMISSIONS_PER_DAY):
            self.db.add(
                BeatSubmission(
                    contributor_id=contributor.id,
                    title=f"Today {index}",
                    artist="Vasya",
                    genre="trap",
                    bpm=140,
                    price=1000,
                    status="draft",
                    created_at=now,
                )
            )
        self.db.commit()
        blocked = self.client.post(
            "/api/submit/submissions",
            headers=auth(self.friend_token),
            data={"title": "Blocked", "artist": "Vasya", "genre": "trap", "bpm": "140", "price": "1000"},
            files={"demo_file": _mp3_file()},
        )
        self.assertEqual(blocked.status_code, 429)
        reset = self.client.post(
            f"/api/admin/contributors/{person['id']}/reset-quota",
            headers=auth(self.admin_token),
        )
        self.assertEqual(reset.status_code, 200, reset.text)
        allowed = self.client.post(
            "/api/submit/submissions",
            headers=auth(self.friend_token),
            data={"title": "After reset", "artist": "Vasya", "genre": "trap", "bpm": "140", "price": "1000"},
            files={"demo_file": _mp3_file()},
        )
        self.assertEqual(allowed.status_code, 200, allowed.text)

    def test_buyer_cannot_reset_quota(self):
        person = self._create_contributor()
        denied = self.client.post(
            f"/api/admin/contributors/{person['id']}/reset-quota",
            headers=auth(self.token),
        )
        self.assertIn(denied.status_code, (401, 403))

    def test_open_queue_cap_blocks_even_if_created_on_other_days(self):
        person = self._create_contributor()
        self._join(self._invite(person["id"])["token"])
        contributor = self.db.get(Contributor, person["id"])
        old = datetime.utcnow() - timedelta(days=2)
        for index in range(MAX_OPEN_SUBMISSIONS):
            self.db.add(
                BeatSubmission(
                    contributor_id=contributor.id,
                    title=f"Old {index}",
                    artist="Vasya",
                    genre="trap",
                    bpm=140,
                    price=1000,
                    status="pending",
                    created_at=old,
                )
            )
        self.db.commit()
        blocked = self.client.post(
            "/api/submit/submissions",
            headers=auth(self.friend_token),
            data={"title": "Sixth", "artist": "Vasya", "genre": "trap", "bpm": "140", "price": "1000"},
            files={"demo_file": _mp3_file()},
        )
        self.assertEqual(blocked.status_code, 429)

    def test_disabled_contributor_cannot_upload(self):
        person = self._create_contributor()
        self._join(self._invite(person["id"])["token"])
        paused = self.client.patch(
            f"/api/admin/contributors/{person['id']}",
            headers=auth(self.admin_token),
            json={"is_active": False},
        )
        self.assertEqual(paused.status_code, 200, paused.text)
        blocked = self.client.post(
            "/api/submit/submissions",
            headers=auth(self.friend_token),
            data={"title": "Nope", "artist": "Vasya", "genre": "trap", "bpm": "140", "price": "1000"},
            files={"demo_file": _mp3_file()},
        )
        self.assertEqual(blocked.status_code, 403)
        me = self.client.get("/api/submit/me", headers=auth(self.friend_token))
        self.assertEqual(me.status_code, 403)

    def test_admin_approve_creates_unpublished_beat_with_beneficiary(self):
        person = self._create_contributor()
        self._join(self._invite(person["id"])["token"])
        created = self.client.post(
            "/api/submit/submissions",
            headers=auth(self.friend_token),
            data={
                "title": "Night",
                "artist": "XWinner",
                "genre": "trap",
                "bpm": "150",
                "price": "2000",
                "price_mp3": "2000",
            },
            files={"demo_file": _mp3_file()},
        ).json()
        sent = self.client.post(
            f"/api/submit/submissions/{created['id']}/send",
            headers=auth(self.friend_token),
        )
        self.assertEqual(sent.status_code, 200, sent.text)
        approved = self.client.post(
            f"/api/admin/submissions/{created['id']}/approve",
            headers=auth(self.admin_token),
        )
        self.assertEqual(approved.status_code, 200, approved.text)
        beat = self.db.get(Beat, approved.json()["beat_id"])
        self.assertEqual(beat.title, "Night")
        self.assertEqual(beat.artist, "XWinner")
        self.assertEqual(beat.beneficiary_id, person["id"])
        self.assertFalse(beat.is_available)
        public = self.client.get("/beats")
        self.assertEqual(public.json(), [])

    def test_revenue_splits_by_beneficiary(self):
        person = self._create_contributor()
        own_beat = add_beat(self.db, "Store Hit")
        friend_beat = add_beat(self.db, "Friend Hit")
        friend_beat.beneficiary_id = person["id"]
        self.db.add(
            Purchase(user_id=self.user.id, beat_id=own_beat.id, price_paid=1000, purchase_type="mp3")
        )
        self.db.add(
            Purchase(user_id=self.user.id, beat_id=friend_beat.id, price_paid=2500, purchase_type="wav")
        )
        self.db.commit()

        stats = self.client.get("/api/admin/revenue", headers=auth(self.admin_token))
        self.assertEqual(stats.status_code, 200, stats.text)
        body = stats.json()
        self.assertEqual(body["beat_revenue"], 3500)
        names = {row["name"]: row for row in body["revenue_by_contributor"]}
        self.assertEqual(names[STORE_BENEFICIARY_NAME]["beat_revenue"], 1000)
        self.assertEqual(names["Вася"]["beat_revenue"], 2500)

        only_friend = self.client.get(
            f"/api/admin/revenue?contributor_id={person['id']}",
            headers=auth(self.admin_token),
        ).json()
        self.assertEqual(only_friend["beat_revenue"], 2500)
        self.assertEqual(only_friend["course_revenue"], 0)


if __name__ == "__main__":
    unittest.main()
