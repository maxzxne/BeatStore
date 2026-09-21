"""Storefront sale then personal promo; pay floor is 1 RUB when list price > 0."""
import os
import sys
import unittest
from datetime import datetime, timedelta
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from payments.discounts import (  # noqa: E402
    apply_kind,
    apply_sale_then_promo,
    finalize_pay,
    is_sale_active,
    pick_best_sale,
    sale_applies,
)


def sale(**kwargs):
    now = datetime(2026, 9, 21)
    data = dict(
        enabled=True,
        scope="beats",
        kind="percent",
        value=20,
        starts_at=None,
        ends_at=None,
    )
    data.update(kwargs)
    data.setdefault("_now", now)
    return SimpleNamespace(**data)


class ApplyKindTests(unittest.TestCase):
    def test_percent_takes_portion(self):
        self.assertEqual(apply_kind(1000, "percent", 20), 800)

    def test_amount_subtracts_rubles(self):
        self.assertEqual(apply_kind(1000, "amount", 150), 850)

    def test_percent_over_100_does_not_go_negative(self):
        self.assertEqual(apply_kind(500, "percent", 100), 0)


class FinalizePayTests(unittest.TestCase):
    def test_paid_item_cannot_fall_below_one_ruble(self):
        self.assertEqual(finalize_pay(1000, 0), 1)
        self.assertEqual(finalize_pay(1000, 0.4), 1)

    def test_free_item_stays_zero(self):
        self.assertEqual(finalize_pay(0, 0), 0)


class SaleWindowTests(unittest.TestCase):
    def test_disabled_or_outside_window_is_inactive(self):
        now = datetime(2026, 9, 21)
        self.assertFalse(is_sale_active(sale(enabled=False), now))
        self.assertFalse(is_sale_active(sale(starts_at=now + timedelta(days=1)), now))
        self.assertFalse(is_sale_active(sale(ends_at=now - timedelta(days=1)), now))
        self.assertTrue(is_sale_active(sale(), now))

    def test_all_scope_applies_to_beats(self):
        self.assertTrue(sale_applies(sale(scope="all"), "beats"))
        self.assertFalse(sale_applies(sale(scope="courses"), "beats"))

    def test_ads_scope_does_not_use_all_catalog_sale(self):
        self.assertTrue(sale_applies(sale(scope="ads"), "ads"))
        self.assertFalse(sale_applies(sale(scope="all"), "ads"))
        self.assertFalse(sale_applies(sale(scope="services"), "ads"))


class StackingTests(unittest.TestCase):
    def test_best_sale_wins_not_stacked_campaigns(self):
        now = datetime(2026, 9, 21)
        chosen, pay = pick_best_sale(
            1000,
            [sale(kind="percent", value=10), sale(kind="percent", value=30, scope="all")],
            "beats",
            now,
        )
        self.assertEqual(pay, 700)
        self.assertEqual(chosen.value, 30)

    def test_promo_applies_after_sale_then_floor(self):
        storefront = sale(kind="percent", value=50)
        promo = SimpleNamespace(kind="percent", value=100)
        self.assertEqual(apply_sale_then_promo(2000, storefront, promo), 1)

    def test_promo_amount_after_percent_sale(self):
        storefront = sale(kind="percent", value=20)
        promo = SimpleNamespace(kind="amount", value=100)
        self.assertEqual(apply_sale_then_promo(1000, storefront, promo), 700)


if __name__ == "__main__":
    unittest.main()
