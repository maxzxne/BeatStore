import React from 'react';
import {
  formatServiceRub,
  normalizeServiceOrderPricing,
  resolvedServiceCopy,
} from '../utils/serviceOrderPricing';

/**
 * Compact always-visible price policy for /order wizard («Я знаю, что хочу»).
 * When onSelectDays is set, rows are tappable and set the deadline in the form.
 */
export default function OrderPricePolicy({
  pricing: pricingProp,
  selectedDays = null,
  prepaymentPercent = 50,
  onSelectDays = null,
  className = '',
}) {
  const pricing = normalizeServiceOrderPricing(pricingProp);
  const copy = resolvedServiceCopy(pricing);
  const selectable = typeof onSelectDays === 'function';
  const fromAmount = Math.min(
    pricing.trap_price,
    ...pricing.deadlines.flatMap((r) => [r.price_50, r.price_100]),
  );

  return (
    <div
      className={[
        'rounded-2xl border border-white/10 bg-white/[0.03] p-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-[Syne] text-sm font-semibold text-white">Как считается цена</p>
          <p className="mt-0.5 text-xs text-white/45">
            {selectable
              ? 'Нажми срок — подставится в форму. Трэп — фикс.'
              : 'Срок и предоплата меняют сумму. Трэп — фикс.'}
          </p>
        </div>
        <p className="text-xs tabular-nums text-[#86efac]">от {formatServiceRub(fromAmount)}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.14em] text-white/35">
              <th className="pb-2 pr-3 font-semibold">Срок</th>
              <th className="pb-2 pr-3 font-semibold">{copy.col_50_title}</th>
              <th className="pb-2 font-semibold">{copy.col_100_title}</th>
            </tr>
          </thead>
          <tbody>
            {pricing.deadlines.map((row) => {
              const active = selectedDays != null && Number(selectedDays) === Number(row.days);
              return (
                <tr
                  key={row.days}
                  className={`border-t border-white/8 ${
                    active ? 'bg-[#22c55e]/10 text-white' : 'text-white/70'
                  } ${selectable ? 'cursor-pointer transition hover:bg-white/[0.04]' : ''}`}
                  onClick={selectable ? () => onSelectDays(String(row.days)) : undefined}
                  onKeyDown={
                    selectable
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectDays(String(row.days));
                          }
                        }
                      : undefined
                  }
                  tabIndex={selectable ? 0 : undefined}
                  role={selectable ? 'button' : undefined}
                  aria-pressed={selectable ? active : undefined}
                  aria-label={selectable ? `Выбрать срок ${row.label}` : undefined}
                >
                  <td className="py-2.5 pr-3">
                    <span className={active ? 'font-semibold text-[#86efac]' : ''}>{row.label}</span>
                    {row.hint ? (
                      <span className="mt-0.5 block text-[11px] text-white/35">{row.hint}</span>
                    ) : null}
                  </td>
                  <td
                    className={`py-2.5 pr-3 tabular-nums ${
                      active && Number(prepaymentPercent) < 100 ? 'font-semibold text-white' : ''
                    }`}
                  >
                    {formatServiceRub(row.price_50)}
                  </td>
                  <td
                    className={`py-2.5 tabular-nums ${
                      active && Number(prepaymentPercent) >= 100 ? 'font-semibold text-white' : ''
                    }`}
                  >
                    {formatServiceRub(row.price_100)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 border-t border-white/10 pt-3 text-sm">
        <div>
          <p className="font-medium text-white">{copy.trap_title}</p>
          <p className="mt-0.5 text-xs text-white/45">{copy.trap_body}</p>
        </div>
        <p className="shrink-0 font-semibold tabular-nums text-[#86efac]">
          {formatServiceRub(pricing.trap_price)}
        </p>
      </div>
    </div>
  );
}
