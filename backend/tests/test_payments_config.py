"""Test checkout hosts on Robokassa even without a merchant cabinet."""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from payments import config
from payments.robokassa import checkout_url, format_out_sum, hosted_checkout_url


class PaymentCheckoutDestinationTests(unittest.TestCase):
    def setUp(self):
        self._env = os.environ.copy()

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self._env)

    def test_test_mode_without_login_uses_public_demo_shop(self):
        os.environ["PAYMENT_TEST"] = "true"
        os.environ["ROBOKASSA_MERCHANT_LOGIN"] = ""
        self.assertEqual(config.merchant_login_for_checkout(), "demo")
        self.assertTrue(config.use_hosted_robokassa())

    def test_live_mode_without_login_does_not_host(self):
        os.environ["PAYMENT_TEST"] = "false"
        os.environ["ROBOKASSA_MERCHANT_LOGIN"] = ""
        self.assertEqual(config.merchant_login_for_checkout(), "")
        self.assertFalse(config.use_hosted_robokassa())

    def test_explicit_login_wins_over_demo(self):
        os.environ["PAYMENT_TEST"] = "true"
        os.environ["ROBOKASSA_MERCHANT_LOGIN"] = "MyShop"
        self.assertEqual(config.merchant_login_for_checkout(), "MyShop")

    def test_hosted_url_never_points_at_local_terminal(self):
        os.environ["PAYMENT_TEST"] = "true"
        os.environ["ROBOKASSA_MERCHANT_LOGIN"] = ""
        os.environ["ROBOKASSA_PASSWORD1"] = "password_1"
        os.environ["FRONTEND_URL"] = "http://localhost:3000"
        url = hosted_checkout_url(inv_id=7, amount=1990, description="Night")
        self.assertTrue(url.startswith("https://auth.robokassa.ru/Merchant/Index.aspx?"))
        self.assertIn("IsTest=1", url)
        self.assertNotIn("/payment/pay", url)
        expected = checkout_url(
            merchant_login="demo",
            out_sum=format_out_sum(1990),
            inv_id=7,
            description="Night",
            password1="password_1",
            is_test=True,
            success_url="http://localhost:3000/payment/success?InvId=7",
            fail_url="http://localhost:3000/payment/failure?InvId=7",
        )
        self.assertEqual(url, expected)
