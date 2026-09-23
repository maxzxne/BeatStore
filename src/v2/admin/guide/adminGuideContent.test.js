/**
 * Unit tests for admin guide search helpers (node:test).
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  filterGuideSections,
  groupGuideSections,
  guideSections,
} from './adminGuideContent.js';

describe('adminGuideContent', () => {
  test('has required admin sections', () => {
    const ids = new Set(guideSections.map((s) => s.id));
    for (const id of [
      'dashboard',
      'beats',
      'upload',
      'orders',
      'hero',
      'promo',
      'site-settings',
      'notes-info',
    ]) {
      assert.equal(ids.has(id), true, `missing section ${id}`);
    }
  });

  test('filter finds promo by keyword', () => {
    const hits = filterGuideSections(guideSections, 'промокод');
    assert.equal(hits.some((s) => s.id === 'promo'), true);
  });

  test('empty query returns all', () => {
    assert.equal(filterGuideSections(guideSections, '  ').length, guideSections.length);
  });

  test('group preserves order of first appearance', () => {
    const grouped = groupGuideSections(guideSections);
    assert.equal(grouped[0].group, 'Введение');
    assert.equal(grouped.some((g) => g.group === 'Сайт'), true);
  });
});
