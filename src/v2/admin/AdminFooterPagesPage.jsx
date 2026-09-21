import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  Code2,
  GripVertical,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';

const HtmlCodeEditor = lazy(() => import('./HtmlCodeEditor'));

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

const EditorSlot = ({ value, onChange }) => (
  <Suspense
    fallback={
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-white/10 bg-black/50 text-sm text-white/40">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Загрузка редактора…
      </div>
    }
  >
    <HtmlCodeEditor value={value} onChange={onChange} />
  </Suspense>
);

function looksLikeHtml(text) {
  return /<\/?[a-z][\s\S]*>/i.test(text || '');
}

const PreviewPane = ({ title, body }) => {
  const trimmed = (body || '').trim();
  if (!trimmed) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/20 px-6 text-center text-sm text-white/40">
        Пока пусто — напиши HTML слева или подставь шаблон.
      </div>
    );
  }
  return (
    <div className="min-h-[420px] overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-5 sm:p-6">
      <p className="mb-2 text-[10px] uppercase tracking-[0.28em] text-[#22c55e]">Legal</p>
      <h1 className="mb-5 font-[Syne] text-2xl font-extrabold text-white sm:text-3xl">{title || 'Без заголовка'}</h1>
      {looksLikeHtml(trimmed) ? (
        <div
          className="space-y-4 text-sm leading-relaxed text-white/70 [&_a]:text-[#22c55e] [&_a]:underline-offset-2 hover:[&_a]:underline [&_em]:italic [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_p.lead]:mb-5 [&_p.lead]:text-white/50 [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-white/90 [&_ul]:space-y-1"
          dangerouslySetInnerHTML={{ __html: trimmed }}
        />
      ) : (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">{trimmed}</div>
      )}
    </div>
  );
};

