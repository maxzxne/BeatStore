import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api, buildMediaUrl } from '../../utils/api';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45';

const emptyForm = {
  title: '',
  body: '',
  image_url: '',
  link_url: '',
  sort_order: 0,
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

function getBannerStatus(banner, now = new Date()) {
  if (!banner.enabled) {
    return { key: 'off', label: 'Выкл', className: 'bg-white/10 text-white/50' };
  }
  const starts = banner.starts_at ? new Date(banner.starts_at) : null;
  const ends = banner.ends_at ? new Date(banner.ends_at) : null;
  if (starts && !Number.isNaN(starts.getTime()) && starts > now) {
    return { key: 'soon', label: 'Скоро', className: 'bg-amber-500/15 text-amber-300' };
  }
  if (ends && !Number.isNaN(ends.getTime()) && ends < now) {
    return { key: 'expired', label: 'Истёк', className: 'bg-red-500/15 text-red-300' };
  }
  return { key: 'active', label: 'Активен', className: 'bg-[#22c55e]/15 text-[#22c55e]' };
}

function formatRange(banner) {
  const fmt = (v) => {
    if (!v) return '∞';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  return `${fmt(banner.starts_at)} → ${fmt(banner.ends_at)}`;
}

const AdminBannersPage = () => {
  const { isAdminAuthenticated } = useAuth();
  const fileRef = useRef(null);
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (isAdminAuthenticated) fetchBanners();
  }, [isAdminAuthenticated]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const sorted = useMemo(
    () => [...banners].sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id)),
    [banners]
  );

  const fetchBanners = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/api/admin/promo-banners');
      setBanners(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching banners:', err);
      setError(err.response?.data?.detail || 'Не удалось загрузить баннеры');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, sort_order: banners.length });
    setPanelOpen(true);
    setError('');
  };

  const openEdit = (banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title || '',
      body: banner.body || '',
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      sort_order: banner.sort_order ?? 0,
      enabled: Boolean(banner.enabled),
      starts_at: toDatetimeLocal(banner.starts_at),
      ends_at: toDatetimeLocal(banner.ends_at),
    });
    setPanelOpen(true);
    setError('');
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setUploading(true);
      setError('');
      const body = new FormData();
      body.append('file', file);
      const { data } = await api.post('/api/admin/promo-banners/upload-image', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setField('image_url', data?.image_url || data?.url || '');
    } catch (err) {
      console.error('Error uploading banner image:', err);
      setError(err.response?.data?.detail || 'Ошибка загрузки изображения');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const payload = {
        title: form.title || null,
        body: form.body || null,
        image_url: form.image_url || null,
        link_url: form.link_url || null,
        sort_order: Number(form.sort_order) || 0,
        enabled: Boolean(form.enabled),
        starts_at: fromDatetimeLocal(form.starts_at),
        ends_at: fromDatetimeLocal(form.ends_at),
      };

      if (editingId) {
        await api.put(`/api/admin/promo-banners/${editingId}`, payload);
      } else {
        await api.post('/api/admin/promo-banners', payload);
      }
      closePanel();
      await fetchBanners();
    } catch (err) {
      console.error('Error saving banner:', err);
      setError(err.response?.data?.detail || 'Ошибка сохранения баннера');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (banner) => {
    if (!confirm(`Удалить баннер${banner.title ? ` «${banner.title}»` : ''}?`)) return;
    try {
      setError('');
      await api.delete(`/api/admin/promo-banners/${banner.id}`);
      if (editingId === banner.id) closePanel();
      await fetchBanners();
    } catch (err) {
      console.error('Error deleting banner:', err);
      setError(err.response?.data?.detail || 'Ошибка удаления');
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
      <div className="flex h-64 items-center justify-center text-white/50">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Загрузка…
      </div>
    );
  }

  const previewUrl = buildMediaUrl(form.image_url);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[Syne] text-2xl font-bold text-white sm:text-3xl">Баннеры</h1>
          <p className="mt-1 text-sm text-white/45">Промо-слайдер: картинка, тексты, окно дат, порядок</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-[#0f172a] transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" />
          Добавить
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {typeof error === 'string' ? error : JSON.stringify(error)}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
        {sorted.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-white/40">
            Баннеров пока нет. Создай первый.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.16em] text-white/35">
                <tr>
                  <th className="px-4 py-3 font-semibold">Превью</th>
                  <th className="px-4 py-3 font-semibold">Заголовок</th>
                  <th className="px-4 py-3 font-semibold">Статус</th>
                  <th className="px-4 py-3 font-semibold">Окно</th>
                  <th className="px-4 py-3 font-semibold">Порядок</th>
                  <th className="px-4 py-3 font-semibold text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((banner) => {
                  const status = getBannerStatus(banner, now);
                  const thumb = buildMediaUrl(banner.image_url);
                  return (
                    <tr key={banner.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        {thumb ? (
                          <img src={thumb} alt="" className="h-12 w-20 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-12 w-20 items-center justify-center rounded-lg bg-white/5 text-[10px] text-white/30">
                            нет фото
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{banner.title || 'Без названия'}</div>
                        {banner.body && (
                          <div className="mt-0.5 line-clamp-1 text-xs text-white/40">{banner.body}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-white/45 whitespace-nowrap">{formatRange(banner)}</td>
                      <td className="px-4 py-3 text-white/70">{banner.sort_order}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(banner)}
                            className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
                            aria-label="Редактировать"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(banner)}
                            className="rounded-lg border border-red-500/20 p-2 text-red-300/80 transition hover:bg-red-500/10"
                            aria-label="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div
            className="absolute inset-0"
            onClick={closePanel}
            aria-hidden="true"
          />
          <form
            onSubmit={handleSave}
            className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0a] p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-[Syne] text-xl font-bold text-white">
                {editingId ? 'Редактировать баннер' : 'Новый баннер'}
              </h2>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-lg p-2 text-white/50 hover:bg-white/5 hover:text-white"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className={labelClass}>Изображение</p>
                {previewUrl ? (
                  <img src={previewUrl} alt="" className="mb-3 h-36 w-full rounded-xl object-cover" />
                ) : (
                  <div className="mb-3 flex h-36 items-center justify-center rounded-xl border border-dashed border-white/15 text-sm text-white/35">
                    Нет изображения
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm text-white/80 hover:bg-white/5 disabled:opacity-60"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    Загрузить
                  </button>
                  {form.image_url && (
                    <button
                      type="button"
                      onClick={() => setField('image_url', '')}
                      className="rounded-xl border border-red-500/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
                    >
                      Убрать
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass} htmlFor="banner-title">Заголовок</label>
                <input
                  id="banner-title"
                  className={fieldClass}
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="banner-body">Текст</label>
                <textarea
                  id="banner-body"
                  rows={3}
                  className={`${fieldClass} resize-y`}
                  value={form.body}
                  onChange={(e) => setField('body', e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="banner-link">Ссылка</label>
                <input
                  id="banner-link"
                  className={fieldClass}
                  value={form.link_url}
                  onChange={(e) => setField('link_url', e.target.value)}
                  placeholder="https://…"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="banner-sort">Порядок</label>
                  <input
                    id="banner-sort"
                    type="number"
                    className={fieldClass}
                    value={form.sort_order}
                    onChange={(e) => setField('sort_order', e.target.value)}
                  />
                </div>
                <label className="flex items-end gap-3 pb-2">
                  <input
                    type="checkbox"
                    checked={Boolean(form.enabled)}
                    onChange={(e) => setField('enabled', e.target.checked)}
                    className="h-5 w-5 accent-[#22c55e]"
                  />
                  <span className="text-sm text-white/80">Включён</span>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="banner-starts">Начало</label>
                  <input
                    id="banner-starts"
                    type="datetime-local"
                    className={fieldClass}
                    value={form.starts_at}
                    onChange={(e) => setField('starts_at', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="banner-ends">Конец</label>
                  <input
                    id="banner-ends"
                    type="datetime-local"
                    className={fieldClass}
                    value={form.ends_at}
                    onChange={(e) => setField('ends_at', e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-white/30">Пустая дата = без ограничения с этой стороны</p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closePanel}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-[#0f172a] disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminBannersPage;
