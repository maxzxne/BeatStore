import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { DollarSign, Music, GraduationCap, FileText, TrendingUp, Calendar } from 'lucide-react';

const AdminRevenue = () => {
  const { isAdminAuthenticated } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchRevenueStats();
    }
  }, [isAdminAuthenticated, startDate, endDate]);

  const fetchRevenueStats = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const response = await api.get(`/api/admin/revenue?${params.toString()}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching revenue stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const renderChart = () => {
    if (!stats || !stats.revenue_by_day || Object.keys(stats.revenue_by_day).length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          Нет данных для отображения графика
        </div>
      );
    }

    const days = Object.keys(stats.revenue_by_day).sort();
    const values = days.map(day => stats.revenue_by_day[day]);
    const maxValue = Math.max(...values, 1);
    const chartHeight = 300;

    return (
      <div className="space-y-2">
        <div className="flex items-end gap-2 h-[300px] border-b border-l border-gray-300 pb-4 pl-4">
          {days.map((day, index) => {
            const value = stats.revenue_by_day[day];
            const height = (value / maxValue) * chartHeight;
            const date = new Date(day);
            const dayLabel = date.getDate();
            const monthLabel = date.toLocaleDateString('ru-RU', { month: 'short' });
            
            return (
              <div key={day} className="flex-1 flex flex-col items-center group relative">
                <div
                  className="w-full bg-black rounded-t transition-all hover:bg-gray-800 cursor-pointer"
                  style={{ height: `${height}px` }}
                  title={`${day}: ${formatCurrency(value)}`}
                />
                <div className="mt-2 text-xs text-gray-600 text-center transform -rotate-45 origin-top-left whitespace-nowrap">
                  {dayLabel} {monthLabel}
                </div>
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded pointer-events-none z-10">
                  {formatCurrency(value)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-500 px-4">
          <span>0 ₽</span>
          <span>{formatCurrency(maxValue)}</span>
        </div>
      </div>
    );
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">Доступ запрещен. Войдите как администратор.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Загрузка статистики...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Доходы</h1>
        <p className="text-gray-600">Статистика продаж и доходов</p>
      </div>

      {/* Фильтр по датам */}
      <div className="card mb-6">
        <div className="card-content">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-600" />
              <label className="text-sm font-medium text-gray-700">Период:</label>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">С</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">По</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input w-auto"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="btn btn-outline btn-sm"
              >
                Сбросить
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Статистические карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Общий доход</p>
                <p className="text-2xl font-bold text-black">
                  {stats ? formatCurrency(stats.total_revenue) : '0 ₽'}
                </p>
              </div>
              <div className="bg-black rounded-full p-3">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Продано битов</p>
                <p className="text-2xl font-bold text-black">
                  {stats ? stats.beat_count : 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats ? formatCurrency(stats.beat_revenue) : '0 ₽'}
                </p>
              </div>
              <div className="bg-black rounded-full p-3">
                <Music className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Продано курсов</p>
                <p className="text-2xl font-bold text-black">
                  {stats ? stats.course_count : 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats ? formatCurrency(stats.course_revenue) : '0 ₽'}
                </p>
              </div>
              <div className="bg-black rounded-full p-3">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Выполнено заказов</p>
                <p className="text-2xl font-bold text-black">
                  {stats ? stats.order_count : 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats ? formatCurrency(stats.order_revenue) : '0 ₽'}
                </p>
              </div>
              <div className="bg-black rounded-full p-3">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* График доходов */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-black" />
            <h2 className="text-lg font-semibold text-black">График доходов</h2>
          </div>
        </div>
        <div className="card-content">
          {renderChart()}
        </div>
      </div>
    </div>
  );
};

export default AdminRevenue;

