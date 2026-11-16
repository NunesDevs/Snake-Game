export const MODES = Object.freeze(['classic', 'portal', 'arena']);
export const DIRECTIONS = Object.freeze({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] });
const same = (a, b) => a.x === b.x && a.y === b.y;
const opposite = (a, b) => DIRECTIONS[a][0] + DIRECTIONS[b][0] === 0 && DIRECTIONS[a][1] + DIRECTIONS[b][1] === 0;

function rateValue(rate) {
  if (!Number.isFinite(rate) || rate < 1 || rate > 20) throw new RangeError('Rate must be between 1 and 20');
  return rate;
}

export function arenaWalls(cols, rows) {
  // Open corridors remain connected; tiny boards omit walls to preserve a fair start.
  if (cols < 10 || rows < 8) return [];
  const walls = [], start = Math.floor(cols * 0.45), length = Math.max(2, Math.floor(cols / 5));
  for (const y of [Math.floor(rows / 4), rows - 1 - Math.floor(rows / 4)])
    for (let x = start; x < start + length; x++) walls.push({ x, y });
  return walls;
}
function modeValue(mode) {
  if (!MODES.includes(mode)) throw new RangeError('Unknown mode');
  return mode;
}
export function placeFood(body, cols, rows, random = Math.random, walls = []) {
  const occupied = new Set([...body, ...walls].map(p => p.y * cols + p.x));
  const free = [];
  for (let i = 0; i < cols * rows; i++) if (!occupied.has(i)) free.push(i);
  if (!free.length) return null;
  const value = random();
  const fraction = Number.isFinite(value) ? Math.max(0, Math.min(0.999999999, value)) : 0.5;
  const index = free[Math.floor(fraction * free.length)];
  return { x: index % cols, y: Math.floor(index / cols) };
}

export function createSnake({ cols = 24, rows = 20, rate = 8, best = 0, mode = 'classic' } = {}, random = Math.random) {
  if (![cols, rows].every(v => Number.isInteger(v) && v >= 4 && v <= 64)) throw new RangeError('Grid dimensions must be integers between 4 and 64');
  const x = Math.floor(cols / 3), y = Math.floor(rows / 2);
  const body = [{ x, y }, { x: x - 1, y }, { x: x - 2, y }];
  // A four-column board needs a non-negative initial tail.
  if (body[2].x < 0) body.forEach(p => { p.x += 1; });
  modeValue(mode);
  const walls = mode === 'arena' ? arenaWalls(cols, rows) : [];
  return {
    mode, walls, bonus: null, eaten: 0,
    cols, rows, baseRate: rateValue(rate), rate, body,
    direction: 'right', queued: null, food: placeFood(body, cols, rows, random, walls),
    status: 'ready', score: 0,
    best: Number.isInteger(best) && best >= 0 && best <= 1e9 ? best : 0,
    remainder: 0,
  };
}

export function startSnake(state) {
  return state.status === 'ready' ? { ...state, status: 'running', remainder: 0 } : state;
}

export function turnSnake(state, direction) {
  if (!Object.hasOwn(DIRECTIONS, direction)) throw new RangeError('Unknown direction');
  if (!['running', 'ready'].includes(state.status) || state.queued || direction === state.direction || opposite(direction, state.direction)) return state;
  return { ...state, queued: direction };
}

export function pauseSnake(state) {
  return state.status === 'running' ? { ...state, status: 'paused', remainder: 0 } : state;
}

export function resumeSnake(state) {
  return state.status === 'paused' ? { ...state, status: 'running', remainder: 0 } : state;
}

export function resetSnake(state, random = Math.random) {
  return createSnake({ cols: state.cols, rows: state.rows, rate: state.baseRate, mode: state.mode, best: Math.max(state.best, state.score) }, random);
}

export function setSnakeRate(state, rate, random = Math.random) {
  return createSnake({ cols: state.cols, rows: state.rows, rate: rateValue(rate), mode: state.mode, best: Math.max(state.best, state.score) }, random);
}

export function setSnakeMode(state, mode, random = Math.random) {
  return createSnake({ cols: state.cols, rows: state.rows, rate: state.baseRate, mode: modeValue(mode), best: Math.max(state.best, state.score) }, random);
}
export function stepSnake(state, random = Math.random) {
  if (state.status !== 'running') return state;
  const direction = state.queued ?? state.direction, vector = DIRECTIONS[direction];
  const head = { x: state.body[0].x + vector[0], y: state.body[0].y + vector[1] };
  if (state.mode === 'portal') {
    head.x = (head.x + state.cols) % state.cols;
    head.y = (head.y + state.rows) % state.rows;
  }
  const eat = state.food !== null && same(head, state.food);
  const eatBonus = state.bonus !== null && same(head, state.bonus);
  const occupied = eat ? state.body : state.body.slice(0, -1);
  if (head.x < 0 || head.x >= state.cols || head.y < 0 || head.y >= state.rows
    || state.walls.some(p => same(p, head)) || occupied.some(p => same(p, head))) {
    return { ...state, status: 'gameover', remainder: 0, queued: null };
  }
  const body = [head, ...state.body.map(p => ({ ...p }))];
  if (!eat) body.pop();
  const eaten = state.eaten + (eat ? 1 : 0);
  const score = state.score + (eat ? 10 : 0) + (eatBonus ? 30 : 0);
  let bonus = eatBonus ? null : state.bonus;
  let food = eat ? placeFood(bonus ? [...body, bonus] : body, state.cols, state.rows, random, state.walls) : state.food;
  // A bonus must never reserve the last cell and prevent normal completion.
  if (eat && food === null && bonus) {
    bonus = null; food = placeFood(body, state.cols, state.rows, random, state.walls);
  }
  if (eat && eaten % 4 === 0 && bonus === null && food) {
    bonus = placeFood([...body, food], state.cols, state.rows, random, state.walls);
  }
  return { ...state, body, direction, queued: null, food, bonus, eaten, score,
    best: Math.max(state.best, score), rate: Math.min(20, state.baseRate + Math.floor(score / 50)),
    status: food === null ? 'won' : 'running' };
}

export function advanceSnake(state, deltaMs, random = Math.random) {
  if (state.status !== 'running' || !Number.isFinite(deltaMs) || deltaMs <= 0) return state;
  let next = { ...state, remainder: state.remainder + Math.min(250, deltaMs) };
  while (next.status === 'running' && next.remainder + 1e-8 >= 1000 / next.rate) {
    next = stepSnake({ ...next, remainder: Math.max(0, next.remainder - 1000 / next.rate) }, random);
  }
  return next;
}
