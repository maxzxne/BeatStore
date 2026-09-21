import React, { useId, useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import {
  DEFAULT_SERVICE_ORDER_PRICING,
  formatServiceRub,
  normalizeServiceOrderPricing,
  resolvedServiceCopy,
} from '../utils/serviceOrderPricing';

/**
 * Collapsible price guide for /order (and purchases).
 * Prices + copy come from CMS (site_settings.service_order_pricing).
 */
export default function OrderPriceGuide({
  pricing: pricingProp,
  variant = 'panel',
  defaultOpen = false,
  className = '',
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const isInline = variant === 'inline';
  const pricing = normalizeServiceOrderPricing(pricingProp || DEFAULT_SERVICE_ORDER_PRICING);
  const copy = resolvedServiceCopy(pricing);

  return (
    <div
      className={[
        'rounded-2xl border border-white/10 bg-white/[0.03]',
        isInline ? 'text-sm' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={[
          'flex w-full cursor-pointer items-center gap-3 text-left transition duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/45',
          isInline ? 'min-h-[44px] px-3 py-2.5' : 'min-h-[52px] px-4 py-3.5 sm:px-5',
          open ? 'rounded-t-2xl' : 'rounded-2xl',
          'hover:bg-white/[0.04]',
        ].join(' ')}
      >
        <span
          className={[
            'flex shrink-0 items-center justify-center rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/10 text-[#22c55e]',
            isInline ? 'h-8 w-8' : 'h-10 w-10',
          ].join(' ')}
          aria-hidden="true"
        >
          <Info className={isInline ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </span>

        <span className="min-w-0 flex-1">
          <span className={`block font-semibold text-white ${isInline ? 'text-sm' : 'font-[Syne] text-base'}`}>
            {copy.guide_title}
          </span>
          <span className={`mt-0.5 block text-white/45 ${isInline ? 'text-xs' : 'text-sm'}`}>
            {copy.guide_subtitle}
          </span>
        </span>

        <ChevronDown
          className={[
            'h-5 w-5 shrink-0 text-white/40 transition-transform duration-200',
            open ? 'rotate-180 text-[#22c55e]' : '',
          ].join(' ')}
          aria-hidden="true"
        />
      </button>

      <div
        id={panelId}
        role="region"
        aria-label={copy.guide_title}
        hidden={!open}
        className={open ? 'border-t border-white/10' : ''}
      >
        {open && (
          <div className={isInline ? 'space-y-3 p-3' : 'space-y-4 p-4 sm:p-5'}>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { title: copy.col_50_title, key: 'price_50', accent: 'text-[#86efac]' },
                { title: copy.col_100_title, key: 'price_100', accent: 'text-white/75' },
              ].map((col) => (
                <div key={col.key} className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${col.accent}`}>
                    {col.title}
                  </p>
                  <ul className="space-y-1.5">
                    {pricing.deadlines.map((row) => (
                      <li key={`${col.key}-${row.days}`} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-white/50">{row.label}</span>
                        <span className="font-semibold tabular-nums text-white">
                          {formatServiceRub(row[col.key])}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-white/10 pt-3 text-sm">
              <div>
                <p className="font-semibold text-white">{copy.song_title}</p>
                <p className="mt-1 leading-relaxed text-white/50">{copy.song_body}</p>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{copy.trap_title}</p>
                  <p className="mt-1 leading-relaxed text-white/50">{copy.trap_body}</p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-[#86efac]">
                  {formatServiceRub(pricing.trap_price)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
