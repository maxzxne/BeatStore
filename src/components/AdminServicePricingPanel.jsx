import React, { useMemo, useState } from 'react';
import { ClipboardList, Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import OrderPriceGuide from './OrderPriceGuide';
import {
  DEFAULT_SERVICE_ORDER_PRICING,
  buildPriceVars,
  normalizeServiceOrderPricing,
  substitutePriceVars,
} from '../utils/serviceOrderPricing';

const TABS = [
  { id: 'prices', label: '1. Цены' },
  { id: 'copy', label: '2. Тексты' },
];

const COPY_FIELDS = [
  { key: 'guide_title', label: 'Заголовок справки у клиента', rows: 1, hint: 'Например: «Прайс услуг»' },
  {
    key: 'guide_subtitle',
    label: 'Коротко под заголовком',
    rows: 2,
    hint: 'Одной фразой: от какой суммы и что влияет на цену',
  },
  { key: 'col_50_title', label: 'Колонка предоплаты 50%', rows: 1 },
  { key: 'col_100_title', label: 'Колонка оплаты 100%', rows: 1 },
  { key: 'song_title', label: 'Песня под ключ — заголовок', rows: 1 },
  { key: 'song_body', label: 'Песня под ключ — описание', rows: 3 },
  { key: 'trap_title', label: 'Трэп-бит — заголовок', rows: 1 },
  { key: 'trap_body', label: 'Трэп-бит — описание', rows: 2, hint: 'Сумму можно не писать — она рядом в превью' },
];

const inputClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';

/**
 * Admin CMS for /order service pricing — tabs: numbers vs copy + live preview.
 */
export default function AdminServicePricingPanel({ initialPricing, onSaved }) {
  const { showSuccess, showError } = useNotification();
  const [tab, setTab] = useState('prices');
  const [draft, setDraft] = useState(() =>
    normalizeServiceOrderPricing(initialPricing || DEFAULT_SERVICE_ORDER_PRICING),
  );
  const [saving, setSaving] = useState(false);
  const [showTokens, setShowTokens] = useState(false);

  const vars = useMemo(() => buildPriceVars(draft), [draft]);
  const oddRows = useMemo(
    () => draft.deadlines.filter((row) => Number(row.price_50) < Number(row.price_100)),
    [draft.deadlines],
  );

  const updateDeadline = (index, patch) => {
    setDraft((prev) => {
      const deadlines = prev.deadlines.map((row, i) => (i === index ? { ...row, ...patch } : row));
      return { ...prev, deadlines };
    });
  };

  const addDeadline = () => {
    setDraft((prev) => ({
      ...prev,
      deadlines: [
        ...prev.deadlines,
        {
          days: 14,
          label: 'Новый срок',
          hint: '',
          price_50: 25000,
          price_100: 20000,
        },
      ].slice(0, 12),
    }));
  };

  const removeDeadline = (index) => {
    setDraft((prev) => {
      if (prev.deadlines.length <= 1) return prev;
      return { ...prev, deadlines: prev.deadlines.filter((_, i) => i !== index) };
    });
  };

  const setCopy = (key, value) => {
    setDraft((prev) => ({ ...prev, copy: { ...prev.copy, [key]: value } }));
  };

  const save = async () => {
    try {
      setSaving(true);
      const payload = normalizeServiceOrderPricing(draft);
      const { data } = await api.put('/api/admin/site-settings', {
        service_order_pricing: payload,
      });
      const saved = normalizeServiceOrderPricing(data?.settings?.service_order_pricing || payload);
      setDraft(saved);
      onSaved?.(saved);
      window.dispatchEvent(new Event('siteSettingsUpdated'));
      showSuccess('Прайс услуг сохранён');
    } catch (error) {
      showError(error.response?.data?.detail || 'Не удалось сохранить прайс');
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    if (!window.confirm('Вернуть цены и тексты к заводским значениям?')) return;
    setDraft(normalizeServiceOrderPricing(DEFAULT_SERVICE_ORDER_PRICING));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="admin-stat-icon">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-[Syne] text-lg font-semibold text-white">Прайс услуг</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            <span className="text-white/70">Шаг 1 — цены:</span> таблица сроков = то, что видит клиент на /order.
            <span className="text-white/70"> Шаг 2 — тексты:</span> только подписи, суммы подставляются сами.
            Сейчас от <span className="font-semibold tabular-nums text-[#86efac]">{vars.from}</span>.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Редактор прайса">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`min-h-11 rounded-full px-4 text-sm font-medium transition ${
              tab === item.id
                ? 'bg-[#22c55e] text-[#052e16]'
                : 'border border-white/10 bg-white/5 text-white/60 hover:border-white/25'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'prices' ? (
        <section className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Сроки и суммы</h3>
            <p className="mt-1 text-xs text-white/40">
              Каждая строка — срок сдачи. Колонки 50% / 100% — сколько платит клиент при предоплате и при полной
              оплате. Дни — для расчёта, подпись — то, что видит клиент. Обычно 50% ≥ 100% (предоплата дороже).
              Трэп-бит ниже — фикс, срок на него не влияет.
            </p>
            {oddRows.length > 0 ? (
              <p className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
                У {oddRows.map((r) => r.label).join(', ')} предоплата 50% ниже полной оплаты — проверь, так и задумано?
              </p>
            ) : null}
            <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wide text-white/45">
                  <tr>
                    <th className="px-3 py-2.5 font-medium">Дни</th>
                    <th className="px-3 py-2.5 font-medium">Подпись</th>
                    <th className="px-3 py-2.5 font-medium">Подсказка</th>
                    <th className="px-3 py-2.5 font-medium">50%</th>
                    <th className="px-3 py-2.5 font-medium">100%</th>
                    <th className="px-3 py-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {draft.deadlines.map((row, index) => (
                    <tr key={`d-${index}`} className="border-t border-white/10">
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="1"
                          value={row.days}
                          onChange={(e) => updateDeadline(index, { days: Number(e.target.value) || 1 })}
                          className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 tabular-nums text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                          aria-label={`Дни срока ${index + 1}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={row.label}
                          onChange={(e) => updateDeadline(index, { label: e.target.value })}
                          className="min-w-[7rem] rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                          aria-label={`Подпись срока ${index + 1}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={row.hint}
                          onChange={(e) => updateDeadline(index, { hint: e.target.value })}
                          className="min-w-[6rem] rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white/80 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                          aria-label={`Подсказка срока ${index + 1}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={row.price_50}
                          onChange={(e) =>
                            updateDeadline(index, { price_50: Number(e.target.value) || 0 })
                          }
                          className="w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 tabular-nums text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                          aria-label={`Цена 50% ${row.label}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={row.price_100}
                          onChange={(e) =>
                            updateDeadline(index, { price_100: Number(e.target.value) || 0 })
                          }
                          className="w-24 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 tabular-nums text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                          aria-label={`Цена 100% ${row.label}`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => removeDeadline(index)}
                          disabled={draft.deadlines.length <= 1}
                          className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg text-white/40 transition hover:bg-white/5 hover:text-red-300 disabled:opacity-30"
                          aria-label="Удалить срок"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={addDeadline}
              className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-white/80 transition hover:bg-white/5"
            >
              <Plus className="h-4 w-4" />
              Добавить срок
            </button>
          </div>

          <label className="block max-w-[14rem]">
            <span className="mb-1.5 block text-xs font-medium text-white/55">Трэп-бит, фикс ₽</span>
            <input
              type="number"
              min="0"
              step="500"
              value={draft.trap_price}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  trap_price: Number(e.target.value) || 0,
                }))
              }
              className={inputClass}
              aria-label="Цена трэп-бита"
            />
          </label>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] xl:items-start">
          <div className="space-y-4">
            {COPY_FIELDS.map((field) => {
              const value = draft.copy[field.key] || '';
              const preview = substitutePriceVars(value, draft);
              return (
                <label key={field.key} className="block">
                  <span className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-xs font-medium text-white/55">
                    <span>{field.label}</span>
                    {field.hint ? <span className="font-normal text-white/30">{field.hint}</span> : null}
                  </span>
                  {field.rows > 1 ? (
                    <textarea
                      rows={field.rows}
                      value={value}
                      onChange={(e) => setCopy(field.key, e.target.value)}
                      className={inputClass}
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setCopy(field.key, e.target.value)}
                      className={inputClass}
                    />
                  )}
                  {preview !== value ? (
                    <p className="mt-1.5 rounded-lg border border-white/5 bg-black/30 px-2.5 py-1.5 text-xs leading-relaxed text-white/40">
                      Клиент увидит: <span className="text-white/75">{preview}</span>
                    </p>
                  ) : null}
                </label>
              );
            })}

            <div className="rounded-xl border border-white/10 bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setShowTokens((v) => !v)}
                className="flex min-h-11 w-full items-center justify-between px-4 text-left text-xs font-medium text-white/45 transition hover:text-white/70"
              >
                Дополнительно: токены {'{{…}}'}
                <span className="tabular-nums text-white/25">{showTokens ? 'скрыть' : 'показать'}</span>
              </button>
              {showTokens ? (
                <div className="space-y-2 border-t border-white/10 px-4 py-3 text-xs text-white/45">
                  <p>
                    Старые шаблоны с {'{{trap}}'}, {'{{from}}'}, {'{{p50_21}}'} и т.п. по-прежнему
                    работают. Обычные тексты пиши без токенов — суммы уже в таблице «Цены».
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {Object.entries(vars).map(([key, amount]) => (
                      <li
                        key={key}
                        className="rounded-md border border-white/10 bg-black/30 px-2 py-1 tabular-nums"
                      >
                        <code className="text-white/55">{`{{${key}}}`}</code>
                        <span className="ml-1.5 text-[#86efac]">{amount}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="xl:sticky xl:top-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Превью как у клиента
            </p>
            <OrderPriceGuide pricing={draft} variant="panel" defaultOpen />
          </aside>
        </section>
      )}

      <div className="sticky bottom-3 z-10 flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-black/80 p-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-[#22c55e] px-5 text-sm font-semibold text-[#052e16] transition hover:brightness-110 disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Сохранение…
            </>
          ) : (
            'Сохранить прайс'
          )}
        </button>
        <button
          type="button"
          onClick={resetDefaults}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-white/15 px-5 text-sm text-white/70 transition hover:bg-white/5"
        >
          Сбросить к умолчанию
        </button>
      </div>
    </div>
  );
}