const AdminFooterPagesPage = () => {
  const { isAdminAuthenticated } = useAuth();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('list'); // list | edit | create
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState('code'); // code | preview
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [dirty, setDirty] = useState(false);

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

  const editingPage = useMemo(
    () => pages.find((p) => p.id === editingId) || null,
    [pages, editingId],
  );
  const isSupport = editingPage?.kind === 'support';
  const isCreate = mode === 'create';

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setTab('code');
    setDirty(false);
    setMode('create');
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
    setTab('code');
    setDirty(false);
    setMode('edit');
  };

  const backToList = () => {
    if (dirty && !window.confirm('Есть несохранённые правки. Уйти без сохранения?')) return;
    setMode('list');
    setEditingId(null);
    setForm(emptyForm);
    setDirty(false);
    setError('');
  };

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
      setDirty(false);
      setMode('list');
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const loadTemplate = async () => {
    if (!editingId) return;
    if (form.body.trim() && !window.confirm('Заменить текущий текст шаблоном из репозитория?')) {
      return;
    }
    setError('');
    try {
      const { data } = await api.get(`/api/admin/footer-pages/${editingId}/default-body`);
      setField('body', data.body || '');
      setTab('code');
    } catch (err) {
      setError(err.response?.data?.detail || 'Шаблон недоступен');
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
      setError(err.response?.data?.detail || 'Ошибка удаления');
    }
  };

  const toggleEnabled = async (page) => {
    setError('');
    try {
      await api.put(`/api/admin/footer-pages/${page.id}`, { enabled: !page.enabled });
      await load();
    } catch (err) {
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

  if (loading && mode === 'list') {
    return (
      <div className="flex h-64 items-center justify-center text-white/50">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Загрузка…
      </div>
    );
  }

  if (mode === 'edit' || mode === 'create') {
    const publicPath = editingPage?.path || (form.slug ? `/pages/${form.slug.trim()}` : null);

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={backToList}
              className="mb-2 inline-flex cursor-pointer items-center gap-1.5 text-xs text-white/45 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              К списку футера
            </button>
            <h1 className="font-[Syne] text-2xl font-bold text-white sm:text-3xl">
              {isCreate ? 'Новая страница' : isSupport ? 'Поддержка в футере' : form.label || 'Редактирование'}
            </h1>
            <p className="mt-1 text-sm text-white/45">
              Правки сразу на сайте после сохранения — без деплоя.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {publicPath && !isCreate && (
              <a
                href={publicPath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                На сайте
              </a>
            )}
            {!isSupport && !isCreate && editingPage?.is_builtin && (
              <button
                type="button"
                onClick={loadTemplate}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Подставить шаблон
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-semibold text-[#052e16] transition hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Сохранить
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {typeof error === 'string' ? error : JSON.stringify(error)}
          </div>
        )}

        <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {isCreate && (
            <div className="sm:col-span-2 lg:col-span-1">
              <label className={labelClass} htmlFor="footer-slug">
               Slug
              </label>
              <input
                id="footer-slug"
                className={fieldClass}
                value={form.slug}
                onChange={(e) => setField('slug', e.target.value)}
                placeholder="refund-policy"
              />
            </div>
          )}
          <div>
            <label className={labelClass} htmlFor="footer-label">
              В футере
            </label>
            <input
              id="footer-label"
              className={fieldClass}
              value={form.label}
              onChange={(e) => setField('label', e.target.value)}
              placeholder="ПДн"
            />
          </div>
          {!isSupport && (
            <div className={isCreate ? 'sm:col-span-2' : 'sm:col-span-2 lg:col-span-2'}>
              <label className={labelClass} htmlFor="footer-title">
                Заголовок страницы
              </label>
              <input
                id="footer-title"
                className={fieldClass}
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="Согласие на обработку…"
              />
            </div>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setField('enabled', e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black accent-[#22c55e]"
            />
            Показывать в футере
          </label>
        </div>

        {isSupport ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/55">
            Это ссылка на чат поддержки. Текст страницы здесь не редактируется — только название,
            порядок и видимость.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
              {[
                { id: 'code', label: 'Код', icon: Code2 },
                { id: 'preview', label: 'Превью', icon: Eye },
              ].map((item) => {
                const active = tab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition sm:flex-none sm:px-5 ${
                      active
                        ? 'bg-[#22c55e] text-[#052e16]'
                        : 'text-white/55 hover:bg-white/5 hover:text-white'
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/50`}
                    aria-pressed={active}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
              <span className="ml-auto hidden px-3 text-[11px] text-white/30 sm:inline">
                HTML · правки без деплоя
              </span>
            </div>

            <div className="hidden gap-4 lg:grid lg:grid-cols-2">
              <div>
                <p className={labelClass}>Редактор</p>
                <EditorSlot value={form.body} onChange={(next) => setField('body', next)} />
              </div>
              <div>
                <p className={labelClass}>Как на сайте</p>
                <PreviewPane title={form.title || form.label} body={form.body} />
              </div>
            </div>

            <div className="lg:hidden">
              {tab === 'code' ? (
                <EditorSlot value={form.body} onChange={(next) => setField('body', next)} />
              ) : (
                <PreviewPane title={form.title || form.label} body={form.body} />
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-[Syne] text-2xl font-bold text-white sm:text-3xl">Футер</h1>
          <p className="mt-1 text-sm text-white/45">
            Legal и свои страницы: порядок, видимость, текст в CMS — без деплоя
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-[#052e16] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/50"
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
                  className="min-h-[44px] min-w-[44px] cursor-grab touch-none text-white/35 transition hover:text-white/70 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/50"
                  aria-label="Перетащить"
                  title="Зажми и перетащи"
                >
                  <GripVertical className="mx-auto h-5 w-5" />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {page.show_icon || page.kind === 'support' ? (
                      <MessageCircle className="h-4 w-4 shrink-0 text-white/50" aria-hidden />
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
                    {page.kind !== 'support' && !(page.body || '').trim() && (
                      <span className="rounded-md bg-amber-400/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-200">
                        пустая
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-white/35">{page.path}</p>
                </div>

                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-xs text-white/55">
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
                  className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e]/50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {page.kind === 'support' ? 'Название' : 'Редактировать'}
                </button>

                {!page.is_builtin && (
                  <button
                    type="button"
                    onClick={() => remove(page)}
                    className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-300/80 transition hover:border-red-500/40 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
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
    </div>
  );
};

export default AdminFooterPagesPage;
