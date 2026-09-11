import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, buildMediaUrl } from '../utils/api';
import { Pencil, Trash2, Music, Loader2, X, Upload, Image as ImageIcon } from 'lucide-react';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45';

const EMPTY_FILES = {
  cover_file: null,
  demo_file: null,
  mp3_file: null,
  wav_file: null,
  exclusive_file: null,
};

const FILE_SLOTS = [
  { key: 'cover_file', label: 'Обложка', accept: 'image/jpeg,image/png,image/webp', urlKey: 'cover_url', kind: 'image' },
  { key: 'demo_file', label: 'Демо (превью)', accept: 'audio/*', urlKey: 'demo_url', kind: 'audio' },
  { key: 'mp3_file', label: 'MP3 (после покупки)', accept: 'audio/*', urlKey: 'mp3_url', kind: 'audio' },
  { key: 'wav_file', label: 'WAV (после покупки)', accept: 'audio/*', urlKey: 'wav_url', kind: 'audio' },
  { key: 'exclusive_file', label: 'Exclusive ZIP', accept: '.zip,application/zip', urlKey: 'exclusive_url', kind: 'archive' },
];

function fileBasename(url) {
  if (!url) return null;
  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1] || url;
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const AdminBeats = () => {
  const { isAdminAuthenticated } = useAuth();
  const [beats, setBeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBeat, setEditingBeat] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editFiles, setEditFiles] = useState(EMPTY_FILES);
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

  const closeEdit = () => {
    setEditingBeat(null);
    setEditFiles(EMPTY_FILES);
  };

  const handleEdit = (beat) => {
    setEditingBeat(beat);
    setEditFiles(EMPTY_FILES);
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

  const handleFilePick = (key, file) => {
    setEditFiles((prev) => ({ ...prev, [key]: file || null }));
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      await api.put(`/api/admin/beats/${editingBeat.id}`, editForm);

      const formData = new FormData();
      let hasFiles = false;
      Object.entries(editFiles).forEach(([key, file]) => {
        if (file) {
          formData.append(key, file);
          hasFiles = true;
        }
      });

      if (hasFiles) {
        await api.put(`/api/admin/beats/${editingBeat.id}/files`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      closeEdit();
      fetchBeats();
    } catch (error) {
      console.error('Error updating beat:', error);
      const detail = error.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : 'Ошибка обновления бита');
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
          <div className="absolute inset-0" onClick={closeEdit} aria-hidden="true" />
          <div className="admin-modal max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-[Syne] text-xl font-bold text-white">Редактировать бит</h2>
              <button
                type="button"
                onClick={closeEdit}
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

              <div className="border-t border-white/10 pt-4">
                <h3 className="mb-1 font-[Syne] text-sm font-semibold text-white">Файлы</h3>
                <p className="mb-3 text-xs text-white/40">
                  Пустой слот — загрузить. Если файл уже есть — можно заменить. Не выбранные слоты не меняются.
                </p>
                <div className="space-y-3">
                  {FILE_SLOTS.map((slot) => {
                    const inputId = `edit-${slot.key}`;
                    const picked = editFiles[slot.key];
                    const currentUrl = editingBeat[slot.urlKey];
                    const currentName = fileBasename(currentUrl);

                    return (
                      <div key={slot.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <label htmlFor={inputId} className={labelClass}>
                              {slot.label}
                            </label>
                            {!picked && currentName && (
                              <p className="text-xs text-white/40 truncate max-w-[16rem]" title={currentName}>
                                Сейчас: {currentName}
                              </p>
                            )}
                            {!picked && !currentName && (
                              <p className="text-xs text-white/30">Файла нет</p>
                            )}
                            {picked && (
                              <p className="text-xs text-[#22c55e]">
                                Новый: {picked.name}
                                {picked.size ? ` · ${formatFileSize(picked.size)}` : ''}
                              </p>
                            )}
                          </div>
                          {slot.kind === 'image' && currentUrl && !picked && (
                            <img
                              src={buildMediaUrl(currentUrl)}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            />
                          )}
                          {slot.kind === 'image' && picked && (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/5">
                              <ImageIcon className="h-5 w-5 text-[#22c55e]" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <input
                            id={inputId}
                            type="file"
                            accept={slot.accept}
                            className="hidden"
                            onChange={(e) => handleFilePick(slot.key, e.target.files?.[0] || null)}
                          />
                          <label
                            htmlFor={inputId}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            {currentName || picked ? 'Заменить' : 'Загрузить'}
                          </label>
                          {picked && (
                            <button
                              type="button"
                              onClick={() => handleFilePick(slot.key, null)}
                              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-white"
                            >
                              Отменить выбор
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={closeEdit} className="admin-ghost-btn">
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
