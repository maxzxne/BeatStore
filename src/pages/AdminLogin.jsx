import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, User, Loader2, Shield } from 'lucide-react';
import { api } from '../utils/api';
import YandexSmartCaptcha from '../components/YandexSmartCaptcha';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [captchaClientKey, setCaptchaClientKey] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [pending2fa, setPending2fa] = useState(null);
  const [otpCode, setOtpCode] = useState('');

  const { adminLogin, complete2fa } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/auth-settings')
      .then((res) => {
        setCaptchaEnabled(!!res.data?.captcha_enabled);
        setCaptchaClientKey(res.data?.captcha_client_key || '');
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (pending2fa) {
      const result = await complete2fa(pending2fa, otpCode, { asAdmin: true });
      if (result.success) {
        navigate('/admin/dashboard');
      } else {
        setError(result.error);
      }
      setLoading(false);
      return;
    }

    if (captchaEnabled && !captchaToken) {
      setError('Подтвердите капчу');
      setLoading(false);
      return;
    }

    const result = await adminLogin(username, password, captchaToken || null);

    if (result.requires_2fa) {
      setPending2fa(result.temp_token);
    } else if (result.success) {
      navigate('/admin/dashboard');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 text-white">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 shadow-2xl sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#22c55e]/15 text-[#22c55e]">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="font-[Syne] text-2xl font-bold">
              {pending2fa ? '2FA' : 'Админ-вход'}
            </h1>
            <p className="mt-1 text-sm text-white/45">
              {pending2fa ? 'Код из аутентификатора' : 'Только для администраторов'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {pending2fa ? (
              <div>
                <label htmlFor="admin_otp" className="mb-2 block text-sm font-medium text-white/80">
                  Код подтверждения
                </label>
                <div className="relative">
                  <Shield className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    id="admin_otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className={fieldClass}
                    placeholder="6 цифр или резервный код"
                    required
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="admin_username" className="mb-2 block text-sm font-medium text-white/80">
                    Логин
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/40" />
                    <input
                      id="admin_username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={fieldClass}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="admin_password" className="mb-2 block text-sm font-medium text-white/80">
                    Пароль
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/40" />
                    <input
                      id="admin_password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={fieldClass}
                      required
                    />
                  </div>
                </div>
                {captchaEnabled && (
                  <YandexSmartCaptcha sitekey={captchaClientKey} onToken={setCaptchaToken} />
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#22c55e] text-base font-semibold text-[#052e16] transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : pending2fa ? 'Подтвердить' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
