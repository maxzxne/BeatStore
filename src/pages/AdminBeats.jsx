import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, buildMediaUrl } from '../utils/api';
import { Pencil, Trash2, Music, Loader2, X } from 'lucide-react';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45';

const AdminBeats = () => {
  const { isAdminAuthenticated } = useAuth();
  const [beats, setBeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBeat, setEditingBeat] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchBeats();
    }
  }, [isAdminAuthenticated]);

  const fetchBeats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/beats');
      setBeats(response.data);
    } catch (error) {
      console.error('Error fetching beats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (beat) => {
    setEditingBeat(beat);
    setEditForm({
      title: beat.title,
      artist: beat.artist,
      genre: beat.genre,
      bpm: beat.bpm,
      price: beat.price,
      key: beat.key || '',
      description: beat.description || '',
      is_available: beat.is_available,
    });
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      await api.put(`/api/admin/beats/${editingBeat.id}`, editForm);
      setEditingBeat(null);
      fetchBeats();
    } catch (error) {
      console.error('Error updating beat:', error);
      alert('Ошибка обновления бита');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (beatId) => {
    if (!confirm('Вы уверены, что хотите удалить этот бит?')) return;

    try {
      await api.delete(`/api/admin/beats/${beatId}`);
      fetchBeats();
    } catch (error) {
      console.error('Error deleting beat:', error);
      alert('Ошибка удаления бита');
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="py-12 text-center text-white/50">
        Доступ запрещен. Войдите как администратор.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <Loader2 className="h-5 w-5 animate-spin" />
        Загрузка битов…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Биты</h1>
        <p className="admin-page-sub">{beats.length} в каталоге</p>
      </div>

      <div className="admin-panel">
        {beats.length === 0 ? (
          <div className="admin-empty">
            <Music className="mx-auto mb-3 h-10 w-10 text-white/25" />
            Битов пока нет. Загрузите первый в разделе «Загрузка».
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Обложка</th>
                  <th>Трек</th>
                  <th>Мета</th>
                  <th>Цена</th>
                  <th>Статус</th>
                  <th className="text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {beats.map((beat) => (
                  <tr key={beat.id}>
                    <td>
                      {beat.cover_url ? (
                        <img
                          src={buildMediaUrl(beat.cover_url)}
                          alt=""
                          className="h-12 w-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
                          <Music className="h-5 w-5 text-white/30" />
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="font-medium text-white">{beat.title}</div>
                      <div className="text-xs text-white/40">{beat.artist}</div>
                    </td>
                    <td className="whitespace-nowrap text-xs text-white/45">
                      {beat.genre} · {beat.bpm} BPM
                      {beat.key ? ` · ${beat.key}` : ''}
                    </td>
                    <td className="whitespace-nowrap text-white/80">
                      {beat.price === 0 ? 'Бесплатно' : `${beat.price.toFixed(0)} ₽`}
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${
                          beat.is_available ? 'admin-badge-ok' : 'admin-badge-err'
                        }`}
                      >
                        {beat.is_available ? 'Доступен' : 'Скрыт'}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(beat)}
                          className="admin-icon-btn"
                          aria-label="Редактировать"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(beat.id)}
                          className="admin-icon-btn admin-icon-btn-danger"
                          aria-label="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingBeat && (
        <div className="admin-modal-backdrop">
          <div className="absolute inset-0" onClick={() => setEditingBeat(null)} aria-hidden="true" />
          <div className="admin-modal max-w-lg">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-[Syne] text-xl font-bold text-white">Редактировать бит</h2>
              <button
                type="button"
                onClick={() => setEditingBeat(null)}
                className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Название</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Исполнитель</label>
                <input
                  type="text"
                  value={editForm.artist}
                  onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Жанр</label>
                <input
                  type="text"
                  value={editForm.genre}
                  onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>BPM</label>
                  <input
                    type="number"
                    value={editForm.bpm}
                    onChange={(e) => setEditForm({ ...editForm, bpm: parseInt(e.target.value, 10) })}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Цена (₽)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Тональность</label>
                <input
                  type="text"
                  value={editForm.key}
                  onChange={(e) => setEditForm({ ...editForm, key: e.target.value })}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Описание</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className={`${fieldClass} h-20 resize-y`}
                />
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={editForm.is_available}
                  onChange={(e) => setEditForm({ ...editForm, is_available: e.target.checked })}
                  className="h-5 w-5 accent-[#22c55e]"
                />
                <span className="text-sm text-white/80">Доступен для покупки</span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingBeat(null)} className="admin-ghost-btn">
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="admin-primary-btn"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBeats;
