import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';

export const SUPPORT_POLL_MS = 4000;
export const SUPPORT_MAX_LEN = 2000;

export function formatSupportTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function mergeMessages(prev, incoming) {
  const map = new Map();
  [...(prev || []), ...(incoming || [])].forEach((item) => {
    if (item?.id != null) map.set(item.id, item);
  });
  return [...map.values()].sort((a, b) => a.id - b.id);
}

export function SupportTranscript({ messages, selfRole, emptyText, peerLabel = 'Поддержка' }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    bottomRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' });
  }, [messages.length]);

  if (!messages.length) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
        <p className="max-w-sm text-sm leading-relaxed text-white/45">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
      {messages.map((message) => {
        const mine = message.author_role === selfRole;
        return (
          <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                mine
                  ? 'bg-[#22c55e] text-[#052e16]'
                  : 'border border-white/10 bg-white/[0.06] text-white'
              }`}
            >
              {!mine && (
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  {peerLabel}
                </p>
              )}
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
              <p className={`mt-1 text-[10px] ${mine ? 'text-[#052e16]/55' : 'text-white/35'}`}>
                {formatSupportTime(message.created_at)}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

export function SupportComposer({ onSend, sending, placeholder }) {
  const [value, setValue] = useState('');
  const fieldId = React.useId();
  const remaining = SUPPORT_MAX_LEN - value.length;
  const canSend = value.trim().length > 0 && value.trim().length <= SUPPORT_MAX_LEN && !sending;

  const submit = async () => {
    if (!canSend) return;
    const body = value.trim();
    try {
      await onSend(body);
      setValue('');
    } catch {
      /* keep draft */
    }
  };

  return (
    <form
      className="border-t border-white/10 p-3 sm:p-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor={fieldId} className="sr-only">
        Сообщение
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id={fieldId}
          rows={2}
          maxLength={SUPPORT_MAX_LEN}
          value={value}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          className="min-h-[44px] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Отправить"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#22c55e] text-[#052e16] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      {remaining < 200 && (
        <p className="mt-1.5 text-right text-[11px] text-white/35">{remaining}</p>
      )}
    </form>
  );
}
