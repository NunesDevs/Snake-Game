import test from 'node:test';
import assert from 'node:assert/strict';
import { connectResizeBridge } from '../web/bridge.mjs';

test('resize uses content bounds, clamps height and suppresses duplicate messages', () => {
  let height = 820.2, scheduled, observed, disconnected = false;
  const sent = [];
  const win = {
    parent: { postMessage: message => sent.push(message) },
    requestAnimationFrame: fn => { scheduled = fn;return 1; }, cancelAnimationFrame() {},
    ResizeObserver: class { constructor(callback) { observed = callback; } observe() {} disconnect() { disconnected = true; } },
  };
  const bridge = connectResizeBridge({ id: 'dino', win, element: { getBoundingClientRect: () => ({ height }) } });
  scheduled();assert.deepEqual(sent, [{ type: 'nd:resize', id: 'dino', height: 821 }]);
  observed();scheduled();assert.equal(sent.length, 1);
  height = 10;observed();scheduled();assert.equal(sent[1].height, 320);
  height = 9000;observed();scheduled();assert.equal(sent[2].height, 1800);
  bridge.dispose();assert.equal(disconnected, true);
});
