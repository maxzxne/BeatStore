import test from 'node:test';
import assert from 'node:assert/strict';
import {
  promoSlideStepPx,
  promoSlideWidthPx,
  promoTrackOffsetPx,
} from './promoLayout.js';

test('fullscreen uses full viewport width', () => {
  assert.equal(promoSlideWidthPx(1000, true), 1000);
  assert.equal(promoSlideStepPx(1000, true), 1000);
  assert.equal(promoTrackOffsetPx(2, 1000, true, 0), -2000);
});

test('peek mode shrinks slide and leaves gap for next', () => {
  assert.equal(promoSlideWidthPx(1000, false), 860);
  assert.equal(promoSlideStepPx(1000, false), 872);
  assert.equal(promoTrackOffsetPx(1, 1000, false, 10), -862);
});
