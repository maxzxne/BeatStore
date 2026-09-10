import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Headphones, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { loginPath } from '../utils/authRedirect';
import {
  SUPPORT_POLL_MS,
  SupportComposer,
  SupportTranscript,
  mergeMessages,
} from './support/SupportChat';

const SupportPageV2 = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const lastIdRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    const boot = async () => {
      try {
        const { data } = await api.get('/api/support/thread');
        if (cancelled) return;
        setMessages(data.messages || []);
        lastIdRef.current = data.messages?.at(-1)?.id ?? null;
        setError('');
      } catch {
        if (!cancelled) setError('Не удалось загрузить переписку');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    boot();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const params = lastIdRef.current ? { after_id: lastIdRef.current } : {};
        const { data } = await api.get('/api/support/thread', { params });
        const incoming = data.messages || [];
        if (!incoming.length) return;
        setMessages((prev) => {
          const next = lastIdRef.current ? mergeMessages(prev, incoming) : incoming;
          lastIdRef.current = next.at(-1)?.id ?? lastIdRef.current;
          return next;
        });
      } catch {
        /* keep last good state */
      }
    };
    const id = window.setInterval(tick, SUPPORT_POLL_MS);
    return () => window.clearInterval(id);
  }, [isAuthenticated]);

  const send = async (body) => {
    setSending(true);
    setError('');
    try {
      const { data } = await api.post('/api/support/thread/messages', { body });
      setMessages((prev) => {
        const next = mergeMessages(prev, [data]);
        lastIdRef.current = next.at(-1)?.id ?? lastIdRef.current;
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Не отправилось. Попробуй ещё раз.');
      throw err;
    } finally {
      setSending(false);
    }
  };

  if (authLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-white/40">
        Загрузка…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
          <MessageCircle className="mx-auto mb-4 h-12 w-12 text-white/30" />
          <h1 className="font-[Syne] text-2xl font-extrabold text-white">Войди, чтобы написать</h1>
          <p className="mt-2 text-sm text-white/50">
            Поддержка привязана к аккаунту — история не потеряется.
          </p>
          <Link
            to={loginPath('/support')}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#22c55e] px-6 text-sm font-semibold text-[#0f172a] transition hover:brightness-110"
          >
            Войти
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#22c55e]">XWinner</p>
          <h1 className="font-[Syne] text-2xl font-extrabold text-white">Поддержка</h1>
          <p className="mt-1 text-sm text-white/45">Один чат на аккаунт. Отвечаем здесь же.</p>
        </div>
        <Headphones className="h-8 w-8 text-white/20" aria-hidden />
      </div>

      <section className="flex min-h-[28rem] flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/30">
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-white/40">Загрузка…</div>
        ) : (
          <SupportTranscript
            messages={messages}
            selfRole="user"
            emptyText="Напиши, если завис платёж, не пришёл файл или что-то сломалось. История останется в аккаунте."
          />
        )}
        {error && (
          <p className="border-t border-white/10 px-4 py-2 text-sm text-red-300">{error}</p>
        )}
        <SupportComposer
          onSend={send}
          sending={sending || loading}
          placeholder="Коротко, что случилось"
        />
      </section>
    </div>
  );
};

export default SupportPageV2;
