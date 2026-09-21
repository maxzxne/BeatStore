import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { formatRub } from '../utils/checkout';
import {
  fillDaySeries,
  formatDeltaPct,
  periodTrend,
  sumDayMap,
} from '../utils/adminDashboardMetrics';
import AdminSparkline from '../components/AdminSparkline';
import {
  Users,
  Music,
  ShoppingBag,
  Banknote,
  Loader2,
  ArrowUpRight,
  Inbox,
  FileText,
  MessageCircle,
} from 'lucide-react';

function DayBars({ rows, emptyLabel }) {
  if (!rows.length) {
    return <p className="text-sm text-white/40">{emptyLabel}</p>;
  }
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.day} className="flex items-center gap-3 text-sm">
          <span className="w-[5.5rem] shrink-0 tabular-nums text-white/55">{row.day}</span>
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#22c55e]/80 transition-[width] duration-200"
              style={{ width: `${Math.max(6, (row.count / max) * 100)}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right font-semibold tabular-nums text-white">{row.count}</span>
        </li>
      ))}
    </ul>
  );
}

function TrendHint({ trend }) {
  if (!trend) return null;
  const label = formatDeltaPct(trend);
  const color =
    trend.direction === 'up'
      ? 'text-[#22c55e]'
      : trend.direction === 'down'
        ? 'text-red-300'
        : 'text-white/35';
  return (
    <p className={`mt-1 text-[11px] tabular-nums ${color}`}>
      7д {label}
      <span className="text-white/30"> · vs пред. 7д</span>
    </p>
  );
}

const AdminDashboard = () => {
  const { isAdminAuthenticated } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inbox, setInbox] = useState({ submissions: 0, orders: 0, unread: 0 });

  useEffect(() => {
    if (!isAdminAuthenticated) return undefined;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/api/admin/analytics');
        if (!cancelled) setAnalytics(data);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        if (!cancelled) setAnalytics(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    (async () => {
      try {
        const [subs, orders, threads] = await Promise.all([
          api.get('/api/admin/submissions', { params: { status: 'pending' } }),
          api.get('/api/admin/service-orders'),
          api.get('/api/admin/support/threads'),
        ]);
        if (cancelled) return;
        const pendingOrders = (orders.data || []).filter((o) => o.status === 'pending').length;
        const unread = (threads.data || []).reduce((a, t) => a + (t.unread_for_admin || 0), 0);
        setInbox({
          submissions: (subs.data || []).length,
          orders: pendingOrders,
          unread,
        });
      } catch {
        /* inbox is secondary */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdminAuthenticated]);

  const purchaseSeries = useMemo(
    () => fillDaySeries(analytics?.purchases_by_day, 30),
    [analytics],
  );
  const regSeries = useMemo(
    () => fillDaySeries(analytics?.registrations_by_day, 30),
    [analytics],
  );
  const purchaseTrend = useMemo(() => periodTrend(purchaseSeries, 7), [purchaseSeries]);
  const regTrend = useMemo(() => periodTrend(regSeries, 7), [regSeries]);
  const recentPurchases = useMemo(
    () => [...purchaseSeries].reverse().filter((r) => r.count > 0).slice(0, 5),
    [purchaseSeries],
  );
  const recentRegs = useMemo(
    () => [...regSeries].reverse().filter((r) => r.count > 0).slice(0, 5),
    [regSeries],
  );

  if (!isAdminAuthenticated) {
    return (
      <div className="py-12 text-center text-white/50">
        Доступ запрещен. Войдите как администратор.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div>
          <div className="h-8 w-40 animate-pulse rounded-lg bg-white/10" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-white/5" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl border border-white/10 bg-white/5" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-black/30" />
          ))}
        </div>
        <div className="admin-loading">
          <Loader2 className="h-5 w-5 animate-spin" />
          Загрузка аналитики…
        </div>
      </div>
    );
  }

  if (!analytics) {
    return <div className="admin-empty">Ошибка загрузки аналитики</div>;
  }

  const registrations = sumDayMap(analytics.registrations_by_day);
  const purchases = sumDayMap(analytics.purchases_by_day);
  const inboxTotal = inbox.submissions + inbox.orders + inbox.unread;

  const stats = [
    {
      title: 'Пользователи',
      value: analytics.total_users,
      icon: Users,
      to: '/admin/users',
      hint: 'Всего',
      spark: regSeries.map((r) => r.count),
      trend: regTrend,
    },
    {
      title: 'Биты',
      value: analytics.total_beats,
      icon: Music,
      to: '/admin/beats',
      hint: 'В каталоге',
    },
    {
      title: 'Покупки',
      value: analytics.total_purchases,
      icon: ShoppingBag,
      to: '/admin/purchases',
      hint: 'Всего',
      spark: purchaseSeries.map((r) => r.count),
      trend: purchaseTrend,
    },
    {
      title: 'Доход битов',
      value: formatRub(analytics.total_revenue),
      icon: Banknote,
      to: '/admin/revenue',
      hint: '30 дней',
      spark: purchaseSeries.map((r) => r.count),
      trend: purchaseTrend,
    },
  ];

  const inboxItems = [
    {
      to: '/admin/submissions',
      label: 'На проверке',
      count: inbox.submissions,
      icon: Inbox,
    },
    {
      to: '/admin/orders',
      label: 'Новые заявки',
      count: inbox.orders,
      icon: FileText,
    },
    {
      to: '/admin/support',
      label: 'Непрочитано',
      count: inbox.unread,
      icon: MessageCircle,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Панель</h1>
        <p className="admin-page-sub">Обзор за 30 дней · клик по карточке открывает раздел</p>
      </div>

      <div className="admin-inbox-strip" role="region" aria-label="Очередь действий">
        {inboxItems.map((item) => {
          const Icon = item.icon;
          const hot = item.count > 0;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`admin-inbox-chip ${hot ? 'is-hot' : ''}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{item.label}</span>
              <span className="admin-inbox-count tabular-nums">{item.count}</span>
            </Link>
          );
        })}
        {inboxTotal === 0 ? (
          <p className="text-xs text-white/35 sm:ml-auto">Очередь пуста — можно в каталог или доходы</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.title}
              to={stat.to}
              className="group rounded-2xl border border-white/10 bg-black/30 p-4 transition duration-200 hover:border-[#22c55e]/40 hover:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">{stat.title}</p>
                  <p className="mt-1 font-[Syne] text-2xl font-bold tabular-nums text-white">{stat.value}</p>
                  <p className="mt-0.5 text-[11px] text-white/35">{stat.hint}</p>
                  {stat.trend ? <TrendHint trend={stat.trend} /> : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="admin-stat-icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight
                    className="h-4 w-4 text-white/25 transition group-hover:text-[#22c55e]"
                    aria-hidden
                  />
                </div>
              </div>
              {stat.spark ? (
                <div className="mt-3">
                  <AdminSparkline values={stat.spark} />
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
            Типы покупок
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                <span className="text-sm text-white/80">Бесплатные</span>
              </div>
              <span className="font-semibold tabular-nums text-white">{analytics.free_purchases}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-white/40" />
                <span className="text-sm text-white/80">Платные</span>
              </div>
              <span className="font-semibold tabular-nums text-white">{analytics.paid_purchases}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
              За 30 дней
            </h2>
            <Link to="/admin/revenue" className="text-xs text-[#22c55e] hover:underline">
              Доходы →
            </Link>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <span className="text-sm text-white/80">Регистрации</span>
              <span className="font-semibold tabular-nums text-white">{registrations}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <span className="text-sm text-white/80">Покупки битов</span>
              <span className="font-semibold tabular-nums text-white">{purchases}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
            Покупки по дням
          </h2>
          <DayBars rows={recentPurchases} emptyLabel="За 30 дней покупок не было" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
            Регистрации по дням
          </h2>
          <DayBars rows={recentRegs} emptyLabel="За 30 дней регистраций не было" />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
