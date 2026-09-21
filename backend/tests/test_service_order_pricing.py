"""Tests for service_order_pricing helpers."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from service_order_pricing import (  # noqa: E402
    DEFAULT_SERVICE_ORDER_PRICING,
    build_price_vars,
    get_price_for_deadline,
    normalize_service_order_pricing,
    substitute_price_vars,
)


class ServiceOrderPricingTest(unittest.TestCase):
    def test_defaults(self):
        data = normalize_service_order_pricing(None)
        self.assertEqual(data["trap_price"], 15000)
        self.assertEqual(len(data["deadlines"]), 5)

    def test_substitute(self):
        text = substitute_price_vars(
            "от {{from}}, трэп {{trap}}, {{p50_7}}",
            DEFAULT_SERVICE_ORDER_PRICING,
        )
        self.assertIn("15 000 ₽", text)
        self.assertIn("35 000 ₽", text)
        self.assertNotIn("{{", text)

    def test_vars_include_cells(self):
        vars_map = build_price_vars(DEFAULT_SERVICE_ORDER_PRICING)
        self.assertIn("p100_21", vars_map)
        self.assertEqual(vars_map["p100_21"], "20 000 ₽")

    def test_get_price(self):
        self.assertEqual(get_price_for_deadline(DEFAULT_SERVICE_ORDER_PRICING, 21, 50), 25000)
        self.assertEqual(get_price_for_deadline(DEFAULT_SERVICE_ORDER_PRICING, 7, 100), 30000)


if __name__ == "__main__":
    unittest.main()
