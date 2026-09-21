import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_SERVICE_ORDER_PRICING,
  getServicePrice,
  listPriceVariableChips,
  normalizeServiceOrderPricing,
  substitutePriceVars,
} from './serviceOrderPricing.js';

describe('serviceOrderPricing', () => {
  it('normalizes defaults', () => {
    const p = normalizeServiceOrderPricing(null);
    assert.equal(p.trap_price, 15000);
    assert.equal(p.deadlines.length, 5);
  });

  it('substitutes tokens from prices', () => {
    const text = substitutePriceVars(
      'от {{from}}, трэп {{trap}}, неделя 50% {{p50_7}}',
      DEFAULT_SERVICE_ORDER_PRICING
    );
    assert.match(text, /15 000 ₽/);
    assert.match(text, /35 000 ₽/);
    assert.equal(text.includes('{{'), false);
  });

  it('lists chips for admin', () => {
    const chips = listPriceVariableChips(DEFAULT_SERVICE_ORDER_PRICING);
    assert.ok(chips.some((c) => c.token === '{{trap}}'));
    assert.ok(chips.some((c) => c.token === '{{p50_21}}'));
  });

  it('resolves price by deadline', () => {
    assert.equal(getServicePrice(DEFAULT_SERVICE_ORDER_PRICING, 21, 50), 25000);
    assert.equal(getServicePrice(DEFAULT_SERVICE_ORDER_PRICING, 7, 100), 30000);
  });
});
