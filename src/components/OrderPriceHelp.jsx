import React, { useEffect, useId, useRef, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import {
  formatServiceRub,
  normalizeServiceOrderPricing,
  resolvedServiceCopy,
} from '../utils/serviceOrderPricing';

/**
 * ?-in-circle control: hover / focus / tap opens a compact price sheet
 * for /order wizard steps 2–3.
 */
export default function OrderPriceHelp({ pricing: pricingProp, className = '' }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef(null);
  const pricing = normalizeServiceOrderPricing(pricingProp);
  const copy = resolvedServiceCopy(pricing);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={`relative inline-flex ${className}`.trim()}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Как считается цена"
        title="Как считается цена"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/55 transition hover:border-[#22c55e]/40 hover:bg-[#22c55e]/10 hover:text-[#86efac] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/45"
      >
        <CircleHelp className="h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <div
          id={panelId}
          role="tooltip"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-white/12 bg-[#0c0c0c] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
          onMouseLeave={() => setOpen(false)}
        >
          <p className="font-[Syne] text-sm font-semibold text-white">{copy.guide_title}</p>
          <p className="mt-0.5 text-xs text-white/45">{copy.guide_subtitle}</p>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.12em] text-white/35">
                  <th className="pb-1.5 pr-2 font-semibold">Срок</th>
                  <th className="pb-1.5 pr-2 font-semibold">{copy.col_50_title}</th>
                  <th className="pb-1.5 font-semibold">{copy.col_100_title}</th>
                </tr>
              </thead>
              <tbody>
                {pricing.deadlines.map((row) => (
                  <tr key={row.days} className="border-t border-white/8 text-white/70">
                    <td className="py-1.5 pr-2">{row.label}</td>
                    <td className="py-1.5 pr-2 tabular-nums">{formatServiceRub(row.price_50)}</td>
                    <td className="py-1.5 tabular-nums">{formatServiceRub(row.price_100)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-white/10 pt-2 text-xs">
            <span className="text-white/55">{copy.trap_title}</span>
            <span className="shrink-0 font-semibold tabular-nums text-[#86efac]">
              {formatServiceRub(pricing.trap_price)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
