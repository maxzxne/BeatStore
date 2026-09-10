import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCartBadge } from './cartBadge.js';

describe('resolveCartBadge', () => {
  it('does not show guest leftover while session is restoring', () => {
    assert.equal(
      resolveCartBadge({
        authLoading: true,
        isAuthenticated: false,
        guestCount: 1,
      }),
      null,
    );
  });

  it('uses guest count only when logged out', () => {
    assert.equal(
      resolveCartBadge({
        authLoading: false,
        isAuthenticated: false,
        guestCount: 1,
      }),
      1,
    );
  });

  it('ignores guest leftover after login even if guestCount is 1', () => {
    assert.equal(
      resolveCartBadge({
        authLoading: false,
        isAuthenticated: true,
        guestCount: 1,
        serverBeats: [],
        serverCourses: [],
      }),
      0,
    );
  });

  it('does not treat HTML/non-array /cart payload as 1 item', () => {
    assert.equal(
      resolveCartBadge({
        authLoading: false,
        isAuthenticated: true,
        guestCount: 1,
        serverBeats: '<!doctype html>',
        serverCourses: [],
      }),
      0,
    );
  });

  it('counts beats plus courses', () => {
    assert.equal(
      resolveCartBadge({
        authLoading: false,
        isAuthenticated: true,
        guestCount: 0,
        serverBeats: [{ id: 1 }],
        serverCourses: [{ id: 2 }],
      }),
      2,
    );
  });

  it('clears badge when authenticated cart fetch failed', () => {
    assert.equal(
      resolveCartBadge({
        authLoading: false,
        isAuthenticated: true,
        guestCount: 1,
        serverError: true,
      }),
      0,
    );
  });
});
