import test from 'node:test';
import assert from 'node:assert/strict';
import { readBest, connectScoreBridge, validScore } from '../web/bridge.mjs';

test('sandbox storage failures are harmless and parent messages are strictly scoped', () => {
  let handler, best = 0, paused = 0;
  const sent = [];
  const parent = { postMessage: (data, origin) => sent.push({ data, origin }) };
  const win = { parent, addEventListener: (_, listener) => { handler = listener; }, removeEventListener: () => {}, get localStorage() { throw new Error('SecurityError'); } };
  assert.equal(readBest('dino', win), 0);
  const bridge = connectScoreBridge({ id: 'dino', win, getBest: () => best, onBest: value => { best = value; }, onPause: () => { paused++; } });
  handler({ source: {}, data: { type: 'nd:best', id: 'dino', score: 900 } });
  handler({ source: parent, data: { type: 'nd:best', id: 'snake', score: 900 } });
  handler({ source: parent, data: { type: 'nd:best', id: 'dino', score: Infinity } });
  assert.equal(best, 0);
  handler({ source: parent, data: { type: 'nd:best', id: 'dino', score: 120 } });
  assert.equal(best, 120);
  handler({ source: parent, data: { type: 'nd:best', id: 'dino', score: 80 } });
  assert.equal(best, 120);
  handler({ source: parent, data: { type: 'nd:pause', id: 'dino' } });
  assert.equal(paused, 1);
  best = 140;
  bridge.report();
  bridge.report();
  assert.deepEqual(sent, [{ data: { type: 'nd:score', id: 'dino', score: 140 }, origin: '*' }]);
  bridge.dispose();
});

test('stored best values must be integers in the public score bound', () => {
  for (const value of [null, 'bad', '-1', 'NaN', '12.3', '1000000001']) {
    assert.equal(readBest('dino', { localStorage: { getItem: () => value } }), 0);
  }
  assert.equal(readBest('snake', { localStorage: { getItem: () => '125' } }), 125);
  for (const value of [NaN, Infinity, -1, 0.2, '12', 1e9 + 1]) assert.equal(validScore(value), false);
  assert.equal(validScore(1e9), true);
});
