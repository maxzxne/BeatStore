"""Contributor upload quotas and invites — no HTTP."""
import os
import sys
import unittest
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bootstrap  # noqa: F401, E402
from submit_rules import (  # noqa: E402
    FILE_MAX_BYTES,
    MAX_OPEN_SUBMISSIONS,
    MAX_SUBMISSIONS_PER_DAY,
    SubmitDenied,
    UploadRateLimiter,
    assert_can_create_submission,
    assert_file_size,
    created_today_count,
    hash_invite_token,
    invite_is_valid,
    new_invite_token,
)


NOW = datetime(2026, 9, 21, 15, 0, 0)


class InviteTokenTests(unittest.TestCase):
    def test_valid_token_matches_hash_before_expiry(self):
        token = new_invite_token()
        self.assertTrue(
            invite_is_valid(
                token_hash=hash_invite_token(token),
                offered_token=token,
                expires_at=NOW + timedelta(days=7),
                used_at=None,
                now=NOW,
            )
        )

    def test_used_or_expired_or_wrong_token_is_rejected(self):
        token = new_invite_token()
        hashed = hash_invite_token(token)
        self.assertFalse(
            invite_is_valid(
                token_hash=hashed,
                offered_token=token,
                expires_at=NOW + timedelta(days=7),
                used_at=NOW,
                now=NOW,
            )
        )
        self.assertFalse(
            invite_is_valid(
                token_hash=hashed,
                offered_token=token,
                expires_at=NOW - timedelta(seconds=1),
                used_at=None,
                now=NOW,
            )
        )
        self.assertFalse(
            invite_is_valid(
                token_hash=hashed,
                offered_token="not-the-token",
                expires_at=NOW + timedelta(days=7),
                used_at=None,
                now=NOW,
            )
        )


class CreateSubmissionQuotaTests(unittest.TestCase):
    def test_inactive_contributor_is_forbidden(self):
        with self.assertRaises(SubmitDenied) as ctx:
            assert_can_create_submission(
                is_active=False,
                open_count=0,
                created_today=0,
                storage_bytes=0,
            )
        self.assertEqual(ctx.exception.status_code, 403)

    def test_open_queue_cap_blocks_sixth_draft(self):
        with self.assertRaises(SubmitDenied) as ctx:
            assert_can_create_submission(
                is_active=True,
                open_count=MAX_OPEN_SUBMISSIONS,
                created_today=0,
                storage_bytes=0,
            )
        self.assertEqual(ctx.exception.status_code, 429)

    def test_daily_cap_blocks_fourth_create(self):
        with self.assertRaises(SubmitDenied) as ctx:
            assert_can_create_submission(
                is_active=True,
                open_count=0,
                created_today=MAX_SUBMISSIONS_PER_DAY,
                storage_bytes=0,
            )
        self.assertEqual(ctx.exception.status_code, 429)

    def test_storage_cap_blocks_new_upload(self):
        from submit_rules import MAX_STORAGE_BYTES

        with self.assertRaises(SubmitDenied) as ctx:
            assert_can_create_submission(
                is_active=True,
                open_count=0,
                created_today=0,
                storage_bytes=MAX_STORAGE_BYTES,
            )
        self.assertEqual(ctx.exception.status_code, 429)

    def test_within_limits_is_allowed(self):
        assert_can_create_submission(
            is_active=True,
            open_count=4,
            created_today=2,
            storage_bytes=100,
        )

    def test_created_today_counts_from_midnight(self):
        stamps = [
            datetime(2026, 9, 20, 23, 59, 0),
            datetime(2026, 9, 21, 0, 0, 0),
            datetime(2026, 9, 21, 14, 0, 0),
        ]
        self.assertEqual(created_today_count(stamps, NOW), 2)

    def test_quota_reset_ignores_uploads_before_reset(self):
        stamps = [
            datetime(2026, 9, 21, 10, 0, 0),
            datetime(2026, 9, 21, 14, 0, 0),
            datetime(2026, 9, 21, 15, 30, 0),
        ]
        reset_at = datetime(2026, 9, 21, 15, 0, 0)
        self.assertEqual(created_today_count(stamps, NOW, reset_at=reset_at), 1)


class UploadRateLimitTests(unittest.TestCase):
    def test_eleventh_hit_in_window_is_blocked(self):
        limiter = UploadRateLimiter(max_hits=10, window_seconds=15 * 60)
        for index in range(10):
            limiter.assert_allowed(1, NOW + timedelta(seconds=index))
        with self.assertRaises(SubmitDenied) as ctx:
            limiter.assert_allowed(1, NOW + timedelta(seconds=11))
        self.assertEqual(ctx.exception.status_code, 429)

    def test_other_contributor_has_separate_bucket(self):
        limiter = UploadRateLimiter(max_hits=1, window_seconds=60)
        limiter.assert_allowed(1, NOW)
        limiter.assert_allowed(2, NOW)

    def test_reset_clears_only_that_contributor(self):
        limiter = UploadRateLimiter(max_hits=1, window_seconds=60)
        limiter.assert_allowed(1, NOW)
        limiter.assert_allowed(2, NOW)
        limiter.reset(1)
        limiter.assert_allowed(1, NOW + timedelta(seconds=1))
        with self.assertRaises(SubmitDenied):
            limiter.assert_allowed(2, NOW + timedelta(seconds=1))


class FileSizeLimitTests(unittest.TestCase):
    def test_over_limit_is_rejected(self):
        with self.assertRaises(SubmitDenied) as ctx:
            assert_file_size("demo", FILE_MAX_BYTES["demo"] + 1)
        self.assertEqual(ctx.exception.status_code, 400)

    def test_cover_limit_is_smaller_than_demo(self):
        assert_file_size("cover", FILE_MAX_BYTES["cover"])
        with self.assertRaises(SubmitDenied):
            assert_file_size("cover", FILE_MAX_BYTES["demo"])


if __name__ == "__main__":
    unittest.main()
