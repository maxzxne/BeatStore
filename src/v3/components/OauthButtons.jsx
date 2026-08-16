import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { Button } from '../components/Primitives';

export default function OauthButtons({ loading, onError }) {
  const [settings, setSettings] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/oauth-settings')
      .then((response) => {
        if (!cancelled) setSettings(response.data || {});
      })
      .catch(() => {
        if (!cancelled) {
          setSettings({
            google: { is_hidden: true },
            vk: { is_hidden: true },
            yandex: { is_hidden: true },
            telegram: { is_hidden: false },
          });
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  const start = async (provider) => {
    if (provider === 'telegram') {
      const bot = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'XWinnerbeatpleasebot';
      window.location.href = `tg://resolve?domain=${bot}&start=auth_${Date.now()}`;
      setTimeout(() => window.open(`https://t.me/${bot}?start=auth_${Date.now()}`, '_blank'), 500);
      onError?.('Откройте бота в Telegram, затем вернитесь на сайт.');
      return;
    }
    const { getOAuthUrl } = await import('../../utils/oauth');
    window.location.href = getOAuthUrl(provider);
  };

  if (!ready) return null;
  const visible = ['google', 'vk', 'yandex', 'telegram'].filter((key) => settings[key] && !settings[key].is_hidden);
  if (!visible.length) return null;

  const label = { google: 'Google', vk: 'VK', yandex: 'Yandex', telegram: 'Telegram' };

  return (
    <div className="mt-8 space-y-2">
      <p className="v3-label mb-3">Или через</p>
      {visible.map((provider) => (
        <Button
          key={provider}
          variant="secondary"
          className="w-full"
          disabled={loading || settings[provider]?.is_disabled}
          onClick={() => start(provider)}
        >
          {label[provider]}
        </Button>
      ))}
    </div>
  );
}
