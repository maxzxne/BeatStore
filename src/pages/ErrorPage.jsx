import React from 'react';
import { useRouteError, Link } from 'react-router-dom';
import { Home, RefreshCw, AlertTriangle, FileX, Wifi, Server } from 'lucide-react';

const ErrorPage = () => {
  const error = useRouteError();

  const getErrorInfo = () => {
    if (error?.status === 404) {
      return {
        icon: FileX,
        title: 'Страница не найдена',
        message: 'К сожалению, запрашиваемая страница не существует.',
        suggestion: 'Проверьте правильность URL или вернитесь на главную страницу.',
      };
    }

    if (error?.status === 500) {
      return {
        icon: Server,
        title: 'Ошибка сервера',
        message: 'Произошла внутренняя ошибка сервера.',
        suggestion: 'Попробуйте обновить страницу или вернитесь позже.',
      };
    }

    if (error?.message?.includes('Network Error') || error?.message?.includes('fetch')) {
      return {
        icon: Wifi,
        title: 'Проблемы с подключением',
        message: 'Не удается подключиться к серверу.',
        suggestion: 'Проверьте интернет-соединение и попробуйте снова.',
      };
    }

    return {
      icon: AlertTriangle,
      title: 'Произошла ошибка',
      message: 'Что-то пошло не так. Мы уже работаем над исправлением.',
      suggestion: 'Попробуйте обновить страницу или вернитесь на главную.',
    };
  };

  const errorInfo = getErrorInfo();
  const Icon = errorInfo.icon;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-10">
      <div className="w-full max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e]">Error</p>
        <div className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
          <Icon className="h-10 w-10 text-red-400" />
        </div>

        <h1 className="mt-6 font-[Syne] text-3xl font-extrabold text-white">{errorInfo.title}</h1>
        <p className="mt-3 text-sm text-white/60">{errorInfo.message}</p>
        <p className="mt-2 text-sm text-white/40">{errorInfo.suggestion}</p>

        {import.meta.env.DEV && error && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left">
            <h3 className="mb-2 text-sm font-semibold text-white/70">Детали ошибки</h3>
            <pre className="overflow-auto text-xs text-white/40">{JSON.stringify(error, null, 2)}</pre>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <Link
            to="/"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#22c55e] text-sm font-semibold text-[#052e16] transition hover:brightness-110"
          >
            <Home className="mr-2 h-5 w-5" />
            На главную
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/15 text-sm text-white transition hover:bg-white/5"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Обновить страницу
          </button>
        </div>

        <p className="mt-8 text-sm text-white/40">
          Если проблема повторяется,{' '}
          <a href="mailto:support@XWinner.beats.please.com" className="text-[#22c55e] hover:underline">
            свяжитесь с поддержкой
          </a>
        </p>
      </div>
    </div>
  );
};

export default ErrorPage;
