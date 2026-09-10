import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stickyPlayerOffsetClass } from './stickyPlayerOffset.js';

describe('stickyPlayerOffsetClass', () => {
  it('clears the sticky mini-player when it is open', () => {
    assert.equal(stickyPlayerOffsetClass(true), 'pb-32');
  });

  it('uses default padding when the mini-player is closed', () => {
    assert.equal(stickyPlayerOffsetClass(false), 'pb-6');
  });

  it('LayoutV2 applies the offset to the footer so legal links stay clickable', () => {
    const src = readFileSync(new URL('../v2/LayoutV2.jsx', import.meta.url), 'utf8');
    const footerStart = src.indexOf('<footer');
    assert.notEqual(footerStart, -1, 'public layout must render a footer');
    const footerChunk = src.slice(footerStart, src.indexOf('</footer>', footerStart));
    assert.match(
      footerChunk,
      /stickyPlayerOffsetClass\(playerOpen\)/,
      'footer must lift above the fixed mini-player while audio is playing',
    );
  });
});
