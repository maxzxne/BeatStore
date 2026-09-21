import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { formatRub } from '../utils/checkout';
import { Users, Music, ShoppingBag, Banknote, Loader2, ArrowUpRight } from 'lucide-react';

function recentDayRows(byDay, limit = 5) {
  return Object.entries(byDay || {})
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, limit)
    .map(([day, count]) => ({ day, count }));
}

const AdminDashboard = () => {
  const { isAdminAuthenticated } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchAnalytics();
    }
  }, [isAdminAuthenticated]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/analytics');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
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
        Загрузка аналитики…
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="admin-empty">Ошибка загрузки аналитики</div>
    );
  }

  const stats = [
    { title: 'Пользователи', value: analytics.total_users, icon: Users, to: '/admin/users', hint: 'Всего' },
    { title: 'Биты', value: analytics.total_beats, icon: Music, to: '/admin/beats', hint: 'В каталоге' },
    { title: 'Покупки', value: analytics.total_purchases, icon: ShoppingBag, to: '/admin/purchases', hint: 'Всего' },
    {
      title: 'Доход битов',
      value: formatRub(analytics.total_revenue),
      icon: Banknote,
      to: '/admin/revenue',
      hint: '30 дней',
    },
  ];

  const registrations = Object.values(analytics.registrations_by_day || {}).reduce((a, b) => a + b, 0);
  const purchases = Object.values(analytics.purchases_by_day || {}).reduce((a, b) => a + b, 0);
  const recentPurchases = recentDayRows(analytics.purchases_by_day);
  const recentRegs = recentDayRows(analytics.registrations_by_day);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Панель</h1>
        <p className="admin-page-sub">Обзор за 30 дней · клик по карточке открывает раздел</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.title}
              to={stat.to}
              className="group rounded-2xl border border-white/10 bg-black/30 p-5 transition hover:border-[#22c55e]/40 hover:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-white/45">{stat.title}</p>
                  <p className="mt-1 font-[Syne] text-2xl font-bold text-white">{stat.value}</p>
                  <p className="mt-1 text-[11px] text-white/35">{stat.hint}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="admin-stat-icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-white/25 transition group-hover:text-[#22c55e]" aria-hidden />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/35">
            Типы покупок
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
                <span className="text-sm text-white/80">Бесплатные</span>
              </div>
              <span className="font-semibold text-white">{analytics.free_purchases}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
                <span className="text-sm text-white/80">Платные</span>
              </div>
              <span className="font-semibold text-white">{analytics.paid_purchases}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/35">
              За 30 дней
            </h2>
            <Link to="/admin/revenue" className="text-xs text-[#22c55e] hover:underline">
              Доходы →
            </Link>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm text-white/80">Регистрации</span>
              <span className="font-semibold text-white">{registrations}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm text-white/80">Покупки битов</span>
              <span className="font-semibold text-white">{purchases}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/35">
            Покупки по дням
          </h2>
          {recentPurchases.length === 0 ? (
            <p className="text-sm text-white/40">За 30 дней покупок не было</p>
          ) : (
            <ul className="space-y-2">
              {recentPurchases.map((row) => (
                <li
                  key={row.day}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm"
                >
                  <span className="text-white/60">{row.day}</span>
                  <span className="font-semibold text-white">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/35">
            Регистрации по дням
          </h2>
          {recentRegs.length === 0 ? (
            <p className="text-sm text-white/40">За 30 дней регистраций не было</p>
          ) : (
            <ul className="space-y-2">
              {recentRegs.map((row) => (
                <li
                  key={row.day}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm"
                >
                  <span className="text-white/60">{row.day}</span>
                  <span className="font-semibold text-white">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
