import React from 'react';
import { Link } from 'react-router-dom';

export function PaymentTicket({ eyebrow, title, amount, children, tone = 'neutral' }) {
  const ring =
    tone === 'ok'
      ? 'border-[#22c55e]/35 shadow-[0_24px_80px_rgba(34,197,94,0.12)]'
      : tone === 'bad'
        ? 'border-red-500/30 shadow-[0_24px_80px_rgba(239,68,68,0.12)]'
        : 'border-white/10';

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className={`v2-pay-ticket overflow-hidden rounded-[28px] border bg-[#0a0a0a]/90 ${ring}`}>
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <p className="font-[Syne] text-[11px] font-bold tracking-[0.22em] text-white/45">{eyebrow}</p>
          <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
        </div>
        <div className="px-6 pb-7 pt-6">
          <h1 className="font-[Syne] text-3xl font-extrabold tracking-tight text-white">{title}</h1>
          {amount != null && (
            <p className={`mt-3 font-[Syne] text-4xl font-extrabold ${tone === 'bad' ? 'text-white' : 'text-[#22c55e]'}`}>{amount}</p>
          )}
          <div className="mt-6 space-y-4 text-sm text-white/70">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function PayActions({ primary, secondary }) {
  return (
    <div className="mt-7 flex flex-col gap-3">
      {primary}
      {secondary}
    </div>
  );
}

export function PayLink({ to, children, accent }) {
  const cls = accent
    ? 'inline-flex h-12 w-full items-center justify-center rounded-full bg-[#22c55e] px-6 text-sm font-semibold text-[#0f172a] transition hover:brightness-110'
    : 'inline-flex h-12 w-full items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-medium text-white transition hover:bg-white/10';
  return (
    <Link to={to} className={cls}>
      {children}
    </Link>
  );
}

export function TestBadge({ on }) {
  if (!on) return null;
  return (
    <p className="rounded-2xl border border-dashed border-[#22c55e]/40 bg-[#22c55e]/10 px-3 py-2 text-xs text-[#86efac]">
      Тестовый режим Robokassa — деньги не списываются.
    </p>
  );
}
