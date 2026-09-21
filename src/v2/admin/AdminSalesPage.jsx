import React, { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Percent, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';
const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45';

const SCOPES = [
  { id: 'all', label: 'Все товары' },
  { id: 'beats', label: 'Только биты' },
  { id: 'courses', label: 'Только курсы' },
  { id: 'services', label: 'Только услуги' },
];

const emptyForm = {
  title: '',
  scope: 'all',
  kind: 'percent',
  value: 10,
  enabled: true,
  starts_at: '',
  ends_at: '',
};

function toDatetimeLocal(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function scopeLabel(scope) {
  return SCOPES.find((s) => s.id === scope)?.label || scope;
}

function valueLabel(sale) {
  if (sale.kind === 'amount') return `−${Number(sale.value).toLocaleString('ru-RU')} ₽`;
  return `−${sale.value}%`;
}

function saleStatus(sale, now = new Date()) {
  if (!sale.enabled) return { label: 'Выкл', className: 'bg-white/10 text-white/50' };
  const starts = sale.starts_at ? new Date(sale.starts_at) : null;
  const ends = sale.ends_at ? new Date(sale.ends_at) : null;
  if (starts && !Number.isNaN(starts.getTime()) && starts > now) {
    return { label: 'Скоро', className: 'bg-amber-500/15 text-amber-300' };
  }
  if (ends && !Number.isNaN(ends.getTime()) && ends < now) {
    return { label: 'Истекла', className: 'bg-red-500/15 text-red-300' };
  }
  return { label: 'Активна', className: 'bg-[#22c55e]/15 text-[#22c55e]' };
}

const AdminSalesPage = () => {
  const { isAdminAuthenticated } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (isAdminAuthenticated) fetchSales();
  }, [isAdminAuthenticated]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/api/admin/sales');
      setSales(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось загрузить скидки');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setPanelOpen(true);
    setError('');
  };

  const openEdit = (sale) => {
    setEditingId(sale.id);
    setForm({
      title: sale.title || '',
      scope: sale.scope || 'all',
      kind: sale.kind || 'percent',
      value: sale.value,
      enabled: Boolean(sale.enabled),
      starts_at: toDatetimeLocal(sale.starts_at),
      ends_at: toDatetimeLocal(sale.ends_at),
    });
    setPanelOpen(true);
    setError('');
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      title: form.title.trim() || null,
      scope: form.scope,
      kind: form.kind,
      value: Number(form.value),
      enabled: form.enabled,
      starts_at: fromDatetimeLocal(form.starts_at),
      ends_at: fromDatetimeLocal(form.ends_at),
    };
    try {
      if (editingId) {
        await api.put(`/api/admin/sales/${editingId}`, payload);
      } else {
        await api.post('/api/admin/sales', payload);
      }
      setPanelOpen(false);
      await fetchSales();
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось сохранить скидку');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (sale) => {
    if (!window.confirm(`Удалить скидку «${sale.title || valueLabel(sale)}»?`)) return;
    try {
      await api.delete(`/api/admin/sales/${sale.id}`);
      await fetchSales();
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось удалить');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#22c55e]">Маркетинг</p>
          <h1 className="mt-1 font-[Syne] text-3xl font-extrabold">Скидки на витрине</h1>
          <p className="mt-2 max-w-xl text-sm text-white/50">
            Одна лучшая акция на позицию. Промокод сверху не стакается с другой акцией — он режет уже сниженную сумму.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-[#22c55e] px-4 text-sm font-semibold text-[#052e16]"
        >
          <Plus className="h-4 w-4" /> Новая скидка
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16 text-white/40">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : sales.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center text-white/40">
          Скидок нет. Каталог показывает обычные цены из карточки товара.
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-white/40">
              <tr>
                <th className="px-4 py-3 font-medium">Название</th>
                <th className="px-4 py-3 font-medium">Где</th>
                <th className="px-4 py-3 font-medium">Скидка</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sales.map((sale) => {
                const status = saleStatus(sale);
                return (
                  <tr key={sale.id} className="bg-black/20">
                    <td className="px-4 py-3 font-medium">{sale.title || 'Без названия'}</td>
                    <td className="px-4 py-3 text-white/60">{scopeLabel(sale.scope)}</td>
                    <td className="px-4 py-3 text-[#22c55e]">{valueLabel(sale)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openEdit(sale)} className="mr-1 rounded-lg p-2 hover:bg-white/10" aria-label="Править">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => remove(sale)} className="rounded-lg p-2 text-red-300 hover:bg-white/10" aria-label="Удалить">
                        <Trash2 className="h-4 w-4" />
                      </button>
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
              <h2 className="font-[Syne] text-xl font-bold">{editingId ? 'Скидка' : 'Новая скидка'}</h2>
              <button type="button" onClick={() => setPanelOpen(false)} className="rounded-lg p-2 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className={labelClass}>Название</label>
              <input className={fieldClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Summer sale" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Где действует</label>
                <select className={fieldClass} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
                  {SCOPES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
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
            </div>
            <div>
              <label className={labelClass}>{form.kind === 'amount' ? 'Скидка, ₽' : 'Скидка, %'}</label>
              <div className="relative">
                <Percent className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  className={fieldClass}
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>С</label>
                <input className={fieldClass} type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>До</label>
                <input className={fieldClass} type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="h-4 w-4 accent-[#22c55e]"
              />
              Включена
            </label>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#22c55e] text-sm font-semibold text-[#052e16] disabled:opacity-60"
            >
              {saving ? 'Сохраняю…' : 'Сохранить'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminSalesPage;
