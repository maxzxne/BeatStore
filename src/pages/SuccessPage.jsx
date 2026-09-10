import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Download, Home } from 'lucide-react';

const SuccessPage = () => {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-16">
      <div className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-[#22c55e]">XWinner · Done</p>
        <CheckCircle className="mx-auto mt-5 h-14 w-14 text-[#22c55e]" />
        <h1 className="mt-4 font-[Syne] text-3xl font-extrabold text-white">Покупка успешна</h1>
        <p className="mt-2 text-sm text-white/50">
          Файлы уже в покупках — скачай в любой момент.
        </p>

        <div className="mt-8 space-y-3">
          <Link
            to="/purchases"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#22c55e] text-sm font-semibold text-[#0f172a] transition hover:brightness-110"
          >
            <Download className="h-4 w-4" />
            Мои покупки
          </Link>
          <Link
            to="/"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/15 text-sm text-white transition hover:bg-white/5"
          >
            <Home className="h-4 w-4" />
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;
