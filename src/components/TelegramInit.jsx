/**
 * Telegram Mini App bootstrap: theme + secure auto-login via initData HMAC.
 */

import { useEffect } from 'react';
import { initTelegramWebApp, getTelegramWebApp } from '../utils/telegram';
import { useAuth } from '../contexts/AuthContext';

const TelegramInit = () => {
  const { loginWithTelegram } = useAuth();

  useEffect(() => {
    const tg = initTelegramWebApp();
    if (!tg) return;

    try {
      tg.ready();
      tg.expand();
      if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor('#050505');
      if (typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor('#050505');
      document.documentElement.classList.add('tg-mini-app');
      document.documentElement.setAttribute('data-theme', tg.colorScheme || 'dark');
    } catch {
      /* older clients */
    }

    const attemptAutoLogin = () => {
      if (localStorage.getItem('token')) return true;
      const webapp = getTelegramWebApp();
      if (!webapp?.initData) return false;

      const user = webapp.initDataUnsafe?.user;
      if (!user?.id) return false;

      loginWithTelegram({
        id: String(user.id),
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        username: user.username || null,
        photo_url: user.photo_url || null,
        auth_date: webapp.initDataUnsafe?.auth_date || null,
        hash: webapp.initDataUnsafe?.hash || null,
        init_data: webapp.initData,
      }).catch(() => {});
      return true;
    };

    if (!localStorage.getItem('token')) {
      [0, 200, 800].forEach((delay) => {
        setTimeout(() => {
          if (!localStorage.getItem('token')) attemptAutoLogin();
        }, delay);
      });
    }

    tg.onEvent?.('themeChanged', () => {
      document.documentElement.setAttribute('data-theme', tg.colorScheme || 'dark');
    });
  }, [loginWithTelegram]);

  return null;
};

export default TelegramInit;
