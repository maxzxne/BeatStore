import React, { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { api, buildMediaUrl } from '../../utils/api';
import { formatAdsRub } from '../../utils/adsPricing';

const STATUS_UI = {
  новая: { label: 'новая', className: 'bg-amber-500/15 text-amber-300' },
  одобрена: { label: 'одобрена', className: 'bg-sky-500/15 text-sky-300' },
  опубликована: { label: 'опубликована', className: 'bg-[#22c55e]/15 text-[#22c55e]' },
  отклонена: { label: 'отклонена', className: 'bg-red-500/15 text-red-300' },
  отменена: { label: 'отменена', className: 'bg-white/10 text-white/45' },
};

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';

export default function AdminAdOrdersPanel({ showSuccess, showError }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [priceDraft, setPriceDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = orders.find((o) => o.id === selectedId) || null;

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/admin/ad-orders');
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      showError(err.response?.data?.detail || 'Не удалось загрузить заявки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (selected) setPriceDraft(String(selected.price ?? ''));
  }, [selectedId]);

  const approve = async () => {
    if (!selected) return;
    try {
      setBusy(true);
      const price = priceDraft === '' ? undefined : Number(priceDraft);
      await api.post(`/api/admin/ad-orders/${selected.id}/approve`, {
        ...(Number.isFinite(price) ? { price } : {}),
      });
      showSuccess('Заявка одобрена — клиент может оплатить');
      await fetchOrders();
    } catch (err) {
      showError(err.response?.data?.detail || 'Не удалось одобрить');
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!selected) return;
    if (!window.confirm('Отклонить заявку?')) return;
    try {
      setBusy(true);
      await api.post(`/api/admin/ad-orders/${selected.id}/reject`, { reason: 'Отклонено модератором' });
      showSuccess('Заявка отклонена');
      await fetchOrders();
    } catch (err) {
      showError(err.response?.data?.detail || 'Не удалось отклонить');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[20vh] items-center justify-center text-sm text-white/40">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Загрузка заявок…
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Клиент</th>
              <th className="px-4 py-3 font-medium">Срок</th>
              <th className="px-4 py-3 font-medium">Цена</th>
              <th className="px-4 py-3 font-medium">Статус</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                  Заявок пока нет
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const st = STATUS_UI[order.status] || STATUS_UI.новая;
                return (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedId(order.id)}
                    className={`cursor-pointer border-t border-white/5 transition hover:bg-white/[0.04] ${
                      selectedId === order.id ? 'bg-[#22c55e]/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-white">{order.id}</td>
                    <td className="px-4 py-3 text-white/70">
                      {order.customer_name || '—'}
                      <div className="text-xs text-white/35">{order.customer_email}</div>
                    </td>
                    <td className="px-4 py-3 text-white/70">{order.days} дн.</td>
                    <td className="px-4 py-3 text-white/70">{formatAdsRub(order.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${st.className}`}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        {!selected ? (
          <p className="text-sm text-white/40">Выберите заявку слева</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/40">Заявка #{selected.id}</p>
              <p className="mt-1 font-[Syne] text-lg font-bold text-white">{selected.caption || 'Без подписи'}</p>
              <p className="mt-1 break-all text-xs text-white/45">{selected.link_url}</p>
            </div>
            {selected.image_url ? (
              <img
                src={buildMediaUrl(selected.image_url)}
                alt=""
                className="aspect-video w-full rounded-xl border border-white/10 object-cover"
              />
            ) : null}
            <div className="text-sm text-white/60">
              {selected.days} дн. · ставка {formatAdsRub(selected.price_per_day)}/день
              {selected.list_amount !== selected.price ? (
                <span className="ml-2 text-white/35 line-through">{formatAdsRub(selected.list_amount)}</span>
              ) : null}
            </div>
            {selected.status === 'новая' ? (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-xs uppercase tracking-wide text-white/45">
                    Итого к оплате, ₽
                  </span>
                  <input
                    className={fieldClass}
                    type="number"
                    min="1"
                    step="1"
                    value={priceDraft}
                    onChange={(e) => setPriceDraft(e.target.value)}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={approve}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#22c55e] px-4 text-sm font-semibold text-[#052e16] disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" /> Одобрить
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={reject}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-white/70 disabled:opacity-60"
                  >
                    <X className="h-4 w-4" /> Отклонить
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-white/50">
                Статус: <strong className="text-white">{selected.status}</strong>
                {selected.locked ? ' · поля заморожены' : ''}
                {selected.can_pay ? ' · ждёт оплату клиента' : ''}
              </p>
            )}
            {selected.status === 'одобрена' ? (
              <button
                type="button"
                disabled={busy}
                onClick={reject}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-red-500/30 px-4 text-sm text-red-300 disabled:opacity-60"
              >
                Отменить одобрение (отклонить)
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
