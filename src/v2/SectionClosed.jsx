import React from 'react';
import { Link } from 'react-router-dom';
import { FileX, Home } from 'lucide-react';
import { useSiteSettings } from '../contexts/SiteSettingsContext';

export function SectionClosed({
  title = 'Страница недоступна',
  message = 'Этого раздела сейчас нет на сайте.',
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e]">Closed</p>
      <div className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
        <FileX className="h-10 w-10 text-white/45" aria-hidden="true" />
      </div>
      <h1 className="mt-6 font-[Syne] text-3xl font-extrabold text-white">{title}</h1>
      <p className="mt-3 text-sm text-white/55">{message}</p>
      <Link
        to="/"
        className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#22c55e] text-sm font-semibold text-[#052e16] transition hover:brightness-110"
      >
        <Home className="mr-2 h-5 w-5" aria-hidden="true" />
        На главную
      </Link>
    </div>
  );
}

function SectionLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4 text-sm text-white/40">
      Загрузка…
    </div>
  );
}

export function RequireCourses({ children }) {
  const { canSeeCourses, loading } = useSiteSettings();
  if (loading) return <SectionLoading />;
  if (!canSeeCourses) {
    return (
      <SectionClosed
        title="Обучение недоступно"
        message="Раздел курсов сейчас скрыт. Даже по прямой ссылке страница не открывается."
      />
    );
  }
  return children;
}

export function RequireAdsOrders({ children }) {
  const { adsOrdersEnabled, loading } = useSiteSettings();
  if (loading) return <SectionLoading />;
  if (!adsOrdersEnabled) {
    return (
      <SectionClosed
        title="Реклама недоступна"
        message="Заказ рекламы на витрине сейчас выключен. Даже по прямой ссылке форма не открывается."
      />
    );
  }
  return children;
}
