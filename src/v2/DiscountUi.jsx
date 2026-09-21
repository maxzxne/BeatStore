import React from 'react';
import { formatRub } from '../utils/checkout';

export function hasWas(price, was) {
  const n = Number(price);
  const w = Number(was);
  return Number.isFinite(n) && Number.isFinite(w) && w > n;
}

export function PriceLabel({ amount, was, freeLabel = 'Free', className = '', payClassName = '' }) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return <span className={className}>—</span>;
  return (
    <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
      {hasWas(n, was) && (
        <span className="text-[0.85em] font-normal text-white/40 line-through">{formatRub(was)}</span>
      )}
      <span className={payClassName}>{n === 0 ? freeLabel : formatRub(n)}</span>
    </span>
  );
}

export function licensePriceText(price, was, freeLabel = 'Free') {
  if (price === 0) return freeLabel;
  if (hasWas(price, was)) {
    return (
      <>
        <span className="mr-1 text-white/40 line-through">{Number(was).toFixed(0)}</span>
        {`${Number(price).toFixed(0)} ₽`}
      </>
    );
  }
  return `${Number(price).toFixed(0)} ₽`;
}

export function PromoCodeField({ value, onChange, disabled = false, className = '' }) {
  return (
    <label className={`block text-left ${className}`}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45">
        Промокод
      </span>
      <input
        type="text"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase().replace(/\s+/g, ''))}
        placeholder="если выдали персональный"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm uppercase tracking-wide text-white placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 disabled:opacity-50"
      />
    </label>
  );
}
