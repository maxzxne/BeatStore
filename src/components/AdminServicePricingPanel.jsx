import React, { useMemo, useRef, useState } from 'react';
import { ClipboardList, Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';
import OrderPriceGuide from './OrderPriceGuide';
import {
  DEFAULT_SERVICE_ORDER_PRICING,
  listPriceVariableChips,
  normalizeServiceOrderPricing,
  substitutePriceVars,
} from '../utils/serviceOrderPricing';

const COPY_FIELDS = [
  { key: 'guide_title', label: 'Заголовок плашки', rows: 1 },
  { key: 'guide_subtitle', label: 'Подзаголовок (свёрнутая плашка)', rows: 2 },
  { key: 'col_50_title', label: 'Колонка 50%', rows: 1 },
  { key: 'col_100_title', label: 'Колонка 100%', rows: 1 },
  { key: 'song_title', label: 'Заголовок «Песня под ключ»', rows: 1 },
  { key: 'song_body', label: 'Текст «Песня под ключ»', rows: 3 },
  { key: 'trap_title', label: 'Заголовок трэп-бита', rows: 1 },
  { key: 'trap_body', label: 'Текст трэп-бита', rows: 3 },
];

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

/**
 * Admin CMS for /order service pricing + copy with insertable price chips.
 */
export default function AdminServicePricingPanel({ initialPricing, onSaved }) {
  const { showSuccess, showError } = useNotification();
  const [draft, setDraft] = useState(() =>
    normalizeServiceOrderPricing(initialPricing || DEFAULT_SERVICE_ORDER_PRICING)
  );
  const [saving, setSaving] = useState(false);
  const [activeField, setActiveField] = useState('guide_subtitle');
  const fieldRefs = useRef({});

  const chips = useMemo(() => listPriceVariableChips(draft), [draft]);

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

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div className="admin-stat-icon">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-[Syne] text-lg font-semibold text-white">Прайс услуг (/order)</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/40">
            Цифры в таблице — источник правды. В текстах можно вставлять переменные кнопками ниже —
            на сайте подставятся актуальные суммы (например 25 000 ₽). Не нужно писать код.
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-medium text-white">Сроки и цены за одну услугу</h3>
        <p className="mt-1 text-xs text-white/40">
          Дни используют расчёт на витрине. Подпись — то, что видит клиент на кнопках срока.
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
                      onChange={(e) => updateDeadline(index, { price_50: Number(e.target.value) || 0 })}
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
                      onChange={(e) => updateDeadline(index, { price_100: Number(e.target.value) || 0 })}
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

      <label className="mb-6 block max-w-xs">
        <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/45">Трэп-бит, ₽</span>
        <input
          type="number"
          min="0"
          step="500"
          value={draft.trap_price}
          onChange={(e) => setDraft((prev) => ({ ...prev, trap_price: Number(e.target.value) || 0 }))}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 tabular-nums text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
          aria-label="Цена трэп-бита"
        />
      </label>

      <div className="mb-4">
        <h3 className="text-sm font-medium text-white">Тексты плашки</h3>
        <p className="mt-1 text-xs text-white/40">
          Кликни поле, затем кнопку переменной — вставится метка. На сайте она станет суммой из таблицы.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.token}
              type="button"
              onClick={() => insertChip(chip.token)}
              title={`Вставит ${chip.token} → ${substitutePriceVars(chip.token, draft)}`}
              className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 text-xs font-medium text-[#86efac] transition hover:bg-[#22c55e]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/45"
            >
              {chip.label}
              <span className="ml-1.5 tabular-nums text-[#22c55e]/80">
                {substitutePriceVars(chip.token, draft)}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          {COPY_FIELDS.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/45">{field.label}</span>
              {field.rows > 1 ? (
                <textarea
                  ref={(el) => {
                    fieldRefs.current[field.key] = el;
                  }}
                  rows={field.rows}
                  value={draft.copy[field.key] || ''}
                  onFocus={() => setActiveField(field.key)}
                  onChange={(e) => setCopy(field.key, e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                />
              ) : (
                <input
                  ref={(el) => {
                    fieldRefs.current[field.key] = el;
                  }}
                  type="text"
                  value={draft.copy[field.key] || ''}
                  onFocus={() => setActiveField(field.key)}
                  onChange={(e) => setCopy(field.key, e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
                />
              )}
              {(draft.copy[field.key] || '').includes('{{') && (
                <p className="mt-1 text-xs text-white/35">
                  Как увидит клиент:{' '}
                  <span className="text-white/60">{substitutePriceVars(draft.copy[field.key], draft)}</span>
                </p>
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-dashed border-white/15 bg-black/20 p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">Превью на витрине</p>
        <OrderPriceGuide pricing={draft} variant="panel" defaultOpen />
      </div>

      <div className="flex flex-wrap gap-3">
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
