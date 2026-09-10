import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { enterPlayerFullscreen, togglePlayerFullscreen } from './videoFullscreen.js';

describe('enterPlayerFullscreen', () => {
  it('uses the container Fullscreen API first', async () => {
    const calls = [];
    await enterPlayerFullscreen({
      container: {
        requestFullscreen: async () => {
          calls.push('container');
        },
      },
      video: {
        webkitEnterFullscreen: () => {
          calls.push('ios');
        },
      },
    });
    assert.deepEqual(calls, ['container']);
  });

  it('falls back to iOS video fullscreen when the container cannot', async () => {
    const calls = [];
    await enterPlayerFullscreen({
      container: {},
      video: {
        webkitEnterFullscreen: () => {
          calls.push('ios');
        },
      },
    });
    assert.deepEqual(calls, ['ios']);
  });

  it('rejects when no fullscreen API exists', async () => {
    await assert.rejects(
      () => enterPlayerFullscreen({ container: {}, video: {} }),
      /not supported/i,
    );
  });
});

describe('togglePlayerFullscreen', () => {
  it('exits when the player container is already fullscreen', async () => {
    const container = {};
    const doc = {
      fullscreenElement: container,
      exitFullscreen: async () => 'exited',
    };
    const result = await togglePlayerFullscreen({ container, video: {}, doc });
    assert.equal(result, 'exited');
  });

  it('exits iOS native video fullscreen', async () => {
    const calls = [];
    const video = {
      webkitDisplayingFullscreen: true,
      webkitExitFullscreen: () => {
        calls.push('ios-exit');
      },
    };
    await togglePlayerFullscreen({ container: {}, video, doc: {} });
    assert.deepEqual(calls, ['ios-exit']);
  });
});
