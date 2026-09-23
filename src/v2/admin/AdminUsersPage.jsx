import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import { formatMoscowDate } from '../../utils/dateUtils';
import CustomSelect from '../../components/CustomSelect';

const formatMoney = (value) =>
  `${Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`;

const SORT_OPTIONS = [
  { value: 'ltv', label: 'По LTV' },
  { value: 'created_at', label: 'По регистрации' },
  { value: 'last_purchase', label: 'По последней покупке' },
];

const AdminUsersPage = () => {
  const { isAdminAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('ltv');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (query, sortBy) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/admin/users', {
        params: { q: query || undefined, sort: sortBy, page: 1, page_size: 50 },
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setError('Не удалось загрузить пользователей');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdminAuthenticated) return undefined;
    const timer = window.setTimeout(() => {
      load(q.trim(), sort);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [isAdminAuthenticated, q, sort, load]);

  if (!isAdminAuthenticated) {
    return (
      <div className="py-12 text-center text-white/50">
        Доступ запрещен. Войдите как администратор.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Пользователи</h1>
        <p className="admin-page-sub">
          {total} {total === 1 ? 'аккаунт' : 'аккаунтов'} · LTV и контакты
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="admin-inline-search min-w-0 flex-1">
          <Search className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
          <span className="sr-only">Поиск пользователей</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск: логин, почта, telegram…"
            className="admin-inline-search-input"
            autoComplete="off"
          />
        </label>
        <div className="w-full shrink-0 sm:w-56">
          <CustomSelect
            id="admin-users-sort"
            options={SORT_OPTIONS}
            value={sort}
            onChange={setSort}
            aria-label="Сортировка"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="admin-panel">
        {loading ? (
          <div className="admin-loading">
            <Loader2 className="h-5 w-5 animate-spin" />
            Загрузка…
          </div>
        ) : items.length === 0 ? (
          <div className="admin-empty">
            <Users className="mx-auto mb-3 h-10 w-10 text-white/25" />
            {q.trim() ? 'Никого не найдено' : 'Пока нет пользователей'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th>Логин</th>
                  <th>Email</th>
                  <th>Регистрация</th>
                  <th>Покупок</th>
                  <th>LTV</th>
                  <th>Последняя покупка</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="cursor-pointer hover:bg-white/5">
                    <td>
                      <Link
                        to={`/admin/users/${row.id}`}
                        className="font-medium text-white hover:text-[#22c55e]"
                      >
                        {row.username}
                        {row.is_admin ? (
                          <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/50">
                            Админ
                          </span>
                        ) : null}
                      </Link>
                    </td>
                    <td className="text-white/60">{row.email || '—'}</td>
                    <td className="text-white/50">{formatMoscowDate(row.created_at)}</td>
                    <td className="text-white/80">{row.purchase_count}</td>
                    <td className="font-medium text-white">{formatMoney(row.ltv)}</td>
                    <td className="text-white/50">
                      {row.last_purchase_at ? formatMoscowDate(row.last_purchase_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
