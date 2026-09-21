import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Home, RefreshCw, AlertTriangle, FileX, Wifi, Server, Wrench } from 'lucide-react';

const PRESETS = {
  not_found: {
    icon: FileX,
    eyebrow: '404',
    code: '404',
    title: 'Страница не найдена',
    message: 'Такого адреса нет — или раздел временно скрыт.',
    suggestion: 'Вернись на главную или открой каталог битов.',
    accent: 'text-[#86efac]',
    ring: 'border-[#22c55e]/30 bg-[#22c55e]/10',
  },
  error: {
    icon: AlertTriangle,
    eyebrow: 'Error',
    code: '!',
    title: 'Что-то пошло не так',
    message: 'Непредвиденный сбой на стороне сайта.',
    suggestion: 'Обнови страницу. Если повторяется — напиши в поддержку.',
    accent: 'text-amber-300',
    ring: 'border-amber-500/30 bg-amber-500/10',
  },
  server: {
    icon: Server,
    eyebrow: 'Server',
    code: '500',
    title: 'Ошибка сервера',
    message: 'Сервер не смог обработать запрос.',
    suggestion: 'Попробуй чуть позже — мы уже чиним.',
    accent: 'text-red-300',
    ring: 'border-red-500/30 bg-red-500/10',
  },
  offline: {
    icon: Wifi,
    eyebrow: 'Offline',
    code: '—',
    title: 'Нет связи',
    message: 'Не удаётся достучаться до сервера.',
    suggestion: 'Проверь интернет и обнови страницу.',
    accent: 'text-sky-300',
    ring: 'border-sky-500/30 bg-sky-500/10',
  },
  maintenance: {
    icon: Wrench,
    eyebrow: 'Offline',
    code: '503',
    title: 'Сайт временно закрыт',
    message: 'Идут технические работы или подготовка релиза.',
    suggestion: 'Загляни позже — или зайди как администратор, если ты из команды.',
    accent: 'text-[#86efac]',
    ring: 'border-[#22c55e]/30 bg-[#22c55e]/10',
  },
};

/**
 * Unified OLED status page for 404 / crash / offline / maintenance.
 */
export default function ErrorPage({
  variant: variantProp = null,
  title: titleProp = null,
  message: messageProp = null,
} = {}) {
  const [params] = useSearchParams();
  const kindParam = params.get('kind') || params.get('reason');

  let variant = 'not_found';
  if (variantProp && PRESETS[variantProp]) variant = variantProp;
  else if (kindParam && PRESETS[kindParam]) variant = kindParam;

  const preset = PRESETS[variant] || PRESETS.error;
  const Icon = preset.icon;
  const title = titleProp || preset.title;
  const message = messageProp || preset.message;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-10">
      <main className="w-full max-w-md text-center" role="alert">
        <p className={`text-xs uppercase tracking-[0.3em] ${preset.accent}`}>{preset.eyebrow}</p>

        <div
          className={`mx-auto mt-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border ${preset.ring}`}
          aria-hidden="true"
        >
          <span className={`font-[Syne] text-xl font-bold tabular-nums ${preset.accent}`}>
            {preset.code}
          </span>
        </div>

        <div className="mt-4 flex justify-center text-white/25" aria-hidden="true">
          <Icon className="h-5 w-5" />
        </div>

        <h1 className="mt-4 font-[Syne] text-3xl font-extrabold tracking-tight text-white">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">{message}</p>
        <p className="mt-2 text-sm text-white/40">{preset.suggestion}</p>

        <div className="mt-8 space-y-3">
          <Link
            to="/"
            className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-[#22c55e] text-sm font-semibold text-[#052e16] transition duration-200 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/45"
          >
            <Home className="mr-2 h-5 w-5" />
            На главную
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-full border border-white/15 text-sm text-white transition duration-200 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/45"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Обновить страницу
          </button>
        </div>

        <p className="mt-8 text-sm text-white/40">
          Нужна помощь?{' '}
          <Link to="/support" className="text-[#22c55e] hover:underline">
            Поддержка
          </Link>
        </p>
      </main>
    </div>
  );
}
