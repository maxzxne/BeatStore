import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { AlertTriangle, Calendar, Filter } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

const AdminErrors = () => {
  const { isAdminAuthenticated } = useAuth();
  const [errors, setErrors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [errorTypeFilter, setErrorTypeFilter] = useState('');
  const [selectedError, setSelectedError] = useState(null);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchErrors();
      fetchErrorStats();
    }
  }, [isAdminAuthenticated, startDate, endDate, errorTypeFilter]);

  const fetchErrors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (errorTypeFilter) params.append('error_type', errorTypeFilter);
      
      const response = await api.get(`/api/admin/errors?${params.toString()}`);
      setErrors(response.data);
    } catch (error) {
      console.error('Error fetching errors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchErrorStats = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const response = await api.get(`/api/admin/errors/stats?${params.toString()}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching error stats:', error);
    }
  };

  const getErrorTypeLabel = (type) => {
    const labels = {
      'auth': 'Авторизация',
      'registration': 'Регистрация',
      'purchase': 'Покупка',
      'payment': 'Оплата',
      'unknown': 'Неизвестно'
    };
    return labels[type] || type;
  };

  const getErrorTypeColor = (type) => {
    const colors = {
      'auth': 'bg-red-100 text-red-800',
      'registration': 'bg-orange-100 text-orange-800',
      'purchase': 'bg-yellow-100 text-yellow-800',
      'payment': 'bg-purple-100 text-purple-800',
      'unknown': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderChart = () => {
    if (!stats || !stats.errors_by_day || Object.keys(stats.errors_by_day).length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-neutral-500">
          Нет данных для отображения графика
        </div>
      );
    }

    const days = Object.keys(stats.errors_by_day).sort();
    const values = days.map(day => stats.errors_by_day[day]);
    const maxValue = Math.max(...values, 1);
    const chartHeight = 300;
    const chartWidth = Math.max(600, days.length * 60);

    const leftPadding = 60;
    const bottomPadding = 40;
    const topPadding = 20;
    const rightPadding = 20;
    
    const points = days.map((day, index) => {
      const value = stats.errors_by_day[day];
      const x = (index / (days.length - 1 || 1)) * (chartWidth - leftPadding - rightPadding) + leftPadding;
      const y = chartHeight - (value / maxValue) * (chartHeight - topPadding - bottomPadding) - bottomPadding;
      return { x, y, value, day };
    });

    const pathData = points.map((point, index) => {
      return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
    }).join(' ');

    return (
      <div className="space-y-2">
        <div className="relative" style={{ height: `${chartHeight}px`, width: '100%', overflowX: 'auto' }}>
          <svg 
            width={chartWidth} 
            height={chartHeight} 
            className="border-b border-l border-gray-300 dark:border-neutral-700"
            style={{ minWidth: '100%' }}
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
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              );
            })}

            {/* Линия графика */}
            <path
              d={pathData}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
            />

            {/* Точки */}
            {points.map((point, index) => (
              <g key={index}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="#ef4444"
                />
                <title>{`${point.day}: ${point.value} ошибок`}</title>
              </g>
            ))}

            {/* Ось Y - значения */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const value = Math.round(ratio * maxValue);
              const y = chartHeight - (ratio * (chartHeight - topPadding - bottomPadding)) - bottomPadding;
              return (
                <text
                  key={ratio}
                  x={leftPadding - 10}
                  y={y + 5}
                  textAnchor="end"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {value}
                </text>
              );
            })}

            {/* Ось X - даты */}
            {days.map((day, index) => {
              const point = points[index];
              if (!point) return null;
              const date = new Date(day);
              const dateStr = `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
              return (
                <text
                  key={index}
                  x={point.x}
                  y={chartHeight - bottomPadding + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6b7280"
                >
                  {dateStr}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  if (loading && !stats) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600 dark:text-neutral-400">Загрузка ошибок...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Мониторинг ошибок</h1>
      <p className="text-gray-600 dark:text-neutral-400 mb-6">Статистика ошибок авторизации, регистрации, покупок и оплаты</p>

      {/* Фильтры */}
      <div className="card mb-6">
        <div className="card-content">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-600 dark:text-neutral-400 mb-1">Период:</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input input-bordered flex-1"
                  placeholder="С дд.мм.гггг"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input input-bordered flex-1"
                  placeholder="По дд.мм.гггг"
                />
              </div>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-600 dark:text-neutral-400 mb-1">Тип ошибки:</label>
              <CustomSelect
                value={errorTypeFilter}
                onChange={setErrorTypeFilter}
                options={[
                  { value: '', label: 'Все типы' },
                  { value: 'auth', label: 'Авторизация' },
                  { value: 'registration', label: 'Регистрация' },
                  { value: 'purchase', label: 'Покупка' },
                  { value: 'payment', label: 'Оплата' },
                  { value: 'unknown', label: 'Неизвестно' }
                ]}
                placeholder="Все типы"
                className="input-bordered"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Статистические карточки */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <div className="card">
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-neutral-400 mb-1">Всего ошибок</p>
                  <p className="text-2xl font-bold text-black dark:text-white">
                    {stats.total_errors || 0}
                  </p>
                </div>
                <div className="bg-red-500 rounded-full p-3 flex items-center justify-center self-center">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {Object.entries(stats.errors_by_type || {}).map(([type, count]) => (
            <div key={type} className="card">
              <div className="card-content">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-neutral-400 mb-1">{getErrorTypeLabel(type)}</p>
                    <p className="text-2xl font-bold text-black dark:text-white">{count}</p>
                  </div>
                  <div className={`rounded-full p-3 flex items-center justify-center self-center ${getErrorTypeColor(type)}`}>
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* График ошибок */}
      <div className="card mb-6">
        <div className="card-content">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600 dark:text-neutral-400" />
            <h2 className="text-xl font-semibold text-black dark:text-white">График ошибок</h2>
          </div>
          {renderChart()}
        </div>
      </div>

      {/* Список ошибок */}
      <div className="card">
        <div className="card-content">
          <h2 className="text-xl font-semibold text-black dark:text-white mb-4">Последние ошибки</h2>
          
          {errors.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-neutral-500">
              Ошибок не найдено
            </div>
          ) : (
            <div className="space-y-2">
              {errors.map((error) => (
                <div
                  key={error.id}
                  className="border border-gray-200 dark:border-neutral-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                  onClick={() => setSelectedError(selectedError?.id === error.id ? null : error)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getErrorTypeColor(error.error_type)}`}>
                          {getErrorTypeLabel(error.error_type)}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-neutral-400">{formatDate(error.created_at)}</span>
                      </div>
                      <p className="text-black dark:text-white font-medium mb-1">{error.error_message}</p>
                      {error.endpoint && (
                        <p className="text-sm text-gray-600 dark:text-neutral-400">Endpoint: {error.endpoint}</p>
                      )}
                      {selectedError?.id === error.id && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-neutral-700">
                          {error.error_details && (
                            <div className="mb-2">
                              <p className="text-xs text-gray-500 dark:text-neutral-500 mb-1">Детали:</p>
                              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                                {error.error_details}
                              </pre>
                            </div>
                          )}
                          {error.user_id && (
                            <p className="text-xs text-gray-600 dark:text-neutral-400">User ID: {error.user_id}</p>
                          )}
                          {error.ip_address && (
                            <p className="text-xs text-gray-600 dark:text-neutral-400">IP: {error.ip_address}</p>
                          )}
                          {error.user_agent && (
                            <p className="text-xs text-gray-600 dark:text-neutral-400 truncate">User-Agent: {error.user_agent}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminErrors;



