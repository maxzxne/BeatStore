import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isInternalPromoHref,
  promoDragExceededThreshold,
  promoHasLink,
  shouldBlockPromoNav,
} from './promoNav.js';

test('shouldBlockPromoNav only when drag happened', () => {
  assert.equal(shouldBlockPromoNav({ dragMoved: false, blockNav: false }), false);
  assert.equal(shouldBlockPromoNav({ dragMoved: true, blockNav: false }), true);
  assert.equal(shouldBlockPromoNav({ dragMoved: false, blockNav: true }), true);
});

test('promoDragExceededThreshold', () => {
  assert.equal(promoDragExceededThreshold(0), false);
  assert.equal(promoDragExceededThreshold(7), false);
  assert.equal(promoDragExceededThreshold(9), true);
});

test('isInternalPromoHref', () => {
  assert.equal(isInternalPromoHref('/beats'), true);
  assert.equal(isInternalPromoHref('//evil.com'), false);
  assert.equal(isInternalPromoHref('https://x.com'), false);
});

test('promoHasLink', () => {
  assert.equal(promoHasLink({ link_url: '/order' }), true);
  assert.equal(promoHasLink({ link_url: null }), false);
});
