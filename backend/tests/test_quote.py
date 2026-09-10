"""Server-side quote is the amount that goes on the intent."""
import os
import sys
import unittest

from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from payments.quote import QuoteError, beat_unit_price, service_order_amount


class BeatUnitPriceTests(unittest.TestCase):
    def test_uses_license_field_not_base_price(self):
        beat = SimpleNamespace(price=1, price_mp3=1000, price_wav=2000, price_exclusive=9000)
        self.assertEqual(beat_unit_price(beat, "mp3"), 1000)
        self.assertEqual(beat_unit_price(beat, "wav"), 2000)
        self.assertEqual(beat_unit_price(beat, "exclusive"), 9000)

    def test_falls_back_to_base_price_when_license_missing(self):
        beat = SimpleNamespace(price=1500, price_mp3=None, price_wav=None, price_exclusive=None)
        self.assertEqual(beat_unit_price(beat, "wav"), 1500.0)

    def test_unknown_license_is_error(self):
        beat = SimpleNamespace(price=1000, price_mp3=1000, price_wav=2000, price_exclusive=9000)
        with self.assertRaises(QuoteError):
            beat_unit_price(beat, "flac")


class ServiceOrderAmountTests(unittest.TestCase):
    def test_trap_beat_is_flat_15000_then_prepayment(self):
        order = SimpleNamespace(
            price=None,
            prepayment_percent=50,
            service_categories='["бит в стиле трэп"]',
            service_category=None,
            deadline_days=7,
        )
        self.assertEqual(service_order_amount(order), 7500.0)

    def test_seven_day_deadline_is_not_the_7_14_slot(self):
        order = SimpleNamespace(
            price=None,
            prepayment_percent=50,
            service_categories='["сведение"]',
            service_category=None,
            deadline_days=7,
        )
        self.assertEqual(service_order_amount(order), 17500.0)

    def test_explicit_admin_price_uses_prepayment_percent(self):
        order = SimpleNamespace(
            price=40000,
            prepayment_percent=50,
            service_categories=None,
            service_category=None,
            deadline_days=1,
        )
        self.assertEqual(service_order_amount(order), 20000.0)

    def test_full_price_from_tariff_when_admin_price_missing(self):
        from payments.quote import service_order_full_price, service_order_queue

        order = SimpleNamespace(
            price=None,
            prepayment_percent=50,
            service_categories='["бит в стиле трэп"]',
            service_category=None,
            deadline_days=7,
        )
        self.assertEqual(service_order_full_price(order), 15000.0)
        self.assertEqual(service_order_queue("paid"), "work")
        self.assertEqual(service_order_queue("in_progress"), "work")
        self.assertEqual(service_order_queue("confirmed"), "payment")


if __name__ == "__main__":
    unittest.main()
