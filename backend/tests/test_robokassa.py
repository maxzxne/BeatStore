"""Robokassa signature: init uses Password1, ResultURL uses Password2."""
import hashlib
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from payments.robokassa import (
    checkout_url,
    format_out_sum,
    sign_payment,
    sign_result,
    verify_result,
)


class RobokassaSignatureTests(unittest.TestCase):
    def test_format_out_sum_two_decimals(self):
        self.assertEqual(format_out_sum(1990), "1990.00")
        self.assertEqual(format_out_sum(10.5), "10.50")

    def test_init_signature_matches_md5_login_sum_invid_password1(self):
        expected = hashlib.md5(b"demo:10.00:42:pass1").hexdigest()
        self.assertEqual(
            sign_payment("demo", "10.00", 42, "pass1"),
            expected,
        )

    def test_result_signature_uses_password2_not_password1(self):
        init_sig = sign_payment("demo", "10.00", 42, "pass1")
        result_sig = sign_result("10.00", 42, "pass2")
        self.assertNotEqual(init_sig, result_sig)
        self.assertEqual(
            result_sig,
            hashlib.md5(b"10.00:42:pass2").hexdigest(),
        )

    def test_verify_result_accepts_valid_and_rejects_tampered(self):
        sig = sign_result("10.00", 42, "pass2")
        self.assertTrue(verify_result("10.00", 42, sig, "pass2"))
        self.assertFalse(verify_result("10.00", 42, sig, "wrong"))
        self.assertFalse(verify_result("99.00", 42, sig, "pass2"))
        self.assertFalse(verify_result("10.00", 1, sig, "pass2"))

    def test_checkout_url_is_robokassa_hosted_and_test_flag(self):
        url = checkout_url(
            merchant_login="demo",
            out_sum="10.00",
            inv_id=42,
            description="Beat",
            password1="password_1",
            is_test=True,
            success_url="http://localhost:3000/payment/success?InvId=42",
            fail_url="http://localhost:3000/payment/failure?InvId=42",
        )
        self.assertIn("https://auth.robokassa.ru/Merchant/Index.aspx?", url)
        self.assertIn("IsTest=1", url)
        self.assertIn("MerchantLogin=demo", url)
        self.assertNotIn("/payment/pay", url)

    def test_shp_params_appended_sorted(self):
        expected = hashlib.md5(
            b"demo:10.00:42:pass1:Shp_kind=beat:Shp_user=7"
        ).hexdigest()
        self.assertEqual(
            sign_payment(
                "demo",
                "10.00",
                42,
                "pass1",
                {"Shp_user": "7", "Shp_kind": "beat"},
            ),
            expected,
        )


if __name__ == "__main__":
    unittest.main()
