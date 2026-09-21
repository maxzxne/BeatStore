import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SEARCH_PLACEHOLDER,
  normalizeSearchPlaceholder,
} from './searchPlaceholder.js';

test('normalizeSearchPlaceholder keeps custom text', () => {
  assert.equal(normalizeSearchPlaceholder('Найди бит'), 'Найди бит');
});

test('normalizeSearchPlaceholder falls back on blank', () => {
  assert.equal(normalizeSearchPlaceholder(''), DEFAULT_SEARCH_PLACEHOLDER);
  assert.equal(normalizeSearchPlaceholder('   '), DEFAULT_SEARCH_PLACEHOLDER);
  assert.equal(normalizeSearchPlaceholder(null), DEFAULT_SEARCH_PLACEHOLDER);
});
