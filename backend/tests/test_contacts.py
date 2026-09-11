"""Contact list stored in users.additional_contact — parse, clean, format for orders."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from contacts import format_contacts, parse_contacts, serialize_contacts  # noqa: E402


class ParseContactsTest(unittest.TestCase):
    def test_empty_becomes_no_rows(self):
        self.assertEqual(parse_contacts(None), [])
        self.assertEqual(parse_contacts(""), [])
        self.assertEqual(parse_contacts("   "), [])

    def test_legacy_plain_string_becomes_other(self):
        self.assertEqual(
            parse_contacts("@mytelegram, +79991234567"),
            [{"type": "other", "value": "@mytelegram, +79991234567"}],
        )

    def test_json_list_is_normalized(self):
        raw = '[{"type": "telegram", "value": " @nick "}, {"type": "whatsapp", "value": "+7999"}]'
        self.assertEqual(
            parse_contacts(raw),
            [
                {"type": "telegram", "value": "@nick"},
                {"type": "whatsapp", "value": "+7999"},
            ],
        )

    def test_empty_and_unknown_rows_are_dropped_or_coerced(self):
        raw = (
            '[{"type": "telegram", "value": ""},'
            ' {"type": "icq", "value": "123"},'
            ' {"type": "phone", "value": "+7 900"}]'
        )
        self.assertEqual(
            parse_contacts(raw),
            [
                {"type": "other", "value": "123"},
                {"type": "phone", "value": "+7 900"},
            ],
        )


class SerializeContactsTest(unittest.TestCase):
    def test_roundtrip_drops_blank_rows(self):
        raw = serialize_contacts(
            [
                {"type": "telegram", "value": "@nick"},
                {"type": "whatsapp", "value": "  "},
            ]
        )
        self.assertEqual(raw, '[{"type": "telegram", "value": "@nick"}]')

    def test_empty_list_stores_null(self):
        self.assertIsNone(serialize_contacts([]))
        self.assertIsNone(serialize_contacts(None))


class FormatContactsTest(unittest.TestCase):
    def test_order_autofill_string(self):
        self.assertEqual(
            format_contacts(
                [
                    {"type": "telegram", "value": "@nick"},
                    {"type": "whatsapp", "value": "+79991234567"},
                ]
            ),
            "Telegram: @nick · WhatsApp: +79991234567",
        )

    def test_empty_formats_to_empty(self):
        self.assertEqual(format_contacts([]), "")


if __name__ == "__main__":
    unittest.main()
