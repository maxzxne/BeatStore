import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

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
        <p className="admin-page-sub">Апрув создаёт скрытый бит в каталоге. Публикацию включаешь в «Биты».</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['pending', 'draft', 'rejected', 'approved', 'all'].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1.5 text-xs ${
              filter === value ? 'bg-[#22c55e] text-[#052e16]' : 'bg-white/5 text-white/60'
            }`}
          >
            {value === 'all' ? 'все' : value}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.length === 0 && <div className="admin-empty">Пусто.</div>}
        {items.map((item) => (
          <div key={item.id} className="admin-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-[Syne] text-lg font-semibold">{item.title}</h2>
                <p className="text-sm text-white/50">
                  {item.contributor_name} · витрина: {item.artist} · {item.genre} · {item.bpm} BPM · {item.price} ₽
                </p>
                <p className="mt-1 text-xs text-white/35">статус: {item.status}</p>
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
        ))}
      </div>
    </div>
  );
};

export default AdminSubmissionsPage;
