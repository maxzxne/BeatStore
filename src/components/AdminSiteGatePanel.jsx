import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, ShieldAlert } from 'lucide-react';
import { api } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import AdminToggle from './AdminToggle';

/**
 * Hidden admin controls: maintenance wall + HTTP Basic Auth.
 * Revealed only after several clicks on the discreet trigger.
 */
export default function AdminSiteGatePanel() {
  const { showSuccess, showError } = useNotification();
  const [unlocked, setUnlocked] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceTitle, setMaintenanceTitle] = useState('');
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [httpBasicEnabled, setHttpBasicEnabled] = useState(false);
  const [httpBasicUser, setHttpBasicUser] = useState('studio');
  const [httpBasicPassword, setHttpBasicPassword] = useState('');
  const [passwordSet, setPasswordSet] = useState(false);
  const [fromEnv, setFromEnv] = useState(false);

  const bumpUnlock = () => {
    setClicks((c) => {
      const next = c + 1;
      if (next >= 5) setUnlocked(true);
      return next;
    });
  };

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/admin/site-settings');
      setMaintenanceMode(!!data.maintenance_mode);
      setMaintenanceTitle(data.maintenance_title || '');
      setMaintenanceMessage(data.maintenance_message || '');
      setHttpBasicEnabled(!!data.http_basic_enabled);
      setHttpBasicUser(data.http_basic_user || 'studio');
      setPasswordSet(!!data.http_basic_password_set);
      setFromEnv(!!data.http_basic_from_env);
    } catch (e) {
      showError(e.response?.data?.detail || 'Не удалось загрузить системный доступ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (unlocked) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  const save = async () => {
    if (httpBasicEnabled && !passwordSet && !httpBasicPassword.trim() && !fromEnv) {
      showError('Сначала задай пароль HTTP Basic — иначе вход закроет всех, включая тебя');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        maintenance_mode: maintenanceMode,
        maintenance_title: maintenanceTitle,
        maintenance_message: maintenanceMessage,
        http_basic_enabled: httpBasicEnabled,
        http_basic_user: httpBasicUser,
      };
      if (httpBasicPassword.trim()) {
        payload.http_basic_password = httpBasicPassword.trim();
      }
      const { data } = await api.put('/api/admin/site-settings', payload);
      const s = data?.settings || {};
      setPasswordSet(!!s.http_basic_password_set);
      setFromEnv(!!s.http_basic_from_env);
      setHttpBasicPassword('');
      window.dispatchEvent(new Event('siteSettingsUpdated'));
      showSuccess('Системный доступ сохранён');
    } catch (e) {
      showError(e.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (!unlocked) {
    return (
      <div className="pt-8">
        <button
          type="button"
          onClick={bumpUnlock}
          className="mx-auto block cursor-default select-none px-2 py-1 text-[10px] tracking-[0.4em] text-white/10 transition hover:text-white/20"
          aria-label="Служебная зона"
          title=""
        >
          ···
        </button>
        {clicks > 0 && clicks < 5 && (
          <p className="mt-1 text-center text-[10px] text-white/15">{clicks}/5</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-5">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-[Syne] text-lg font-semibold text-white">Системный доступ</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            Скрытый режим для пререлиза и аварий: HTTP Basic (браузер спросит логин/пароль) и страница
            «сайт закрыт». Админка и вебхуки оплаты остаются доступны. Аварийный выключатель в env:{' '}
            <code className="text-white/60">SITE_GATE_DISABLE=1</code>.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-white/40">
          <Loader2 className="h-4 w-4 animate-spin" /> Загрузка…
        </p>
      ) : (
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-medium text-white">Закрыть сайт (maintenance)</h3>
            <p className="mt-1 text-xs text-white/40">
              Посетители видят OLED-страницу 503. Ты заходишь в /admin как обычно.
            </p>
            <div className="mt-3 flex min-h-[44px] items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <span className="text-sm text-white/80">
                {maintenanceMode ? 'Сайт закрыт для публики' : 'Сайт открыт'}
              </span>
              <AdminToggle
                checked={maintenanceMode}
                onChange={setMaintenanceMode}
                accent="amber"
                aria-label="Режим обслуживания"
              />
            </div>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/45">Заголовок</span>
              <input
                type="text"
                value={maintenanceTitle}
                onChange={(e) => setMaintenanceTitle(e.target.value)}
                placeholder="Сайт временно закрыт"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/45">Текст</span>
              <textarea
                rows={3}
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="Идёт настройка. Загляни позже."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
            </label>
          </section>

          <section className="border-t border-white/10 pt-5">
            <h3 className="flex items-center gap-2 text-sm font-medium text-white">
              <Lock className="h-4 w-4 text-white/50" />
              HTTP Basic Auth
            </h3>
            <p className="mt-1 text-xs text-white/40">
              Браузер покажет окно логина до любого контента. Удобно спрятать релиз, пока крутишь
              Robokassa / OAuth. Пароль хранится хешем.
            </p>
            {fromEnv && (
              <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
                Сейчас пароль задан через env (HTTP_BASIC_USER / HTTP_BASIC_PASSWORD) — он важнее
                настроек в БД.
              </p>
            )}
            <div className="mt-3 flex min-h-[44px] items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <span className="text-sm text-white/80">
                {httpBasicEnabled ? 'Basic включён' : 'Basic выключен'}
                {passwordSet ? '' : ' · пароль не задан'}
              </span>
              <AdminToggle
                checked={httpBasicEnabled}
                onChange={setHttpBasicEnabled}
                aria-label="HTTP Basic Auth"
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/45">Логин</span>
                <input
                  type="text"
                  autoComplete="off"
                  value={httpBasicUser}
                  onChange={(e) => setHttpBasicUser(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/45">
                  Новый пароль {passwordSet ? '(оставьте пустым, чтобы не менять)' : ''}
                </span>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={httpBasicPassword}
                    onChange={(e) => setHttpBasicPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 pr-11 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/40 hover:text-white"
                    aria-label={showPass ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-amber-500 px-5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Сохранить системный доступ
            </button>
            <a
              href="/status?kind=maintenance"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-white/15 px-5 text-sm text-white/70 transition hover:bg-white/5"
            >
              Превью страницы ошибки
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
