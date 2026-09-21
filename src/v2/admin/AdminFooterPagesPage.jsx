import React, { useCallback, useEffect, useState } from 'react';
import { GripVertical, Loader2, MessageCircle, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40';

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45';

const emptyForm = {
  slug: '',
  label: '',
  title: '',
  body: '',
  enabled: true,
};

const AdminFooterPagesPage = () => {
  const { isAdminAuthenticated } = useAuth();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/admin/footer-pages');
      setPages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Не удалось загрузить футер');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdminAuthenticated) load();
  }, [isAdminAuthenticated, load]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setPanelOpen(true);
  };

  const openEdit = (page) => {
    setEditingId(page.id);
    setForm({
      slug: page.slug || '',
      label: page.label || '',
      title: page.title || '',
      body: page.body || '',
      enabled: page.enabled !== false,
    });
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const editingPage = pages.find((p) => p.id === editingId);
  const isSupport = editingPage?.kind === 'support';
  const isCreate = editingId == null;

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      if (isCreate) {
        await api.post('/api/admin/footer-pages', {
          slug: form.slug.trim(),
          label: form.label.trim(),
          title: form.title.trim() || form.label.trim(),
          body: form.body,
          enabled: form.enabled,
        });
      } else if (isSupport) {
        await api.put(`/api/admin/footer-pages/${editingId}`, {
          label: form.label.trim(),
          enabled: form.enabled,
        });
      } else {
        await api.put(`/api/admin/footer-pages/${editingId}`, {
          label: form.label.trim(),
          title: form.title.trim() || form.label.trim(),
          body: form.body,
          enabled: form.enabled,
        });
      }
      closePanel();
      await load();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (page) => {
    if (page.is_builtin) return;
    if (!window.confirm(`Удалить «${page.label}»?`)) return;
    setError('');
    try {
      await api.delete(`/api/admin/footer-pages/${page.id}`);
      await load();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Ошибка удаления');
    }
  };

  const toggleEnabled = async (page) => {
    setError('');
    try {
      await api.put(`/api/admin/footer-pages/${page.id}`, { enabled: !page.enabled });
      await load();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Не удалось сменить видимость');
    }
  };

  const persistOrder = async (ordered) => {
    setPages(ordered);
    setError('');
    try {
      const { data } = await api.put('/api/admin/footer-pages/reorder', {
        ids: ordered.map((p) => p.id),
      });
      setPages(Array.isArray(data) ? data : ordered);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Не удалось сохранить порядок');
      await load();
    }
  };

  const onDrop = (targetId) => {
    if (dragId == null || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const from = pages.findIndex((p) => p.id === dragId);
    const to = pages.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const next = [...pages];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    setDragOverId(null);
    persistOrder(next);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[Syne] text-2xl font-bold text-white sm:text-3xl">Футер</h1>
          <p className="mt-1 text-sm text-white/45">
            Ссылки справа внизу: порядок (зажать и тянуть), название, текст страницы, скрытие
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-[#052e16] transition hover:brightness-110"
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
        {pages.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-white/40">Записей пока нет.</div>
        ) : (
          <ul className="divide-y divide-white/5">
            {pages.map((page) => (
              <li
                key={page.id}
                draggable
                onDragStart={() => setDragId(page.id)}
                onDragEnd={() => {
                  setDragId(null);
                  setDragOverId(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverId(page.id);
                }}
                onDrop={() => onDrop(page.id)}
                className={`flex flex-wrap items-center gap-3 px-4 py-3 transition ${
                  dragOverId === page.id ? 'bg-[#22c55e]/10' : 'hover:bg-white/[0.03]'
                } ${dragId === page.id ? 'opacity-60' : ''}`}
              >
                <button
                  type="button"
                  className="cursor-grab touch-none text-white/35 hover:text-white/70 active:cursor-grabbing"
                  aria-label="Перетащить"
                  title="Зажми и перетащи"
                >
                  <GripVertical className="h-5 w-5" />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {page.show_icon || page.kind === 'support' ? (
                      <MessageCircle className="h-4 w-4 shrink-0 text-white/50" />
                    ) : null}
                    <span className="font-medium text-white">{page.label}</span>
                    <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/40">
                      {page.kind === 'support' ? 'чат' : page.is_builtin ? 'вшитая' : 'своя'}
                    </span>
                    {!page.enabled && (
                      <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/45">
                        скрыта
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-white/35">{page.path}</p>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-white/55">
                  <input
                    type="checkbox"
                    checked={!!page.enabled}
                    onChange={() => toggleEnabled(page)}
                    className="h-4 w-4 rounded border-white/20 bg-black accent-[#22c55e]"
                  />
                  Показывать
                </label>

                <button
                  type="button"
                  onClick={() => openEdit(page)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/25 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {page.kind === 'support' ? 'Название' : 'Изменить'}
                </button>

                {!page.is_builtin && (
                  <button
                    type="button"
                    onClick={() => remove(page)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-300/80 transition hover:border-red-500/40 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Удалить
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="font-[Syne] text-lg font-bold text-white">
                {isCreate ? 'Новая страница' : isSupport ? 'Поддержка в футере' : 'Редактирование'}
              </h2>
              <button type="button" onClick={closePanel} className="text-white/40 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              {isCreate && (
                <div>
                  <label className={labelClass}>Slug страницы</label>
                  <input
                    className={fieldClass}
                    value={form.slug}
                    onChange={(e) => setField('slug', e.target.value)}
                    placeholder="refund-policy"
                  />
                  <p className="mt-1 text-xs text-white/30">URL будет /pages/slug · только латиница и дефис</p>
                </div>
              )}

              <div>
                <label className={labelClass}>Название в футере</label>
                <input
                  className={fieldClass}
                  value={form.label}
                  onChange={(e) => setField('label', e.target.value)}
                  placeholder="Соглашение"
                />
              </div>

              {!isSupport && (
                <>
                  <div>
                    <label className={labelClass}>Заголовок страницы</label>
                    <input
                      className={fieldClass}
                      value={form.title}
                      onChange={(e) => setField('title', e.target.value)}
                      placeholder="Пользовательское соглашение"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Текст страницы</label>
                    <textarea
                      className={`${fieldClass} min-h-[220px] font-mono text-[13px] leading-relaxed`}
                      value={form.body}
                      onChange={(e) => setField('body', e.target.value)}
                      placeholder="Текст или простой HTML…"
                    />
                    <p className="mt-1 text-xs text-white/30">
                      Если оставить пустым у вшитых страниц — останется текущий шаблон на сайте
                    </p>
                  </div>
                </>
              )}

              {isSupport && (
                <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/50">
                  Это ссылка на чат поддержки. Содержимое страницы здесь не редактируется — только
                  название в футере, порядок и видимость.
                </p>
              )}

              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) => setField('enabled', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black accent-[#22c55e]"
                />
                Показывать в футере
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 px-5 py-4">
              <button
                type="button"
                onClick={closePanel}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#052e16] disabled:opacity-60"
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

export default AdminFooterPagesPage;
