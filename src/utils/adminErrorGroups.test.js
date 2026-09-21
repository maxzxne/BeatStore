import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { groupErrorsByMessage } from './adminErrorGroups.js';

describe('groupErrorsByMessage', () => {
  it('groups identical messages and keeps latest first', () => {
    const groups = groupErrorsByMessage([
      { id: 1, error_message: 'A', created_at: '2026-09-20T10:00:00Z', error_type: 'auth' },
      { id: 2, error_message: 'B', created_at: '2026-09-21T10:00:00Z', error_type: 'payment' },
      { id: 3, error_message: 'A', created_at: '2026-09-21T12:00:00Z', error_type: 'auth' },
    ]);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].message, 'A');
    assert.equal(groups[0].count, 2);
    assert.equal(groups[0].latest.id, 3);
    assert.equal(groups[1].message, 'B');
    assert.equal(groups[1].count, 1);
  });

  it('handles empty list', () => {
    assert.deepEqual(groupErrorsByMessage([]), []);
  });
});
