import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Users, Music, ShoppingBag, Banknote, Loader2 } from 'lucide-react';

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
    { title: 'Пользователи', value: analytics.total_users, icon: Users },
    { title: 'Биты', value: analytics.total_beats, icon: Music },
    { title: 'Покупки', value: analytics.total_purchases, icon: ShoppingBag },
    {
      title: 'Доход',
      value: `${analytics.total_revenue.toFixed(0)} ₽`,
      icon: Banknote,
    },
  ];

  const registrations = Object.values(analytics.registrations_by_day || {}).reduce((a, b) => a + b, 0);
  const purchases = Object.values(analytics.purchases_by_day || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Панель</h1>
        <p className="admin-page-sub">Обзор XWinner.beats.please</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-white/45">{stat.title}</p>
                  <p className="mt-1 font-[Syne] text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className="admin-stat-icon">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
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
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/35">
            За последние дни
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm text-white/80">Регистрации</span>
              <span className="font-semibold text-white">{registrations}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm text-white/80">Покупки</span>
              <span className="font-semibold text-white">{purchases}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
