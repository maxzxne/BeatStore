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
    const chartWidth = Math.max(600, days.length * 60); // Минимальная ширина 600px, или 60px на день

    // Вычисляем координаты точек
    const points = days.map((day, index) => {
      const value = stats.revenue_by_day[day];
      const x = (index / (days.length - 1 || 1)) * (chartWidth - 40) + 20; // Отступы по 20px с каждой стороны
      const y = chartHeight - (value / maxValue) * (chartHeight - 40) - 20; // Отступы по 20px снизу и сверху
      return { x, y, value, day };
    });

    // Создаем путь для линии
    const pathData = points.map((point, index) => {
      return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
    }).join(' ');

    return (
      <div className="space-y-2">
        <div className="relative" style={{ height: `${chartHeight}px`, width: '100%', overflowX: 'auto' }}>
          <svg 
            width={chartWidth} 
            height={chartHeight} 
            className="border-b border-l border-gray-300"
            style={{ minWidth: '100%' }}
          >
            {/* Сетка (опционально) */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = chartHeight - (ratio * (chartHeight - 40)) - 20;
              const value = maxValue * ratio;
              return (
                <g key={ratio}>
                  <line
                    x1="20"
                    y1={y}
                    x2={chartWidth - 20}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x="10"
                    y={y + 4}
                    fontSize="10"
                    fill="#6b7280"
                    textAnchor="end"
                  >
                    {formatCurrency(value)}
                  </text>
                </g>
              );
            })}

            {/* Линия графика */}
            <path
              d={pathData}
              fill="none"
              stroke="#000"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Точки */}
            {points.map((point, index) => {
              const date = new Date(point.day);
              const dayLabel = date.getDate();
              const monthLabel = date.toLocaleDateString('ru-RU', { month: 'short' });
              
              return (
                <g key={point.day} className="group">
                  {/* Точка */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#000"
                    stroke="#fff"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-6 transition-all"
                  />
                  
                  {/* Подпись даты */}
                  <text
                    x={point.x}
                    y={chartHeight - 5}
                    fontSize="10"
                    fill="#6b7280"
                    textAnchor="middle"
                    transform={`rotate(-45 ${point.x} ${chartHeight - 5})`}
                  >
                    {dayLabel} {monthLabel}
                  </text>

                  {/* Tooltip при наведении */}
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <rect
                      x={point.x - 40}
                      y={point.y - 30}
                      width="80"
                      height="20"
                      fill="#000"
                      rx="4"
                    />
                    <text
                      x={point.x}
                      y={point.y - 15}
                      fontSize="10"
                      fill="#fff"
                      textAnchor="middle"
                    >
                      {formatCurrency(point.value)}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
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

