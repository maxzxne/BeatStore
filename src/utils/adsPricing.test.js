import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ADS_DURATION_PRESETS,
  DEFAULT_ADS_PRICES,
  applyAdsSale,
  formatAdsRub,
  normalizeAdsPrices,
  parseCustomAdsDays,
  resolveAdsPrice,
} from './adsPricing.js';

describe('adsPricing', () => {
  it('includes 28-day preset', () => {
    assert.ok(ADS_DURATION_PRESETS.some((o) => o.days === 28));
  });

  it('fills missing keys from defaults', () => {
    assert.deepEqual(normalizeAdsPrices({ 7: 12000 }), {
      ...DEFAULT_ADS_PRICES,
      7: 12000,
    });
  });

  it('applies percent and amount sales', () => {
    assert.equal(applyAdsSale(10000, { kind: 'percent', value: 20 }), 8000);
    assert.equal(applyAdsSale(10000, { kind: 'amount', value: 1500 }), 8500);
  });

  it('resolves preset price with sale', () => {
    const r = resolveAdsPrice(14, { 14: 18000 }, { kind: 'percent', value: 10 });
    assert.equal(r.list, 18000);
    assert.equal(r.pay, 16200);
    assert.equal(r.custom, false);
  });

  it('marks unknown duration as custom without price', () => {
    const r = resolveAdsPrice(60, DEFAULT_ADS_PRICES, null);
    assert.equal(r.list, null);
    assert.equal(r.pay, null);
    assert.equal(r.custom, true);
  });

  it('parses custom days in 1..90', () => {
    assert.equal(parseCustomAdsDays('60'), 60);
    assert.equal(parseCustomAdsDays('0'), null);
    assert.equal(parseCustomAdsDays('91'), null);
    assert.equal(parseCustomAdsDays('abc'), null);
  });

  it('formats rubles', () => {
    const text = formatAdsRub(10000);
    assert.match(text, /10/);
    assert.match(text, /₽/);
  });
});
