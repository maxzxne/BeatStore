"""Isolate BeatStore tests from the developer DB and live providers.

Must be imported before `database` / `main`.
"""
from __future__ import annotations

import atexit
import os
import tempfile

_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if os.path.isdir(_BACKEND):
    os.chdir(_BACKEND)

_fd, DB_PATH = tempfile.mkstemp(prefix="beatstore-test-", suffix=".db")
os.close(_fd)

os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH}"
os.environ["BEATSTORE_TESTING"] = "1"
os.environ["PAYMENT_TEST"] = "true"
os.environ["PAYMENT_PROVIDER"] = "robokassa"
os.environ["ROBOKASSA_MERCHANT_LOGIN"] = ""
os.environ["ROBOKASSA_PASSWORD1"] = "test_password_1"
os.environ["ROBOKASSA_PASSWORD2"] = "test_password_2"
os.environ["TELEGRAM_BOT_TOKEN"] = ""
os.environ["JWT_SECRET_KEY"] = "beatstore-test-secret"
os.environ["FRONTEND_URL"] = "http://test.local"


def _cleanup() -> None:
    for path in (DB_PATH, DB_PATH + "-journal", DB_PATH + "-wal", DB_PATH + "-shm"):
        try:
            os.unlink(path)
        except OSError:
            pass


atexit.register(_cleanup)
