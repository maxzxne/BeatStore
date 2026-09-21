import React, { useMemo, useRef, useState } from 'react';
import { ClipboardList, Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import OrderPriceGuide from './OrderPriceGuide';
import {
  DEFAULT_SERVICE_ORDER_PRICING,
  groupPriceVariableChips,
  listPriceVariableChips,
  normalizeServiceOrderPricing,
  substitutePriceVars,
} from '../utils/serviceOrderPricing';

const FIELD_GROUPS = [
  {
    id: 'guide',
    title: 'Плашка',
    hint: 'Заголовок и строка в свёрнутом виде на /order',
    fields: [
      { key: 'guide_title', label: 'Заголовок', rows: 1 },
      { key: 'guide_subtitle', label: 'Подзаголовок (свёрнутая)', rows: 2 },
    ],
  },
  {
    id: 'cols',
    title: 'Колонки оплаты',
    hint: 'Подписи столбцов 50% / 100% в таблице прайса',
    fields: [
      { key: 'col_50_title', label: 'Колонка 50%', rows: 1 },
      { key: 'col_100_title', label: 'Колонка 100%', rows: 1 },
    ],
  },
  {
    id: 'song',
    title: 'Песня под ключ',
    hint: 'Блок услуги в развёрнутой плашке',
    fields: [
      { key: 'song_title', label: 'Заголовок', rows: 1 },
      { key: 'song_body', label: 'Описание', rows: 3 },
    ],
  },
  {
    id: 'trap',
    title: 'Трэп-бит',
    hint: 'Фикс-цена и тексты блока',
    fields: [
      { key: 'trap_title', label: 'Заголовок', rows: 1 },
      { key: 'trap_body', label: 'Описание', rows: 3 },
    ],
  },
];

const FIELD_LABELS = Object.fromEntries(
  FIELD_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f.label])),
);

function insertAtCursor(el, token) {
  if (!el) return token;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const next = `${el.value.slice(0, start)}${token}${el.value.slice(end)}`;
  const caret = start + token.length;
  el.value = next;
  el.focus();
  el.setSelectionRange(caret, caret);
  return next;
}

function CopyField({ field, value, active, preview, onFocus, onChange, fieldRef }) {
  const inputClass = [
    'w-full rounded-xl border bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30',
    'focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40',
    active ? 'border-[#22c55e]/45' : 'border-white/10',
  ].join(' ');

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-medium text-white/55">
        <span>{field.label}</span>
        {active ? (
          <span className="rounded-md bg-[#22c55e]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#86efac]">
            вставка сюда
          </span>
        ) : null}
      </span>
      {field.rows > 1 ? (
        <textarea
          ref={fieldRef}
          rows={field.rows}
          value={value}
          onFocus={onFocus}
          onChange={onChange}
          className={inputClass}
        />
      ) : (
        <input
          ref={fieldRef}
          type="text"
          value={value}
          onFocus={onFocus}
          onChange={onChange}
          className={inputClass}
        />
      )}
      {preview ? (
        <p className="mt-1.5 rounded-lg border border-white/5 bg-black/30 px-2.5 py-1.5 text-xs leading-relaxed text-white/40">
          Клиент увидит:{' '}
          <span className="text-white/75">{preview}</span>
        </p>
      ) : null}
    </label>
  );
}

/**
 * Admin CMS for /order service pricing + copy with insertable price chips.
 */
export default function AdminServicePricingPanel({ initialPricing, onSaved }) {
  const { showSuccess, showError } = useNotification();
  const [draft, setDraft] = useState(() =>
    normalizeServiceOrderPricing(initialPricing || DEFAULT_SERVICE_ORDER_PRICING),
  );
  const [saving, setSaving] = useState(false);
  const [activeField, setActiveField] = useState('guide_subtitle');
  const fieldRefs = useRef({});

  const chipGroups = useMemo(
    () => groupPriceVariableChips(listPriceVariableChips(draft)),
    [draft],
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

  const insertChip = (token) => {
    const el = fieldRefs.current[activeField];
    if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) {
      const next = insertAtCursor(el, token);
      setCopy(activeField, next);
      return;
    }
    setCopy(activeField, `${draft.copy[activeField] || ''}${token}`);
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

  const activeLabel = FIELD_LABELS[activeField] || activeField;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div className="admin-stat-icon">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-[Syne] text-lg font-semibold text-white">Прайс услуг (/order)</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            Сначала таблица цен — источник правды. Потом тексты плашки: кликни поле слева и вставь
            сумму кнопкой справа.
          </p>
        </div>
      </div>

      {/* Deadlines table */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-white">Сроки и цены</h3>
        <p className="mt-1 text-xs text-white/40">
          Дни — расчёт на витрине. Подпись — то, что видит клиент на кнопках срока.
        </p>
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
      </section>

      {/* Copy editor + variables + preview */}
      <section>
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-white">Тексты плашки</h3>
          <p className="mt-1 text-xs text-white/40">
            Поле слева → переменная справа. На сайте метка станет суммой из таблицы.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)] xl:items-start">
          <div className="space-y-3">
            {FIELD_GROUPS.map((group) => (
              <div
                key={group.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="font-[Syne] text-sm font-semibold text-white">{group.title}</h4>
                  <p className="text-[11px] text-white/35">{group.hint}</p>
                </div>

                {group.id === 'trap' ? (
                  <label className="mb-3 block max-w-[12rem]">
                    <span className="mb-1.5 block text-xs font-medium text-white/55">Цена, ₽</span>
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
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 tabular-nums text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                      aria-label="Цена трэп-бита"
                    />
                  </label>
                ) : null}

                <div className="space-y-3">
                  {group.fields.map((field) => {
                    const value = draft.copy[field.key] || '';
                    const hasToken = value.includes('{{');
                    return (
                      <CopyField
                        key={field.key}
                        field={field}
                        value={value}
                        active={activeField === field.key}
                        preview={hasToken ? substitutePriceVars(value, draft) : ''}
                        onFocus={() => setActiveField(field.key)}
                        onChange={(e) => setCopy(field.key, e.target.value)}
                        fieldRef={(el) => {
                          fieldRefs.current[field.key] = el;
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <aside className="space-y-3 xl:sticky xl:top-4">
            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  Переменные
                </p>
                <p className="truncate text-[11px] text-[#86efac]" title={activeLabel}>
                  → {activeLabel}
                </p>
              </div>
              <div className="max-h-[22rem] space-y-3 overflow-y-auto pr-0.5">
                {chipGroups.map((bucket) => (
                  <div key={bucket.group}>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
                      {bucket.groupLabel}
                    </p>
                    <div className="flex flex-col gap-1">
                      {bucket.chips.map((chip) => {
                        const amount = substitutePriceVars(chip.token, draft);
                        return (
                          <button
                            key={chip.token}
                            type="button"
                            onClick={() => insertChip(chip.token)}
                            title={`Вставит ${chip.token}`}
                            className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-left text-xs transition hover:border-[#22c55e]/35 hover:bg-[#22c55e]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/45"
                          >
                            <span className="min-w-0 truncate font-medium text-white/80">
                              {chip.label}
                            </span>
                            <span className="shrink-0 tabular-nums text-[#22c55e]">{amount}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/35">
                Превью
              </p>
              <OrderPriceGuide pricing={draft} variant="panel" defaultOpen />
            </div>
          </aside>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5">
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
