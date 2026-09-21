import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findActiveGroupLabel,
  isNavGroupOpen,
  toggleCollapsedLabel,
} from './adminNavCollapse.js';

const groups = [
  {
    label: 'Обзор',
    items: [
      { path: '/admin/dashboard' },
      { path: '/admin/revenue' },
    ],
  },
  {
    label: 'Каталог',
    items: [
      { path: '/admin/beats' },
      { path: '/admin/courses' },
    ],
  },
];

describe('findActiveGroupLabel', () => {
  it('returns group label for exact path match', () => {
    assert.equal(findActiveGroupLabel(groups, '/admin/beats'), 'Каталог');
  });

  it('returns null when path is outside nav', () => {
    assert.equal(findActiveGroupLabel(groups, '/admin/unknown'), null);
  });
});

describe('isNavGroupOpen', () => {
  it('is open by default when not in collapsed list', () => {
    assert.equal(isNavGroupOpen('Обзор', [], null), true);
  });

  it('is closed when label is collapsed', () => {
    assert.equal(isNavGroupOpen('Каталог', ['Каталог'], null), false);
  });

  it('stays open for active group even if collapsed', () => {
    assert.equal(isNavGroupOpen('Каталог', ['Каталог'], 'Каталог'), true);
  });
});

describe('toggleCollapsedLabel', () => {
  it('adds label when expanding collapse set', () => {
    assert.deepEqual(toggleCollapsedLabel([], 'Обзор'), ['Обзор']);
  });

  it('removes label when already collapsed', () => {
    assert.deepEqual(toggleCollapsedLabel(['Обзор', 'Каталог'], 'Обзор'), ['Каталог']);
  });
});
