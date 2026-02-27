import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../utils/api';
import { Music, GraduationCap, FileText, TrendingUp, Calendar } from 'lucide-react';
import DatePicker from '../components/DatePicker';

const AdminRevenue = () => {
  const { isAdminAuthenticated } = useAuth();
  const { isDarkMode } = useTheme();
  const isDark = isDarkMode;
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

  // Компактный формат для подписей оси (чтобы не наезжали)
  const formatAxisLabel = (amount) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M ₽`;
    if (amount >= 1000) return `${Math.round(amount / 1000)}K ₽`;
    return `${amount} ₽`;
  };

  const renderChart = () => {
    if (!stats || !stats.revenue_by_day || Object.keys(stats.revenue_by_day).length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-neutral-500">
          Нет данных для отображения графика
        </div>
      );
    }

    const days = Object.keys(stats.revenue_by_day).sort();
    const values = days.map(day => stats.revenue_by_day[day]);
    const maxValue = Math.max(...values, 1);
    const chartHeight = 420;
    const chartWidth = Math.max(800, days.length * 90); // Минимальная ширина 800px, 90px на день

    // Отступы для подписей (увеличены, чтобы текст не наезжал)
    const leftPadding = 75;
    const bottomPadding = 55;
    const topPadding = 30;
    const rightPadding = 30;
    
    const points = days.map((day, index) => {
      const value = stats.revenue_by_day[day];
      const x = (index / (days.length - 1 || 1)) * (chartWidth - leftPadding - rightPadding) + leftPadding;
      const y = chartHeight - (value / maxValue) * (chartHeight - topPadding - bottomPadding) - bottomPadding;
      return { x, y, value, day };
    });

    // Создаем путь для линии с учетом новых отступов
    const pathData = points.map((point, index) => {
      return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
    }).join(' ');

    return (
      <div className="space-y-2">
        <div className="relative overflow-x-auto overflow-y-hidden rounded-lg" style={{ minHeight: `${chartHeight}px` }}>
          <svg 
            width={chartWidth} 
            height={chartHeight} 
            className="border-b border-l border-gray-300 dark:border-neutral-700 shrink-0"
          >
            {/* Сетка */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = chartHeight - (ratio * (chartHeight - topPadding - bottomPadding)) - bottomPadding;
              return (
                <line
                  key={ratio}
                  x1={leftPadding}
                  y1={y}
                  x2={chartWidth - rightPadding}
                  y2={y}
                  stroke={isDark ? '#404040' : '#e5e7eb'}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Линия графика */}
            <path
              d={pathData}
              fill="none"
              stroke={isDark ? '#fff' : '#000'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Подписи на оси Y — компактный формат, увеличенные отступы */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = chartHeight - (ratio * (chartHeight - topPadding - bottomPadding)) - bottomPadding;
              const value = Math.round(maxValue * ratio);
              const label = formatAxisLabel(value);
              return (
                <g key={`label-${ratio}`}>
                  <rect
                    x="2"
                    y={y - 10}
                    width="68"
                    height="20"
                    fill={isDark ? '#262626' : '#fff'}
                    opacity="0.98"
                    rx="3"
                    stroke={isDark ? '#404040' : '#e5e7eb'}
                    strokeWidth="0.5"
                  />
                  <text
                    x="65"
                    y={y + 5}
                    fontSize="12"
                    fill={isDark ? '#fff' : '#000'}
                    fontWeight="500"
                    textAnchor="end"
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* Точки и подписи дат */}
            {points.map((point, index) => {
              const date = new Date(point.day);
              const dayLabel = date.getDate();
              const monthLabel = date.toLocaleDateString('ru-RU', { month: 'short' });
              const dateStr = `${dayLabel} ${monthLabel}`;
              const isLast = index === points.length - 1;
              const isFirst = index === 0;
              const showLabel = points.length <= 12 || isFirst || isLast || index % Math.ceil(points.length / 6) === 0;
              
              return (
                <g key={point.day} className="group">
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill={isDark ? '#fff' : '#000'}
                    stroke={isDark ? '#000' : '#fff'}
                    strokeWidth="2"
                    className="cursor-pointer transition-all"
                  />
                  
                  {/* Подпись даты — показываем не все при большом количестве точек */}
                  {showLabel && (
                    <g>
                      <rect
                        x={point.x - 28}
                        y={chartHeight - bottomPadding + 5}
                        width="56"
                        height="18"
                        fill={isDark ? '#262626' : '#fff'}
                        opacity="0.98"
                        rx="3"
                        stroke={isDark ? '#404040' : '#e5e7eb'}
                        strokeWidth="0.5"
                      />
                      <text
                        x={point.x}
                        y={chartHeight - bottomPadding + 17}
                        fontSize="10"
                        fill={isDark ? '#fff' : '#000'}
                        fontWeight="500"
                        textAnchor="middle"
                      >
                        {dateStr}
                      </text>
                    </g>
                  )}

                  {/* Tooltip при наведении */}
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {(() => {
                      // Вычисляем позицию tooltip, чтобы он не выходил за границы
                      const tooltipWidth = 105;
                      const tooltipHeight = 24;
                      const padding = 5;
                      
                      let tooltipX = point.x - tooltipWidth / 2;
                      let tooltipY = point.y - tooltipHeight - 8;
                      
                      // Проверяем левую границу
                      if (tooltipX < padding) {
                        tooltipX = padding;
                      }
                      // Проверяем правую границу
                      if (tooltipX + tooltipWidth > chartWidth - padding) {
                        tooltipX = chartWidth - tooltipWidth - padding;
                      }
                      // Проверяем верхнюю границу
                      if (tooltipY < padding) {
                        tooltipY = point.y + 8; // Показываем снизу от точки
                      }
                      // Проверяем нижнюю границу
                      if (tooltipY + tooltipHeight > chartHeight - padding) {
                        tooltipY = chartHeight - tooltipHeight - padding;
                      }
                      
                      return (
                        <>
                          <rect
                            x={tooltipX}
                            y={tooltipY}
                            width={tooltipWidth}
                            height={tooltipHeight}
                            fill={isDark ? '#fff' : '#000'}
                            rx="4"
                            stroke={isDark ? '#404040' : '#fff'}
                            strokeWidth="1"
                          />
                          <text
                            x={tooltipX + tooltipWidth / 2}
                            y={tooltipY + tooltipHeight / 2 + 4}
                            fontSize="11"
                            fill={isDark ? '#000' : '#fff'}
                            fontWeight="600"
                            textAnchor="middle"
                          >
                            {formatCurrency(point.value)}
                          </text>
                        </>
                      );
                    })()}
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
        <div className="text-gray-600 dark:text-neutral-400">Доступ запрещен. Войдите как администратор.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-neutral-400">Загрузка статистики...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Доходы</h1>
        <p className="text-gray-600 dark:text-neutral-400">Статистика продаж и доходов</p>
      </div>

      {/* Фильтр по датам */}
      <div className="card mb-6">
        <div className="card-content">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-600 dark:text-neutral-400" />
              <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">Период:</label>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-neutral-400">С</label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="ДД.ММ.ГГГГ"
                className="w-auto min-w-[140px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-neutral-400">По</label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="ДД.ММ.ГГГГ"
                className="w-auto min-w-[140px]"
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
                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-1">Общий доход</p>
                <p className="text-2xl font-bold text-black dark:text-white">
                  {stats ? formatCurrency(stats.total_revenue) : '0 ₽'}
                </p>
              </div>
              <div className="bg-black rounded-full p-3 flex items-center justify-center self-center">
                <span className="text-white text-xl font-bold leading-none">₽</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-1">Продано битов</p>
                <p className="text-2xl font-bold text-black dark:text-white">
                  {stats ? stats.beat_count : 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
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
                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-1">Продано курсов</p>
                <p className="text-2xl font-bold text-black dark:text-white">
                  {stats ? stats.course_count : 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
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
                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-1">Выполнено заказов</p>
                <p className="text-2xl font-bold text-black dark:text-white">
                  {stats ? stats.order_count : 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
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
            <TrendingUp className="h-5 w-5 text-black dark:text-white" />
            <h2 className="text-lg font-semibold text-black dark:text-white">График доходов</h2>
          </div>
        </div>
        <div className="card-content overflow-x-auto">
          {renderChart()}
        </div>
      </div>
    </div>
  );
};

export default AdminRevenue;



