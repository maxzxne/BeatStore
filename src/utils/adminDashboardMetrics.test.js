import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  fillDaySeries,
  formatDeltaPct,
  periodTrend,
  sparklinePath,
  sumDayMap,
} from './adminDashboardMetrics.js';

describe('fillDaySeries', () => {
  it('fills missing days with zero ending at endDate', () => {
    const end = new Date('2026-09-21T12:00:00Z');
    const series = fillDaySeries({ '2026-09-21': 3, '2026-09-19': 1 }, 3, end);
    assert.deepEqual(series, [
      { day: '2026-09-19', count: 1 },
      { day: '2026-09-20', count: 0 },
      { day: '2026-09-21', count: 3 },
    ]);
  });
});

describe('sumDayMap', () => {
  it('sums all values', () => {
    assert.equal(sumDayMap({ a: 1, b: 4 }), 5);
    assert.equal(sumDayMap(null), 0);
  });
});

describe('periodTrend', () => {
  it('compares last N days vs previous N within series', () => {
    const series = [
      { day: '2026-09-08', count: 1 },
      { day: '2026-09-09', count: 1 },
      { day: '2026-09-10', count: 1 },
      { day: '2026-09-11', count: 1 },
      { day: '2026-09-12', count: 1 },
      { day: '2026-09-13', count: 1 },
      { day: '2026-09-14', count: 1 },
      { day: '2026-09-15', count: 2 },
      { day: '2026-09-16', count: 2 },
      { day: '2026-09-17', count: 2 },
      { day: '2026-09-18', count: 2 },
      { day: '2026-09-19', count: 2 },
      { day: '2026-09-20', count: 2 },
      { day: '2026-09-21', count: 2 },
    ];
    const trend = periodTrend(series, 7);
    assert.equal(trend.current, 14);
    assert.equal(trend.previous, 7);
    assert.equal(trend.pct, 100);
    assert.equal(trend.direction, 'up');
  });

  it('returns flat when previous is zero and current is zero', () => {
    const trend = periodTrend(
      [
        { day: 'a', count: 0 },
        { day: 'b', count: 0 },
      ],
      1,
    );
    assert.equal(trend.direction, 'flat');
    assert.equal(trend.pct, null);
  });
});

describe('formatDeltaPct', () => {
  it('formats signed percent', () => {
    assert.equal(formatDeltaPct({ pct: 100, direction: 'up' }), '+100%');
    assert.equal(formatDeltaPct({ pct: 25, direction: 'down' }), '−25%');
    assert.equal(formatDeltaPct({ pct: null, direction: 'flat' }), '—');
  });
});

describe('sparklinePath', () => {
  it('builds a polyline path for values', () => {
    const d = sparklinePath([0, 2, 1], 60, 20);
    assert.match(d, /^M /);
    assert.ok(d.includes(' L '));
  });

  it('handles empty values', () => {
    assert.equal(sparklinePath([], 60, 20), '');
  });
});
