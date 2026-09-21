import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { Music, GraduationCap, FileText, TrendingUp, Calendar, X } from 'lucide-react';
import DatePicker from '../components/DatePicker';
import CustomSelect from '../components/CustomSelect';
import { DATE_PRESET_OPTIONS, datePresetRange, matchDatePreset } from '../utils/adminDatePresets';

const AdminRevenue = () => {
  const { isAdminAuthenticated } = useAuth();
  const [stats, setStats] = useState(null);
  const [people, setPeople] = useState([]);
  const [peopleLoaded, setPeopleLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => datePresetRange('30').startDate);
  const [endDate, setEndDate] = useState(() => datePresetRange('30').endDate);
  const [contributorId, setContributorId] = useState('');

  const activePreset = useMemo(
    () => matchDatePreset(startDate, endDate),
    [startDate, endDate],
  );

  const contributorName = useMemo(() => {
    if (!contributorId) return '';
    const person = people.find((p) => String(p.id) === contributorId);
    return person?.name || `ID ${contributorId}`;
  }, [contributorId, people]);

  useEffect(() => {
    if (!isAdminAuthenticated || peopleLoaded) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const peopleRes = await api.get('/api/admin/contributors');
        if (!cancelled) {
          setPeople(peopleRes.data || []);
          setPeopleLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setPeople([]);
          setPeopleLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdminAuthenticated, peopleLoaded]);

  useEffect(() => {
    if (!isAdminAuthenticated) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (contributorId) params.append('contributor_id', contributorId);
        const response = await api.get(`/api/admin/revenue?${params.toString()}`);
        if (!cancelled) setStats(response.data);
      } catch (error) {
        console.error('Error fetching revenue stats:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdminAuthenticated, startDate, endDate, contributorId]);

  const applyPreset = (preset) => {
    const range = datePresetRange(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const formatAxisLabel = (amount) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M ₽`;
    if (amount >= 1000) return `${Math.round(amount / 1000)}K ₽`;
    return `${amount} ₽`;
  };

  const dayRows = useMemo(() => {
    if (!stats?.revenue_by_day) return [];
    return Object.keys(stats.revenue_by_day)
      .sort()
      .map((day) => ({ day, value: stats.revenue_by_day[day] }));
  }, [stats]);

  const composition = useMemo(() => {
    if (!stats) return [];
    const parts = [
      { id: 'beats', label: 'Биты', value: stats.beat_revenue || 0, color: '#22c55e' },
      { id: 'courses', label: 'Курсы', value: stats.course_revenue || 0, color: 'rgba(255,255,255,0.45)' },
      { id: 'orders', label: 'Услуги', value: stats.order_revenue || 0, color: 'rgba(255,255,255,0.25)' },
    ];
    const total = parts.reduce((a, p) => a + p.value, 0) || 1;
    return parts.map((p) => ({ ...p, pct: (p.value / total) * 100 }));
  }, [stats]);

  const renderChart = () => {
    if (!dayRows.length) {
      return <div className="admin-empty py-16">Нет данных для отображения графика</div>;
    }

    const values = dayRows.map((r) => r.value);
    const maxValue = Math.max(...values, 1);
    const chartHeight = 360;
    const chartWidth = Math.max(720, dayRows.length * 72);
    const leftPadding = 75;
    const bottomPadding = 48;
    const topPadding = 24;
    const rightPadding = 24;

    const points = dayRows.map((row, index) => {
      const x =
        (index / (dayRows.length - 1 || 1)) * (chartWidth - leftPadding - rightPadding) + leftPadding;
      const y =
        chartHeight - (row.value / maxValue) * (chartHeight - topPadding - bottomPadding) - bottomPadding;
      return { x, y, value: row.value, day: row.day };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - bottomPadding} L ${points[0].x} ${chartHeight - bottomPadding} Z`;

    return (
      <div className="relative overflow-x-auto overflow-y-hidden rounded-lg" style={{ minHeight: `${chartHeight}px` }}>
        <svg width={chartWidth} height={chartHeight} className="shrink-0 border-b border-l border-white/10">
          <defs>
            <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y =
              chartHeight - ratio * (chartHeight - topPadding - bottomPadding) - bottomPadding;
            return (
              <line
                key={ratio}
                x1={leftPadding}
                y1={y}
                x2={chartWidth - rightPadding}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}

          <path d={areaPath} fill="url(#revArea)" />
          <path
            d={linePath}
            fill="none"
            stroke="#22c55e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y =
              chartHeight - ratio * (chartHeight - topPadding - bottomPadding) - bottomPadding;
            const value = Math.round(maxValue * ratio);
            return (
              <g key={`label-${ratio}`}>
                <text
                  x={leftPadding - 10}
                  y={y + 4}
                  fontSize="11"
                  fill="rgba(250,250,250,0.45)"
                  textAnchor="end"
                >
                  {formatAxisLabel(value)}
                </text>
              </g>
            );
          })}

          {points.map((point, index) => {
            const date = new Date(point.day);
            const dateStr = `${date.getDate()} ${date.toLocaleDateString('ru-RU', { month: 'short' })}`;
            const isEdge = index === 0 || index === points.length - 1;
            const showLabel =
              points.length <= 12 || isEdge || index % Math.ceil(points.length / 6) === 0;

            return (
              <g key={point.day}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="#22c55e"
                  stroke="#0a0a0a"
                  strokeWidth="2"
                >
                  <title>{`${point.day}: ${formatCurrency(point.value)}`}</title>
                </circle>
                {showLabel ? (
                  <text
                    x={point.x}
                    y={chartHeight - bottomPadding + 18}
                    fontSize="10"
                    fill="rgba(250,250,250,0.45)"
                    textAnchor="middle"
                  >
                    {dateStr}
                  </text>
                ) : null}
              </g>
            );
          })}
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
    return <div className="admin-loading">Загрузка статистики…</div>;
  }

  return (
    <div className={`space-y-5 ${loading ? 'opacity-70' : ''}`}>
      <div>
        <h1 className="admin-page-title">Доходы</h1>
        <p className="admin-page-sub">Статистика продаж и доходов</p>
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
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-white/45" aria-hidden />
            <label className="text-sm text-white/55" htmlFor="rev-start">
              С
            </label>
            <DatePicker
              id="rev-start"
              value={startDate}
              onChange={setStartDate}
              placeholder="ДД.ММ.ГГГГ"
              className="w-auto min-w-[140px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-white/55" htmlFor="rev-end">
              По
            </label>
            <DatePicker
              id="rev-end"
              value={endDate}
              onChange={setEndDate}
              placeholder="ДД.ММ.ГГГГ"
              className="w-auto min-w-[140px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-white/55">Человек</label>
            <CustomSelect
              className="min-w-[160px]"
              value={contributorId}
              onChange={setContributorId}
              options={[
                { value: '', label: 'Все' },
                ...people.map((person) => ({
                  value: String(person.id),
                  label: person.name,
                })),
              ]}
            />
          </div>
          {(startDate || endDate || contributorId) && (
            <button
              type="button"
              onClick={() => {
                const range = datePresetRange('30');
                setStartDate(range.startDate);
                setEndDate(range.endDate);
                setContributorId('');
              }}
              className="btn btn-outline btn-sm"
            >
              Сбросить
            </button>
          )}
        </div>

        {contributorId ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="admin-filter-chip is-active inline-flex items-center gap-1.5"
              onClick={() => setContributorId('')}
            >
              Фильтр: {contributorName}
              <X className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Сбросить фильтр по человеку</span>
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Общий доход',
            value: formatCurrency(stats?.total_revenue),
            icon: <span className="text-xl font-bold leading-none">₽</span>,
          },
          {
            label: 'Продано битов',
            value: stats?.beat_count ?? 0,
            sub: formatCurrency(stats?.beat_revenue),
            icon: <Music className="h-5 w-5" />,
          },
          {
            label: 'Продано курсов',
            value: stats?.course_count ?? 0,
            sub: formatCurrency(stats?.course_revenue),
            icon: <GraduationCap className="h-5 w-5" />,
          },
          {
            label: 'Выполнено заказов',
            value: stats?.order_count ?? 0,
            sub: formatCurrency(stats?.order_revenue),
            icon: <FileText className="h-5 w-5" />,
          },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="mb-1 text-sm text-white/45">{card.label}</p>
                <p className="font-[Syne] text-2xl font-bold tabular-nums text-white">{card.value}</p>
                {card.sub ? <p className="mt-1 text-xs text-white/40">{card.sub}</p> : null}
              </div>
              <div className="admin-stat-icon">{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {stats && (stats.total_revenue > 0 || composition.some((c) => c.value > 0)) ? (
        <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/35">
            Состав дохода
          </h2>
          <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-white/10">
            {composition.map((part) =>
              part.pct > 0 ? (
                <div
                  key={part.id}
                  style={{ width: `${part.pct}%`, background: part.color }}
                  title={`${part.label}: ${formatCurrency(part.value)}`}
                />
              ) : null,
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {composition.map((part) => (
              <div key={part.id} className="flex items-center gap-2 text-white/70">
                <span className="h-2 w-2 rounded-full" style={{ background: part.color }} />
                {part.label}
                <span className="tabular-nums text-white">{formatCurrency(part.value)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {stats?.revenue_by_contributor?.length > 0 ? (
        <div className="admin-panel overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                <th>Кто</th>
                <th>Продаж</th>
                <th>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {stats.revenue_by_contributor.map((row) => (
                <tr
                  key={row.id ?? 'store'}
                  className={`cursor-pointer hover:bg-white/5 ${
                    contributorId === String(row.id || '') || (!contributorId && row.id == null)
                      ? ''
                      : ''
                  } ${contributorId && String(row.id) === contributorId ? 'bg-[#22c55e]/10' : ''}`}
                  onClick={() => setContributorId(row.id ? String(row.id) : '')}
                >
                  <td>{row.name}</td>
                  <td className="tabular-nums">{row.beat_count}</td>
                  <td className="tabular-nums">{formatCurrency(row.beat_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <TrendingUp className="h-5 w-5 text-[#22c55e]" aria-hidden />
          <h2 className="font-[Syne] text-lg font-semibold text-white">График доходов</h2>
        </div>
        <div className="overflow-x-auto p-4">{renderChart()}</div>
        {dayRows.length > 0 ? (
          <div className="overflow-x-auto border-t border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-white/45">День</th>
                  <th className="px-4 py-2 text-white/45">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {[...dayRows].reverse().map((row) => (
                  <tr key={row.day} className="border-t border-white/5">
                    <td className="px-4 py-2 tabular-nums text-white/70">{row.day}</td>
                    <td className="px-4 py-2 tabular-nums text-white">{formatCurrency(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AdminRevenue;
