import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ADS_DURATION_PRESETS,
  applyAdsSale,
  formatAdsRub,
  parseCustomAdsDays,
  quoteAdsPeriod,
} from './adsPricing.js';

describe('adsPricing day rate', () => {
  it('includes 28-day preset', () => {
    assert.ok(ADS_DURATION_PRESETS.some((o) => o.days === 28));
  });

  it('quotes days times rate with sale', () => {
    const r = quoteAdsPeriod(7, 1000, { kind: 'percent', value: 10 });
    assert.equal(r.list, 7000);
    assert.equal(r.pay, 6300);
  });

  it('rejects out of range days', () => {
    assert.equal(quoteAdsPeriod(0, 1000).list, null);
    assert.equal(quoteAdsPeriod(91, 1000).list, null);
  });

  it('applies amount sale', () => {
    assert.equal(applyAdsSale(10000, { kind: 'amount', value: 1500 }), 8500);
  });

  it('parses custom days', () => {
    assert.equal(parseCustomAdsDays('60'), 60);
    assert.equal(parseCustomAdsDays('0'), null);
  });

  it('formats rubles', () => {
    const text = formatAdsRub(10000);
    assert.match(text, /10/);
    assert.match(text, /₽/);
  });
});
