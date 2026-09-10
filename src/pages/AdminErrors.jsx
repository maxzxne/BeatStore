import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { AlertTriangle, Calendar, Filter } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import DatePicker from '../components/DatePicker';

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
      'auth': 'bg-red-500/15 text-red-300',
      'registration': 'bg-amber-500/15 text-amber-300',
      'purchase': 'bg-yellow-500/15 text-yellow-300',
      'payment': 'bg-white/10 text-white/70',
      'unknown': 'bg-white/10 text-white/50'
    };
    return colors[type] || 'bg-white/10 text-white/50';
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
        <div className="admin-empty py-16">
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
            className="border-b border-l border-white/10"
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
                  stroke='rgba(255,255,255,0.08)'
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
                  fill='rgba(255,255,255,0.45)'
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
                  fill='rgba(255,255,255,0.45)'
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
      <div className="admin-loading">
        Загрузка ошибок…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Ошибки</h1>
        <p className="admin-page-sub">Авторизация, регистрация, покупки и оплата</p>
      </div>

      {/* Фильтры */}
      <div className="rounded-2xl border border-white/10 bg-black/30">
        <div className="p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-white/45 mb-1">Период:</label>
              <div className="flex gap-2">
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="С дд.мм.гггг"
                  className="flex-1"
                />
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="По дд.мм.гггг"
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-white/45 mb-1">Тип ошибки:</label>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/30">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/45 mb-1">Всего ошибок</p>
                  <p className="text-2xl font-bold text-white">
                    {stats.total_errors || 0}
                  </p>
                </div>
                <div className="bg-red-500/20 rounded-xl p-3 flex items-center justify-center self-center">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {Object.entries(stats.errors_by_type || {}).map(([type, count]) => (
            <div key={type} className="rounded-2xl border border-white/10 bg-black/30">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/45 mb-1">{getErrorTypeLabel(type)}</p>
                    <p className="text-2xl font-bold text-white">{count}</p>
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
      <div className="rounded-2xl border border-white/10 bg-black/30">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-white/45" />
            <h2 className="text-xl font-semibold text-white">График ошибок</h2>
          </div>
          {renderChart()}
        </div>
      </div>

      {/* Список ошибок */}
      <div className="rounded-2xl border border-white/10 bg-black/30">
        <div className="p-5">
          <h2 className="text-xl font-semibold text-white mb-4">Последние ошибки</h2>
          
          {errors.length === 0 ? (
            <div className="text-center py-8 text-white/40">
              Ошибок не найдено
            </div>
          ) : (
            <div className="space-y-2">
              {errors.map((error) => (
                <div
                  key={error.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4 cursor-pointer transition-colors hover:bg-white/[0.04]"
                  onClick={() => setSelectedError(selectedError?.id === error.id ? null : error)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getErrorTypeColor(error.error_type)}`}>
                          {getErrorTypeLabel(error.error_type)}
                        </span>
                        <span className="text-sm text-white/45">{formatDate(error.created_at)}</span>
                      </div>
                      <p className="text-white font-medium mb-1">{error.error_message}</p>
                      {error.endpoint && (
                        <p className="text-sm text-white/45">Endpoint: {error.endpoint}</p>
                      )}
                      {selectedError?.id === error.id && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          {error.error_details && (
                            <div className="mb-2">
                              <p className="text-xs text-white/40 mb-1">Детали:</p>
                              <pre className="text-xs bg-black/40 border border-white/10 p-3 rounded-xl overflow-auto max-h-40 text-white/70">
                                {error.error_details}
                              </pre>
                            </div>
                          )}
                          {error.user_id && (
                            <p className="text-xs text-white/45">User ID: {error.user_id}</p>
                          )}
                          {error.ip_address && (
                            <p className="text-xs text-white/45">IP: {error.ip_address}</p>
                          )}
                          {error.user_agent && (
                            <p className="text-xs text-white/45 truncate">User-Agent: {error.user_agent}</p>
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



