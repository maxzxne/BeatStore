import React, { useEffect, useState } from 'react';
import { Copy, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45';

const emptyForm = {
  username: '',
  kind: 'percent',
  value: 10,
  code: '',
  note: '',
};

function valueLabel(row) {
  if (row.kind === 'amount') return `−${Number(row.value).toLocaleString('ru-RU')} ₽`;
  return `−${row.value}%`;
}

function statusLabel(row) {
  if (row.used_at) return { label: 'Использован', className: 'bg-white/10 text-white/50' };
  if (row.reserved_intent_id) return { label: 'В оплате', className: 'bg-amber-500/15 text-amber-300' };
  return { label: 'Свободен', className: 'bg-[#22c55e]/15 text-[#22c55e]' };
}

const AdminPromoCodesPage = ({ embedded = false }) => {
  const { isAdminAuthenticated } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (isAdminAuthenticated) fetchRows();
  }, [isAdminAuthenticated]);

  const fetchRows = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/api/admin/promo-codes');
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось загрузить промокоды');
    } finally {
      setLoading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/api/admin/promo-codes', {
        username: form.username.trim(),
        kind: form.kind,
        value: Number(form.value),
        code: form.code.trim() || null,
        note: form.note.trim() || null,
      });
      setCreated(data);
      setPanelOpen(false);
      setForm(emptyForm);
      await fetchRows();
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось выдать промокод');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* ignore */
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Удалить промокод ${row.code}?`)) return;
    try {
      await api.delete(`/api/admin/promo-codes/${row.id}`);
      await fetchRows();
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось удалить');
    }
  };

  return (
    <div className={embedded ? 'space-y-6' : 'mx-auto max-w-5xl space-y-6 p-6'}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        {embedded ? (
          <div>
            <h2 className="font-[Syne] text-xl font-bold text-white">Промокоды</h2>
            <p className="mt-1 max-w-xl text-sm text-white/50">
              Одноразовый код на конкретного пользователя. Сумма считается на сервере.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#22c55e]">Маркетинг</p>
            <h1 className="mt-1 font-[Syne] text-3xl font-extrabold">Промокоды</h1>
            <p className="mt-2 max-w-xl text-sm text-white/50">
              Одноразовый код на конкретного пользователя. Сумма считается на сервере, с клиента её не подставить.
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => { setPanelOpen(true); setError(''); }}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[#22c55e] px-4 text-sm font-semibold text-[#052e16]"
        >
          <Plus className="h-4 w-4" /> Выдать код
        </button>
      </div>

      {created && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#22c55e]/30 bg-[#22c55e]/10 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#22c55e]">Код для {created.username}</p>
            <p className="font-mono text-xl font-bold tracking-widest">{created.code}</p>
          </div>
          <button type="button" onClick={() => copy(created.code)} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-sm">
            <Copy className="h-4 w-4" /> Скопировать
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-white/40">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center text-white/40">
          Промокодов нет.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/40">
              <tr>
                <th className="px-4 py-3 font-medium">Код</th>
                <th className="px-4 py-3 font-medium">Кому</th>
                <th className="px-4 py-3 font-medium">Скидка</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map((row) => {
                const status = statusLabel(row);
                return (
                  <tr key={row.id} className="bg-black/20">
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => copy(row.code)} className="font-mono tracking-wider hover:text-[#22c55e]">
                        {row.code}
                      </button>
                      {row.note && <p className="text-xs text-white/40">{row.note}</p>}
                    </td>
                    <td className="px-4 py-3 text-white/70">{row.username}</td>
                    <td className="px-4 py-3 text-[#22c55e]">{valueLabel(row)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!row.used_at && (
                        <button type="button" onClick={() => remove(row)} className="rounded-lg p-2 text-red-300 hover:bg-white/10" aria-label="Удалить">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form onSubmit={save} className="w-full max-w-lg space-y-4 rounded-3xl border border-white/10 bg-[#111] p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-[Syne] text-xl font-bold">Выдать промокод</h2>
              <button type="button" onClick={() => setPanelOpen(false)} className="rounded-lg p-2 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className={labelClass}>Логин покупателя</label>
              <input required className={fieldClass} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="ник пользователя" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Тип</label>
                <div
                  role="group"
                  aria-label="Тип скидки"
                  className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/5 p-1"
                >
                  {[
                    { id: 'percent', label: 'Процент' },
                    { id: 'amount', label: 'Сумма ₽' },
                  ].map((opt) => {
                    const active = form.kind === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setForm({ ...form, kind: opt.id })}
                        className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                          active
                            ? 'bg-[#22c55e] text-[#052e16]'
                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                        aria-pressed={active}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={labelClass}>{form.kind === 'amount' ? 'Скидка, ₽' : 'Скидка, %'}</label>
                <input required type="number" min="0.01" step="0.01" className={fieldClass} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Код (пусто = сгенерировать)</label>
              <input className={`${fieldClass} font-mono uppercase`} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="xw10off" />
            </div>
            <div>
              <label className={labelClass}>Заметка</label>
              <input className={fieldClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="видно только тебе" />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#22c55e] text-sm font-semibold text-[#052e16] disabled:opacity-60"
            >
              {saving ? 'Выдаю…' : 'Выдать'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminPromoCodesPage;
