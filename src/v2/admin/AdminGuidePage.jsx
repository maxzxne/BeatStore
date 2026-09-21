import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ExternalLink,
  Loader2,
  Save,
  Search,
  StickyNote,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import {
  ADMIN_GUIDE_VERSION,
  filterGuideSections,
  groupGuideSections,
  guideSections,
} from './guide/adminGuideContent';

function BlockView({ block }) {
  if (block.type === 'h3') {
    return <h3 className="admin-guide-h3">{block.text}</h3>;
  }
  if (block.type === 'p') {
    return <p className="admin-guide-p">{block.text}</p>;
  }
  if (block.type === 'tip') {
    return (
      <aside className="admin-guide-callout admin-guide-callout--tip" role="note">
        <strong>Совет.</strong> {block.text}
      </aside>
    );
  }
  if (block.type === 'warn') {
    return (
      <aside className="admin-guide-callout admin-guide-callout--warn" role="note">
        <strong>Важно.</strong> {block.text}
      </aside>
    );
  }
  if (block.type === 'link') {
    return (
      <p className="admin-guide-p">
        <Link to={block.href} className="admin-guide-inline-link">
          {block.label || block.href}
        </Link>
      </p>
    );
  }
  if (block.type === 'ul' || block.type === 'ol' || block.type === 'steps') {
    const Tag = block.type === 'ol' || block.type === 'steps' ? 'ol' : 'ul';
    const className =
      block.type === 'steps' ? 'admin-guide-list admin-guide-list--steps' : 'admin-guide-list';
    return (
      <Tag className={className}>
        {(block.items || []).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </Tag>
    );
  }
  return null;
}

function SectionCard({ section }) {
  return (
    <article id={section.id} className="admin-guide-section scroll-mt-24">
      <header className="admin-guide-section-head">
        <div>
          <p className="admin-guide-kicker">{section.group}</p>
          <h2 className="admin-page-title text-xl sm:text-2xl">{section.title}</h2>
        </div>
        <div className="admin-guide-section-links">
          {section.adminPath ? (
            <Link to={section.adminPath} className="admin-primary-btn admin-guide-jump min-h-[40px]">
              Открыть раздел
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : null}
          {(section.publicPaths || []).slice(0, 2).map((path) => (
            <a
              key={path}
              href={path.replace(':id', '1').replace(':slug', 'privacy').replace(':userId', '1')}
              target="_blank"
              rel="noreferrer"
              className="admin-ghost-btn admin-guide-jump"
            >
              {path}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ))}
        </div>
      </header>
      <div className="admin-guide-section-body">
        {section.blocks.map((block, index) => (
          <BlockView key={`${section.id}-${index}`} block={block} />
        ))}
      </div>
    </article>
  );
}

const START_HERE = [
  { id: 'dashboard', label: 'Сводка и очередь' },
  { id: 'beats', label: 'Каталог битов' },
  { id: 'errors', label: 'Оплаты / ошибки' },
];

const AdminGuidePage = () => {
  const { isAdminAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [activeId, setActiveId] = useState(guideSections[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState('');
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesMessage, setNotesMessage] = useState('');
  const [notesError, setNotesError] = useState('');
  const notesRef = useRef(null);

  const filtered = useMemo(
    () => filterGuideSections(guideSections, deferredQuery),
    [deferredQuery],
  );
  const grouped = useMemo(() => groupGuideSections(filtered), [filtered]);
  const notesDirty = notes !== savedNotes;

  useEffect(() => {
    if (!isAdminAuthenticated) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setNotesLoading(true);
        setNotesError('');
        const { data } = await api.get('/api/admin/guide-notes');
        if (!cancelled) {
          const value = data?.notes || '';
          setNotes(value);
          setSavedNotes(value);
        }
      } catch (err) {
        if (!cancelled) {
          setNotesError(err.response?.data?.detail || 'Не удалось загрузить заметки');
        }
      } finally {
        if (!cancelled) setNotesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdminAuthenticated]);

  useEffect(() => {
    const nodes = filtered
      .map((section) => document.getElementById(section.id))
      .filter(Boolean);
    if (!nodes.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.1, 0.25, 0.5] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [filtered]);

  const saveNotes = async () => {
    try {
      setNotesSaving(true);
      setNotesError('');
      setNotesMessage('');
      const { data } = await api.put('/api/admin/guide-notes', { notes });
      const value = data?.notes ?? notes;
      setNotes(value);
      setSavedNotes(value);
      setNotesMessage('Заметки сохранены в базе — деплой их не сотрёт');
    } catch (err) {
      setNotesError(err.response?.data?.detail || 'Не удалось сохранить заметки');
    } finally {
      setNotesSaving(false);
    }
  };

  const jumpToNotes = () => {
    notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const startHereSections = START_HERE.map((item) => ({
    ...item,
    section: guideSections.find((s) => s.id === item.id),
  })).filter((item) => item.section);

  return (
    <div className="admin-guide">
      <header className="admin-guide-hero">
        <div className="flex items-start gap-3">
          <div className="admin-guide-hero-icon" aria-hidden>
            <BookOpen className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="admin-page-title">Инструкция по применению</h1>
            <p className="admin-page-sub mt-1 max-w-3xl">
              Полное руководство по админке и витрине XWinner BeatStore: что делает каждый раздел,
              типичные сценарии и чеклисты. Версия контента {ADMIN_GUIDE_VERSION}.
            </p>
          </div>
        </div>

        {startHereSections.length > 0 && !query ? (
          <div className="admin-guide-start">
            <p className="admin-guide-kicker">Начать здесь</p>
            <div className="flex flex-wrap gap-2">
              {startHereSections.map((item) => (
                <a key={item.id} href={`#${item.id}`} className="admin-filter-chip">
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <div className="admin-guide-toolbar">
          <label className="admin-guide-search">
            <Search className="h-4 w-4 shrink-0 text-white/40" aria-hidden />
            <span className="sr-only">Поиск по инструкции</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск: биты, промокод, заявка, webhook…"
              className="admin-guide-search-input"
              autoComplete="off"
            />
          </label>
          <button type="button" onClick={jumpToNotes} className="admin-ghost-btn admin-guide-jump">
            <StickyNote className="h-4 w-4" aria-hidden />
            Мои заметки
            {notesDirty ? <span className="admin-guide-dirty-dot" title="Есть несохранённые изменения" /> : null}
          </button>
        </div>
      </header>

      <nav className="admin-guide-mobile-toc" aria-label="Разделы инструкции">
        {grouped.map(({ group, sections }) => (
          <div key={group} className="admin-guide-mobile-toc-group">
            <span className="admin-guide-mobile-toc-label">{group}</span>
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`admin-filter-chip ${activeId === section.id ? 'is-active' : ''}`}
                onClick={() => setActiveId(section.id)}
              >
                {section.title}
              </a>
            ))}
          </div>
        ))}
      </nav>

      <div className="admin-guide-layout">
        <nav className="admin-guide-toc" aria-label="Содержание инструкции">
          <p className="admin-guide-toc-title">Содержание</p>
          {grouped.length === 0 ? (
            <p className="text-sm text-white/45">
              Ничего не найдено. Попробуйте «бит», «скидка», «заявка» или «oauth».
            </p>
          ) : (
            grouped.map(({ group, sections }) => (
              <div key={group} className="admin-guide-toc-group">
                <p className="admin-guide-toc-group-label">{group}</p>
                <ul className="space-y-0.5">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className={`admin-guide-toc-link${
                          activeId === section.id ? ' is-active' : ''
                        }`}
                        onClick={() => setActiveId(section.id)}
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </nav>

        <div className="admin-guide-main">
          {filtered.length === 0 ? (
            <div className="admin-panel p-6 text-sm text-white/55">
              По запросу «{deferredQuery}» разделов нет. Очистите поиск или смените формулировку —
              попробуйте «бит», «промокод», «заявка», «oauth».
            </div>
          ) : (
            filtered.map((section) => <SectionCard key={section.id} section={section} />)
          )}

          <section
            id="my-notes"
            ref={notesRef}
            className="admin-guide-notes admin-panel scroll-mt-24"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="admin-guide-kicker">Личное</p>
                <h2 className="admin-page-title text-xl">Мои заметки</h2>
                <p className="admin-page-sub mt-1">
                  Сохраняются в SQLite сайта. Не сбрасываются при деплое и обновлении этой
                  инструкции в коде.
                </p>
              </div>
              <button
                type="button"
                onClick={saveNotes}
                disabled={notesSaving || notesLoading || !notesDirty}
                className="admin-primary-btn inline-flex min-h-[44px] items-center gap-2 disabled:opacity-40"
              >
                {notesSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-4 w-4" aria-hidden />
                )}
                {notesDirty ? 'Сохранить' : 'Сохранено'}
              </button>
            </div>

            {notesLoading ? (
              <p className="mt-4 text-sm text-white/45">Загрузка заметок…</p>
            ) : (
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setNotesMessage('');
                }}
                rows={10}
                className="admin-guide-notes-input mt-4"
                placeholder="Например: логины кабинетов не сюда. Сюда — «баннер до пятницы», «не забыть апрувнуть сабмит Ивана»…"
                aria-label="Личные заметки к инструкции"
              />
            )}

            <div aria-live="polite">
              {notesDirty && !notesMessage ? (
                <p className="mt-3 text-sm text-amber-300/90" role="status">
                  Есть несохранённые изменения
                </p>
              ) : null}
              {notesMessage ? (
                <p className="mt-3 text-sm text-[#22c55e]" role="status">
                  {notesMessage}
                </p>
              ) : null}
            </div>
            {notesError ? (
              <p className="mt-3 text-sm text-red-400" role="alert">
                {notesError}
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminGuidePage;
