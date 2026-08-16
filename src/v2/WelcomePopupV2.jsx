import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

const WelcomePopupV2 = () => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();
  const { canSeeCourses } = useSiteSettings();

  useEffect(() => {
    const wasClosed = localStorage.getItem('welcomePopupClosed');
    if (!wasClosed) setIsVisible(true);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('welcomePopupClosed', 'true');
  };

  const go = (path) => {
    navigate(path);
    handleClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="v2-reveal relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b16] p-8 shadow-[0_0_80px_rgba(34,197,94,0.15)]">
        <button type="button" onClick={handleClose} className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full text-white/50 hover:text-white hover:bg-white/10" aria-label="Закрыть">
          <X className="h-5 w-5" />
        </button>
        <p className="font-[Syne] text-2xl font-extrabold">XWinner<span className="text-[#22c55e]">.</span></p>
        <p className="mt-2 mb-8 text-sm text-white/50">Выбери, с чего начать</p>
        <div className="space-y-3">
          <button type="button" onClick={() => go('/')} className="w-full h-14 rounded-2xl bg-[#22c55e] text-[#0f172a] font-semibold hover:brightness-110 transition">
            Каталог
          </button>
          <button type="button" onClick={() => go('/order')} className="w-full h-14 rounded-2xl border border-white/15 bg-white/5 font-semibold hover:bg-white/10 transition">
            Заказать
          </button>
          {canSeeCourses && (
            <button type="button" onClick={() => go('/courses')} className="w-full h-14 rounded-2xl border border-white/15 bg-white/5 font-semibold hover:bg-white/10 transition">
              Научиться
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomePopupV2;
