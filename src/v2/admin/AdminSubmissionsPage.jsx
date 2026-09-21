import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const STATUS_FILTERS = [
  { value: 'pending', label: 'На проверке' },
  { value: 'draft', label: 'Черновик' },
  { value: 'rejected', label: 'Отклонено' },
  { value: 'approved', label: 'Принято' },
  { value: 'all', label: 'Все' },
];

const STATUS_UI = {
  draft: { label: 'Черновик', className: 'bg-white/10 text-white/70' },
  pending: { label: 'На проверке', className: 'bg-amber-400/15 text-amber-200' },
  approved: { label: 'Принято', className: 'bg-[#22c55e]/15 text-[#86efac]' },
  rejected: { label: 'Отклонено', className: 'bg-red-500/15 text-red-200' },
};

const AdminSubmissionsPage = () => {
  const { isAdminAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [reason, setReason] = useState('');

  const load = async (status) => {
    const params = status && status !== 'all' ? `?status=${status}` : '';
    const response = await api.get(`/api/admin/submissions${params}`);
    setItems(response.data);
  };

  useEffect(() => {
    if (isAdminAuthenticated) load(filter).catch(() => setItems([]));
  }, [isAdminAuthenticated, filter]);

  if (!isAdminAuthenticated) return null;

  const handleApprove = async (id) => {
    await api.post(`/api/admin/submissions/${id}/approve`);
    await load(filter);
  };

  const handleReject = async (id) => {
    await api.post(`/api/admin/submissions/${id}/reject`, { reason });
    setReason('');
    await load(filter);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">На проверке</h1>
        <p className="admin-page-sub">
          Апрув создаёт скрытый бит в каталоге. Публикацию включаешь на вкладке «Биты».
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setFilter(item.value)}
            className={`rounded-full px-3 py-1.5 text-xs ${
              filter === item.value ? 'bg-[#22c55e] text-[#052e16]' : 'bg-white/5 text-white/60'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.length === 0 && <div className="admin-empty">Пусто.</div>}
        {items.map((item) => {
          const badge = STATUS_UI[item.status] || STATUS_UI.draft;
          return (
            <div key={item.id} className="admin-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-[Syne] text-lg font-semibold">{item.title}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/50">
                    {item.contributor_name} · витрина: {item.artist} · {item.genre} · {item.bpm} BPM · {item.price} ₽
                  </p>
                </div>
                {item.status !== 'approved' && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="admin-primary-btn" onClick={() => handleApprove(item.id)}>
                      Принять
                    </button>
                    <button type="button" className="admin-ghost-btn" onClick={() => handleReject(item.id)}>
                      Отклонить
                    </button>
                  </div>
                )}
              </div>
              {item.status === 'pending' && (
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Причина отклонения (необязательно)"
                  className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminSubmissionsPage;
