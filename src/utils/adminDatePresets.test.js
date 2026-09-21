import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { datePresetRange, matchDatePreset } from './adminDatePresets.js';

describe('datePresetRange', () => {
  const now = new Date('2026-09-21T15:30:00Z');

  it('builds last 7 / 30 / 90 day ranges inclusive of today', () => {
    assert.deepEqual(datePresetRange('7', now), {
      startDate: '2026-09-15',
      endDate: '2026-09-21',
    });
    assert.deepEqual(datePresetRange('30', now), {
      startDate: '2026-08-23',
      endDate: '2026-09-21',
    });
    assert.deepEqual(datePresetRange('90', now), {
      startDate: '2026-06-24',
      endDate: '2026-09-21',
    });
  });

  it('builds calendar month from day 1', () => {
    assert.deepEqual(datePresetRange('month', now), {
      startDate: '2026-09-01',
      endDate: '2026-09-21',
    });
  });

  it('returns empty for unknown', () => {
    assert.deepEqual(datePresetRange('', now), { startDate: '', endDate: '' });
  });
});

describe('matchDatePreset', () => {
  const now = new Date('2026-09-21T15:30:00Z');

  it('detects active preset from dates', () => {
    assert.equal(matchDatePreset('2026-09-15', '2026-09-21', now), '7');
    assert.equal(matchDatePreset('2026-09-01', '2026-09-21', now), 'month');
    assert.equal(matchDatePreset('2026-01-01', '2026-09-21', now), '');
  });
});
