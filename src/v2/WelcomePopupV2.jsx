import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

/**
 * Soft welcome: delayed, once per browser (localStorage), skip if already browsing deep link.
 */
const WelcomePopupV2 = () => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const { canSeeCourses } = useSiteSettings();

  useEffect(() => {
    if (localStorage.getItem('welcomePopupClosed')) return;
    if (window.location.pathname !== '/') return;

    const timer = setTimeout(() => {
      if (!localStorage.getItem('welcomePopupClosed')) setIsVisible(true);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('welcomePopupClosed', 'true');
  };

  const go = (path) => {
    handleClose();
    if (path !== '/') navigate(path);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="v2-reveal relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] p-8 shadow-[0_0_80px_rgba(34,197,94,0.12)]">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
          aria-label="Закрыть"
        >
          <X className="h-5 w-5" />
        </button>
        <p className="font-[Syne] text-2xl font-extrabold">
          XWinner<span className="text-[#22c55e]">.</span>
        </p>
        <p className="mb-8 mt-2 text-sm text-white/50">Куда сначала?</p>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => go('/')}
            className="h-14 w-full rounded-2xl bg-[#22c55e] font-semibold text-[#052e16] transition hover:brightness-110"
          >
            Слушать биты
          </button>
          <button
            type="button"
            onClick={() => go('/order')}
            className="h-14 w-full rounded-2xl border border-white/15 bg-white/5 font-semibold transition hover:bg-white/10"
          >
            Заказать услугу
          </button>
          {canSeeCourses && (
            <button
              type="button"
              onClick={() => go('/courses')}
              className="h-14 w-full rounded-2xl border border-white/15 bg-white/5 font-semibold transition hover:bg-white/10"
            >
              Обучение
            </button>
          )}
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-2 text-sm text-white/40 transition hover:text-white/70"
          >
            Просто смотреть
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePopupV2;
