import test from 'node:test';
import assert from 'node:assert/strict';
import {
  beatHasDeliverableFile,
  beatLicenseOptions,
  buyButtonLabel,
  resolveBeatPayAmount,
} from './beatPricing.js';

test('resolveBeatPayAmount uses tier price when present', () => {
  const beat = { price: 1000, price_mp3: 500, price_wav: 900, price_exclusive: 5000 };
  assert.equal(resolveBeatPayAmount(beat, 'mp3'), 500);
  assert.equal(resolveBeatPayAmount(beat, 'wav'), 900);
  assert.equal(resolveBeatPayAmount(beat, 'exclusive'), 5000);
});

test('resolveBeatPayAmount falls back to legacy price', () => {
  const beat = { price: 2990, price_mp3: null, price_wav: null, price_exclusive: null };
  assert.equal(resolveBeatPayAmount(beat, 'mp3'), 2990);
});

test('beatLicenseOptions builds tiers when files exist', () => {
  const beat = {
    price: 0,
    mp3_url: '/a.mp3',
    price_mp3: 100,
    wav_url: '/a.wav',
    price_wav: 200,
    exclusive_url: null,
    price_exclusive: null,
  };
  const opts = beatLicenseOptions(beat);
  assert.deepEqual(
    opts.map((o) => o.type),
    ['mp3', 'wav'],
  );
});

test('beatLicenseOptions falls back to single legacy license', () => {
  const beat = { price: 2990, price_mp3: null, mp3_url: null };
  const opts = beatLicenseOptions(beat);
  assert.equal(opts.length, 1);
  assert.equal(opts[0].legacy, true);
  assert.equal(opts[0].amount, 2990);
  assert.equal(opts[0].label, 'Лицензия');
});

test('buyButtonLabel shows free or amount', () => {
  assert.equal(buyButtonLabel(0), 'Получить бесплатно');
  assert.match(buyButtonLabel(2990), /Купить/);
  assert.match(buyButtonLabel(2990), /2[\s\u00a0]?990/);
});

test('beatHasDeliverableFile', () => {
  assert.equal(beatHasDeliverableFile({ price: 1 }), false);
  assert.equal(beatHasDeliverableFile({ mp3_url: '/x.mp3' }), true);
});
