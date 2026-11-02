import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnake, startSnake, turnSnake, pauseSnake, resumeSnake, resetSnake, setSnakeRate, stepSnake, advanceSnake, placeFood } from '../web/engine.mjs';

test('initial cells align to the grid and food never overlaps the snake', () => {
  for (const cols of [4, 24, 64]) {
    const state = createSnake({ cols }, () => 0);
    assert.equal(state.status, 'ready');
    assert.ok(state.body.every(p => p.x >= 0 && p.x < cols && Number.isInteger(p.x)));
    assert.ok(!state.body.some(p => p.x === state.food.x && p.y === state.food.y));
    assert.equal(advanceSnake(state, 1000), state);
  }
});

test('opposite turns and multiple queued turns cannot reverse into the body', () => {
  const state = startSnake(createSnake());
  assert.equal(turnSnake(state, 'left'), state);
  const queued = turnSnake(state, 'up');
  assert.equal(turnSnake(queued, 'left'), queued);
  const next = stepSnake(queued);
  assert.equal(next.direction, 'up');
  assert.equal(next.queued, null);
  assert.equal(next.body[0].y, state.body[0].y - 1);
  assert.equal(state.direction, 'right');
});

test('eating grows immediately, scores once and respawns on a free cell', () => {
  let state = startSnake(createSnake({}, () => 0));
  state = { ...state, food: { x: state.body[0].x + 1, y: state.body[0].y } };
  const next = stepSnake(state, () => 0);
  assert.equal(next.score, 10);
  assert.equal(next.best, 10);
  assert.equal(next.body.length, state.body.length + 1);
  assert.ok(!next.body.some(p => p.x === next.food.x && p.y === next.food.y));
  assert.equal(state.score, 0);
});

test('walls and occupied body cells end the run', () => {
  const base = startSnake(createSnake({}, () => 0));
  assert.equal(stepSnake({ ...base, body: [{ x: 23, y: 2 }, { x: 22, y: 2 }], direction: 'right' }).status, 'gameover');
  const bent = { ...base, body: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 2 }, { x: 4, y: 2 }], direction: 'right' };
  assert.equal(stepSnake(bent).status, 'gameover');
});

test('moving into the departing tail is legal when not eating', () => {
  const state = { ...startSnake(createSnake()), body: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 2 }], direction: 'right', food: { x: 9, y: 9 } };
  const next = stepSnake(state);
  assert.equal(next.status, 'running');
  assert.deepEqual(next.body[0], { x: 3, y: 2 });
});

test('full board wins without an infinite food placement loop', () => {
  const body = [];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (x !== 3 || y !== 0) body.push({ x, y });
  const state = { ...startSnake(createSnake({ cols: 4, rows: 4 })), body: [{ x: 2, y: 0 }, ...body.filter(p => p.x !== 2 || p.y !== 0)], direction: 'right', food: { x: 3, y: 0 } };
  const next = stepSnake(state);
  assert.equal(next.status, 'won');
  assert.equal(next.food, null);
  assert.equal(next.body.length, 16);
  assert.equal(placeFood(next.body, 4, 4), null);
});

test('pause freezes, restart preserves best, and speed changes reset the run', () => {
  let state = startSnake({ ...createSnake(), score: 50, best: 70 });
  state = pauseSnake(state);
  assert.equal(advanceSnake(state, 1000), state);
  assert.equal(turnSnake(state, 'up'), state);
  assert.equal(resumeSnake(state).status, 'running');
  assert.equal(resetSnake(state).best, 70);
  assert.equal(resetSnake(state).score, 0);
  assert.equal(setSnakeRate(state, 12).rate, 12);
  assert.equal(setSnakeRate(state, 12).status, 'ready');
});

test('frame gaps, invalid inputs and rates are bounded', () => {
  const state = startSnake(createSnake({}, () => 0));
  assert.deepEqual(advanceSnake(state, 100000), advanceSnake(state, 250));
  for (const delta of [NaN, Infinity, -1, 0]) assert.equal(advanceSnake(state, delta), state);
  for (const rate of [0, 21, NaN]) assert.throws(() => createSnake({ rate }), RangeError);
  assert.throws(() => createSnake({ cols: 3 }), RangeError);
  assert.throws(() => turnSnake(state, 'diagonal'), RangeError);
});
