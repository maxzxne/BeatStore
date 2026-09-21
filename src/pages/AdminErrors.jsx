import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { AlertTriangle, Filter, ExternalLink } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import DatePicker from '../components/DatePicker';
import { DATE_PRESET_OPTIONS, datePresetRange, matchDatePreset } from '../utils/adminDatePresets';
import { groupErrorsByMessage } from '../utils/adminErrorGroups';

const ERROR_TYPES = [
  { value: '', label: 'Все типы' },
  { value: 'auth', label: 'Авторизация' },
  { value: 'registration', label: 'Регистрация' },
  { value: 'purchase', label: 'Покупка' },
  { value: 'payment', label: 'Оплата' },
  { value: 'unknown', label: 'Неизвестно' },
];

const AdminErrors = () => {
  const { isAdminAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [errors, setErrors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [errorTypeFilter, setErrorTypeFilter] = useState('');
  const [selectedError, setSelectedError] = useState(null);

  const activePreset = useMemo(
    () => matchDatePreset(startDate, endDate),
    [startDate, endDate],
  );

  useEffect(() => {
    if (!isAdminAuthenticated) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (errorTypeFilter) params.append('error_type', errorTypeFilter);
        const statsParams = new URLSearchParams();
        if (startDate) statsParams.append('start_date', startDate);
        if (endDate) statsParams.append('end_date', endDate);
        const [listRes, statsRes] = await Promise.all([
          api.get(`/api/admin/errors?${params.toString()}`),
          api.get(`/api/admin/errors/stats?${statsParams.toString()}`),
        ]);
        if (cancelled) return;
        setErrors(listRes.data || []);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Error fetching errors:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdminAuthenticated, startDate, endDate, errorTypeFilter]);

  useEffect(() => {
    const raw = searchParams.get('id');
    if (!raw || !errors.length) return;
    const id = Number(raw);
    if (!Number.isFinite(id)) return;
    const match = errors.find((e) => Number(e.id) === id);
    if (match) setSelectedError(match);
  }, [errors, searchParams]);

  const groups = useMemo(() => groupErrorsByMessage(errors), [errors]);

  const selectError = (error) => {
    setSelectedError(error);
    const params = new URLSearchParams(searchParams);
    if (error) params.set('id', String(error.id));
    else params.delete('id');
    setSearchParams(params, { replace: true });
  };

  const applyPreset = (preset) => {
    const range = datePresetRange(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const toggleTypeFilter = (type) => {
    setErrorTypeFilter((prev) => (prev === type ? '' : type));
  };

  const getErrorTypeLabel = (type) =>
    ERROR_TYPES.find((t) => t.value === type)?.label || type || 'Неизвестно';

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderChart = () => {
    if (!stats?.errors_by_day || Object.keys(stats.errors_by_day).length === 0) {
      return <div className="admin-empty py-12">Нет данных для графика</div>;
    }

    const days = Object.keys(stats.errors_by_day).sort();
    const values = days.map((day) => stats.errors_by_day[day]);
    const maxValue = Math.max(...values, 1);
    const chartHeight = 220;
    const chartWidth = Math.max(560, days.length * 48);
    const leftPadding = 40;
    const bottomPadding = 32;
    const topPadding = 16;
    const rightPadding = 16;

    const points = days.map((day, index) => {
      const value = stats.errors_by_day[day];
      const x =
        (index / (days.length - 1 || 1)) * (chartWidth - leftPadding - rightPadding) + leftPadding;
      const y =
        chartHeight - (value / maxValue) * (chartHeight - topPadding - bottomPadding) - bottomPadding;
      return { x, y, value, day };
    });
    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="border-b border-l border-white/10">
          {[0, 0.5, 1].map((ratio) => {
            const y =
              chartHeight - ratio * (chartHeight - topPadding - bottomPadding) - bottomPadding;
            return (
              <g key={ratio}>
                <line
                  x1={leftPadding}
                  y1={y}
                  x2={chartWidth - rightPadding}
                  y2={y}
                  stroke="rgba(255,255,255,0.08)"
                />
                <text x={leftPadding - 8} y={y + 4} textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.4)">
                  {Math.round(ratio * maxValue)}
                </text>
              </g>
            );
          })}
          <path d={pathData} fill="none" stroke="#f87171" strokeWidth="2" />
          {points.map((point) => (
            <circle key={point.day} cx={point.x} cy={point.y} r="3" fill="#f87171">
              <title>{`${point.day}: ${point.value}`}</title>
            </circle>
          ))}
        </svg>
      </div>
    );
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="py-12 text-center text-white/50">
        Доступ запрещен. Войдите как администратор.
      </div>
    );
  }

  if (loading && !stats) {
    return <div className="admin-loading">Загрузка ошибок…</div>;
  }

  return (
    <div className={`space-y-5 ${loading ? 'opacity-70' : ''}`}>
      <div>
        <h1 className="admin-page-title">Ошибки</h1>
        <p className="admin-page-sub">Авторизация, регистрация, покупки и оплата</p>
      </div>

      <div className="admin-sticky-filters rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-md">
        <div className="mb-3 flex flex-wrap gap-2">
          {DATE_PRESET_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => applyPreset(opt.id)}
              aria-pressed={activePreset === opt.id}
              className={`admin-filter-chip ${activePreset === opt.id ? 'is-active' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-sm text-white/45">Период</label>
            <div className="flex gap-2">
              <DatePicker value={startDate} onChange={setStartDate} placeholder="С дд.мм.гггг" className="flex-1" />
              <DatePicker value={endDate} onChange={setEndDate} placeholder="По дд.мм.гггг" className="flex-1" />
            </div>
          </div>
          <div className="min-w-[180px]">
            <label className="mb-1 block text-sm text-white/45">Тип</label>
            <CustomSelect
              value={errorTypeFilter}
              onChange={setErrorTypeFilter}
              options={ERROR_TYPES}
              placeholder="Все типы"
            />
          </div>
        </div>
      </div>

      {stats ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => setErrorTypeFilter('')}
            aria-pressed={!errorTypeFilter}
            className={`rounded-2xl border bg-black/30 p-4 text-left transition duration-200 ${
              !errorTypeFilter ? 'border-[#22c55e]/40' : 'border-white/10 hover:border-white/20'
            }`}
          >
            <p className="text-sm text-white/45">Всего</p>
            <p className="mt-1 font-[Syne] text-2xl font-bold tabular-nums text-white">
              {stats.total_errors || 0}
            </p>
          </button>
          {Object.entries(stats.errors_by_type || {}).map(([type, count]) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleTypeFilter(type)}
              aria-pressed={errorTypeFilter === type}
              className={`rounded-2xl border bg-black/30 p-4 text-left transition duration-200 ${
                errorTypeFilter === type
                  ? 'border-[#22c55e]/40'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <p className="text-sm text-white/45">{getErrorTypeLabel(type)}</p>
              <p className="mt-1 font-[Syne] text-2xl font-bold tabular-nums text-white">{count}</p>
              <p className="mt-1 text-[11px] text-white/30">
                {errorTypeFilter === type ? 'Фильтр активен' : 'Клик — фильтр'}
              </p>
            </button>
          ))}
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Filter className="h-4 w-4 text-white/45" aria-hidden />
          <h2 className="font-[Syne] text-base font-semibold text-white">График ошибок</h2>
        </div>
        {renderChart()}
      </div>

      <div className="admin-errors-split">
        <div className="admin-errors-list rounded-2xl border border-white/10 bg-black/30">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="font-[Syne] text-base font-semibold text-white">
              Группы ({groups.length})
            </h2>
            <p className="text-xs text-white/40">Повторяющиеся сообщения свёрнуты</p>
          </div>
          {groups.length === 0 ? (
            <div className="admin-empty px-4 py-10">
              <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-white/25" aria-hidden />
              <p>Ошибок не найдено</p>
              <p className="mt-1 text-xs text-white/35">
                Сбросьте фильтры или откройте{' '}
                <Link to="/admin/guide" className="text-[#22c55e] hover:underline">
                  инструкцию
                </Link>
              </p>
            </div>
          ) : (
            <ul className="max-h-[28rem] divide-y divide-white/5 overflow-y-auto lg:max-h-[36rem]">
              {groups.map((group) => {
                const active = selectedError && group.items.some((i) => i.id === selectedError.id);
                return (
                  <li key={group.key}>
                    <button
                      type="button"
                      onClick={() => selectError(group.latest)}
                      className={`flex w-full cursor-pointer flex-col gap-1 px-4 py-3 text-left transition duration-150 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#22c55e]/50 ${
                        active ? 'bg-[#22c55e]/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-white/70">
                          {getErrorTypeLabel(group.error_type)}
                        </span>
                        {group.count > 1 ? (
                          <span className="rounded-md bg-red-500/15 px-2 py-0.5 text-[11px] tabular-nums text-red-300">
                            ×{group.count}
                          </span>
                        ) : null}
                        <span className="ml-auto text-[11px] text-white/40">
                          {formatDate(group.latest.created_at)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm font-medium text-white">{group.message}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="admin-errors-detail rounded-2xl border border-white/10 bg-black/30 p-4">
          {!selectedError ? (
            <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-white/40">
              Выберите группу слева, чтобы увидеть детали
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/70">
                    {getErrorTypeLabel(selectedError.error_type)}
                  </span>
                  <span className="text-xs text-white/40">{formatDate(selectedError.created_at)}</span>
                  <span className="text-xs text-white/30">#{selectedError.id}</span>
                </div>
                <h3 className="font-[Syne] text-lg font-semibold text-white">
                  {selectedError.error_message}
                </h3>
              </div>

              {selectedError.endpoint ? (
                <p className="font-mono text-xs text-white/55">{selectedError.endpoint}</p>
              ) : null}

              {selectedError.error_details ? (
                <div>
                  <p className="mb-1 text-xs text-white/40">Детали</p>
                  <pre className="max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/70">
                    {selectedError.error_details}
                  </pre>
                </div>
              ) : null}

              <div className="space-y-1 text-sm text-white/55">
                {selectedError.user_id ? (
                  <p>
                    User:{' '}
                    <Link
                      to={`/admin/users/${selectedError.user_id}`}
                      className="inline-flex items-center gap-1 text-[#22c55e] hover:underline"
                    >
                      #{selectedError.user_id}
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </Link>
                  </p>
                ) : null}
                {selectedError.ip_address ? (
                  <p className="font-mono text-xs">IP: {selectedError.ip_address}</p>
                ) : null}
                {selectedError.user_agent ? (
                  <p className="truncate font-mono text-xs text-white/40" title={selectedError.user_agent}>
                    UA: {selectedError.user_agent}
                  </p>
                ) : null}
              </div>

              {groups.find((g) => g.items.some((i) => i.id === selectedError.id))?.count > 1 ? (
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-white/35">
                    Все вхождения
                  </p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto">
                    {groups
                      .find((g) => g.items.some((i) => i.id === selectedError.id))
                      .items.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => selectError(item)}
                            className={`w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-white/5 ${
                              item.id === selectedError.id ? 'bg-white/10 text-white' : 'text-white/50'
                            }`}
                          >
                            #{item.id} · {formatDate(item.created_at)}
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminErrors;
