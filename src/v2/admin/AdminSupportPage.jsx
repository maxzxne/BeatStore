import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import {
  SUPPORT_POLL_MS,
  SupportComposer,
  SupportTranscript,
  formatSupportTime,
  mergeMessages,
} from '../support/SupportChat';

const AdminSupportPage = () => {
  const { isAdminAuthenticated } = useAuth();
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const lastIdRef = useRef(null);
  const selectedIdRef = useRef(null);

  selectedIdRef.current = selectedId;

  const loadList = async () => {
    const { data } = await api.get('/api/admin/support/threads');
    setThreads(data || []);
    return data || [];
  };

  useEffect(() => {
    if (!isAdminAuthenticated) return undefined;
    let cancelled = false;
    const boot = async () => {
      try {
        const rows = await loadList();
        if (!cancelled && rows.length && !selectedIdRef.current) {
          setSelectedId(rows[0].id);
        }
      } catch {
        if (!cancelled) setError('Не удалось загрузить входящие');
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    };
    boot();
    const id = window.setInterval(async () => {
      if (document.hidden) return;
      try {
        await loadList();
      } catch {
        /* keep */
      }
    }, SUPPORT_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isAdminAuthenticated]);

  useEffect(() => {
    if (!isAdminAuthenticated || !selectedId) {
      setMessages([]);
      setSelectedMeta(null);
      lastIdRef.current = null;
      return undefined;
    }
    let cancelled = false;
    const openThread = async () => {
      setLoadingThread(true);
      try {
        const { data } = await api.get(`/api/admin/support/threads/${selectedId}`);
        if (cancelled) return;
        setSelectedMeta(data);
        setMessages(data.messages || []);
        lastIdRef.current = data.messages?.at(-1)?.id ?? null;
        setError('');
        setThreads((prev) =>
          prev.map((row) => (row.id === selectedId ? { ...row, unread_for_admin: 0 } : row))
        );
      } catch {
        if (!cancelled) setError('Не удалось открыть тред');
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    };
    openThread();

    const id = window.setInterval(async () => {
      if (document.hidden || selectedIdRef.current !== selectedId) return;
      try {
        const params = lastIdRef.current ? { after_id: lastIdRef.current } : {};
        const { data } = await api.get(`/api/admin/support/threads/${selectedId}`, { params });
        const incoming = data.messages || [];
        if (!incoming.length) return;
        setMessages((prev) => {
          const next = lastIdRef.current ? mergeMessages(prev, incoming) : incoming;
          lastIdRef.current = next.at(-1)?.id ?? lastIdRef.current;
          return next;
        });
        const last = incoming.at(-1);
        setThreads((prev) =>
          prev.map((row) =>
            row.id === selectedId
              ? {
                  ...row,
                  unread_for_admin: 0,
                  last_message_preview: last?.body || row.last_message_preview,
                  last_message_at: last?.created_at || row.last_message_at,
                }
              : row
          )
        );
      } catch {
        /* keep */
      }
    }, SUPPORT_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isAdminAuthenticated, selectedId]);

  const send = async (body) => {
    if (!selectedId) return;
    setSending(true);
    setError('');
    try {
      const { data } = await api.post(`/api/admin/support/threads/${selectedId}/messages`, { body });
      setMessages((prev) => {
        const next = mergeMessages(prev, [data]);
        lastIdRef.current = next.at(-1)?.id ?? lastIdRef.current;
        return next;
      });
      await loadList();
    } catch (err) {
      setError(err.response?.data?.detail || 'Не отправилось');
      throw err;
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <div className="mb-5">
        <h1 className="admin-page-title">Поддержка</h1>
        <p className="admin-page-sub">Входящие от аккаунтов. Один тред на человека.</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
        <aside className="flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <div className="border-b border-white/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
            Диалоги
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <p className="px-4 py-8 text-sm text-white/40">Загрузка…</p>
            ) : threads.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-white/40">
                <MessageCircle className="mx-auto mb-2 h-8 w-8 text-white/20" />
                Пока тихо
              </div>
            ) : (
              threads.map((thread) => {
                const active = thread.id === selectedId;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedId(thread.id)}
                    className={`flex w-full flex-col gap-1 border-b border-white/5 px-4 py-3 text-left transition ${
                      active ? 'bg-[#22c55e]/15' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-white">{thread.username}</span>
                      {thread.unread_for_admin > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#22c55e] px-1.5 text-[10px] font-bold text-[#0f172a]">
                          {thread.unread_for_admin}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs text-white/45">{thread.last_message_preview}</p>
                    <p className="text-[10px] text-white/30">{formatSupportTime(thread.last_message_at)}</p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-h-[28rem] max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          {selectedId ? (
            <>
              <header className="border-b border-white/10 px-4 py-3">
                <p className="font-[Syne] text-base font-bold text-white">{selectedMeta?.username || '…'}</p>
                {selectedMeta?.email && (
                  <p className="text-xs text-white/40">{selectedMeta.email}</p>
                )}
              </header>
              {loadingThread ? (
                <div className="flex flex-1 items-center justify-center text-sm text-white/40">Загрузка…</div>
              ) : (
                <SupportTranscript
                  messages={messages}
                  selfRole="admin"
                  peerLabel={selectedMeta?.username || 'Клиент'}
                  emptyText="Пользователь ещё ничего не написал."
                />
              )}
              {error && (
                <p className="border-t border-white/10 px-4 py-2 text-sm text-red-300">{error}</p>
              )}
              <SupportComposer
                onSend={send}
                sending={sending || loadingThread}
                placeholder="Ответ пользователю"
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-white/40">
              Выбери диалог слева
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminSupportPage;
