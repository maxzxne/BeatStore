import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { CONTACT_TYPES } from '../../utils/contacts';
import { formatMoscowDate, formatMoscowDateOnly } from '../../utils/dateUtils';

const LABELS = Object.fromEntries(CONTACT_TYPES.map((t) => [t.value, t.label]));

const SERVICE_STATUS_UI = {
  pending: { label: 'Новая', badge: 'admin-badge-warn' },
  confirmed: { label: 'Ждёт оплату', badge: 'admin-badge-warn' },
  paid: { label: 'В работе', badge: 'admin-badge-ok' },
  in_progress: { label: 'В работе', badge: 'admin-badge-ok' },
  completed: { label: 'Сдано', badge: 'admin-badge-ok' },
  cancelled: { label: 'Отменено', badge: 'admin-badge-err' },
};

const PURCHASE_TYPE_LABELS = {
  mp3: 'MP3',
  wav: 'WAV',
  exclusive: 'Эксклюзив',
};

const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`;

const contactHref = (type, value) => {
  const v = String(value || '').trim();
  if (!v) return null;
  if (type === 'telegram') {
    const handle = v.replace(/^@/, '');
    if (/^https?:\/\//i.test(v)) return v;
    return `https://t.me/${handle}`;
  }
  if (type === 'whatsapp') {
    const digits = v.replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : null;
  }
  if (type === 'phone') {
    const digits = v.replace(/[^\d+]/g, '');
    return digits ? `tel:${digits}` : null;
  }
  if (/^https?:\/\//i.test(v)) return v;
  return null;
};

const typeLabel = (type) => {
  if (type === 'beat') return 'Бит';
  if (type === 'course') return 'Курс';
  if (type === 'service') return 'Услуга';
  return type;
};

const historyDetail = (row) => {
  if (row.type === 'beat' && row.meta?.purchase_type) {
    const key = String(row.meta.purchase_type).toLowerCase();
    return { text: PURCHASE_TYPE_LABELS[key] || row.meta.purchase_type, badge: null };
  }
  if (row.type === 'service' && row.meta?.status) {
    const ui = SERVICE_STATUS_UI[row.meta.status];
    return {
      text: ui?.label || row.meta.status,
      badge: ui?.badge || null,
    };
  }
  return { text: '—', badge: null };
};

const AdminUserDetailPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { isAdminAuthenticated } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingChat, setOpeningChat] = useState(false);

  useEffect(() => {
    if (!isAdminAuthenticated || !userId) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/api/admin/users/${userId}`);
        if (!cancelled) setUser(data);
      } catch (err) {
        if (!cancelled) {
          setUser(null);
          setError(err.response?.status === 404 ? 'Пользователь не найден' : 'Не удалось загрузить');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isAdminAuthenticated, userId]);

  const openSupport = async () => {
    if (!user) return;
    setOpeningChat(true);
    setError('');
    try {
      const { data } = await api.post(`/api/admin/users/${user.id}/support-thread`);
      navigate(`/admin/support?threadId=${data.thread_id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Не удалось открыть чат');
    } finally {
      setOpeningChat(false);
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
        Загрузка…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> К списку
        </Link>
        <p className="text-red-300">{error || 'Не найдено'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/admin/users" className="mb-3 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Пользователи
          </Link>
          <h1 className="admin-page-title flex flex-wrap items-center gap-2">
            {user.username}
            {user.is_admin ? (
              <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-white/50">
                Админ
              </span>
            ) : null}
          </h1>
          <p className="admin-page-sub">
            {user.email || 'без email'}
            {user.oauth_provider ? ` · ${user.oauth_provider}` : ''}
            {user.created_at ? ` · с ${formatMoscowDate(user.created_at)}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={openSupport}
          disabled={openingChat}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#22c55e] px-4 py-2.5 text-sm font-semibold text-[#052e16] transition hover:bg-[#16a34a] disabled:opacity-60"
        >
          {openingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          Написать в поддержку
        </button>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'LTV', value: formatMoney(user.totals?.ltv) },
          { label: 'Биты', value: user.totals?.beats ?? 0 },
          { label: 'Курсы', value: user.totals?.courses ?? 0 },
          { label: 'Услуги', value: user.totals?.services ?? 0 },
        ].map((card) => (
          <div key={card.label} className="admin-panel px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{card.label}</p>
            <p className="mt-1 text-xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="admin-panel space-y-3 p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/40">Контакты</h2>
        {(user.contacts || []).length === 0 ? (
          <p className="text-sm text-white/40">Не указаны</p>
        ) : (
          <ul className="space-y-2">
            {user.contacts.map((c, idx) => {
              const href = contactHref(c.type, c.value);
              return (
                <li key={`${c.type}-${idx}`} className="text-sm text-white/80">
                  <span className="text-white/40">{LABELS[c.type] || c.type}: </span>
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer" className="text-[#22c55e] hover:underline">
                      {c.value}
                    </a>
                  ) : (
                    c.value
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="admin-panel overflow-hidden">
        <h2 className="px-4 pt-4 text-sm font-semibold uppercase tracking-[0.14em] text-white/40 sm:px-5 sm:pt-5">
          История
        </h2>
        {(user.history || []).length === 0 ? (
          <p className="px-4 pb-4 pt-3 text-sm text-white/40 sm:px-5">Покупок и заявок пока нет</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="admin-user-history min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Тип</th>
                  <th>Название</th>
                  <th className="text-right">Сумма</th>
                  <th>Дата</th>
                  <th>Детали</th>
                </tr>
              </thead>
              <tbody>
                {user.history.map((row) => {
                  const detail = historyDetail(row);
                  return (
                    <tr key={`${row.type}-${row.id}`}>
                      <td className="whitespace-nowrap text-white/50">{typeLabel(row.type)}</td>
                      <td className="max-w-[18rem] text-white sm:max-w-none">
                        {row.type === 'service' ? (
                          <Link to={`/admin/orders?id=${row.id}`} className="hover:text-[#22c55e]">
                            {row.title}
                          </Link>
                        ) : (
                          row.title || '—'
                        )}
                      </td>
                      <td className="whitespace-nowrap text-right tabular-nums text-white/80">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="whitespace-nowrap text-white/50">
                        {formatMoscowDateOnly(row.date)}
                      </td>
                      <td className="whitespace-nowrap">
                        {detail.badge ? (
                          <span className={`admin-badge ${detail.badge}`}>{detail.text}</span>
                        ) : (
                          <span className="text-white/50">{detail.text}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserDetailPage;
