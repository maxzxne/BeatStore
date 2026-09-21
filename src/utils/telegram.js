/**
 * Telegram Mini App helpers (no console spam).
 */

export const isTelegramWebApp = () =>
  typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp);

export const getTelegramWebApp = () => {
  if (!isTelegramWebApp()) return null;
  return window.Telegram.WebApp;
};

export const initTelegramWebApp = () => {
  const tg = getTelegramWebApp();
  if (!tg) return null;
  try {
    tg.ready();
    tg.expand();
  } catch {
    /* ignore */
  }
  return tg;
};

export const getTelegramUser = () => {
  const tg = getTelegramWebApp();
  if (!tg) return null;
  return tg.initDataUnsafe?.user || null;
};

export const getTelegramAuthData = () => {
  const tg = getTelegramWebApp();
  const user = getTelegramUser();
  if (!tg || !user?.id) return null;

  let hash = null;
  let auth_date = null;
  if (tg.initData) {
    const params = new URLSearchParams(tg.initData);
    hash = params.get('hash');
    auth_date = params.get('auth_date');
  } else if (tg.initDataUnsafe) {
    hash = tg.initDataUnsafe.hash;
    auth_date = tg.initDataUnsafe.auth_date;
  }

  return {
    id: String(user.id),
    first_name: user.first_name || null,
    last_name: user.last_name || null,
    username: user.username || null,
    photo_url: user.photo_url || null,
    auth_date: auth_date || null,
    hash: hash || null,
    init_data: tg.initData || null,
  };
};

export const showMainButton = (text, onClick) => {
  const tg = getTelegramWebApp();
  if (!tg?.MainButton) return;
  tg.MainButton.setText(text);
  tg.MainButton.show();
  tg.MainButton.onClick(onClick);
};

export const hideMainButton = () => {
  const tg = getTelegramWebApp();
  if (!tg?.MainButton) return;
  tg.MainButton.hide();
};

export const showTelegramAlert = (message) => {
  const tg = getTelegramWebApp();
  if (!tg?.showAlert) {
    window.alert(message);
    return;
  }
  tg.showAlert(message);
};

export const openTelegramLink = (url) => {
  const tg = getTelegramWebApp();
  if (!tg?.openLink) {
    window.open(url, '_blank');
    return;
  }
  tg.openLink(url);
};

export const closeTelegramApp = () => {
  getTelegramWebApp()?.close?.();
};
