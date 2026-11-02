import { createSnake, startSnake, turnSnake, pauseSnake, resumeSnake, resetSnake, setSnakeRate, advanceSnake } from './engine.mjs';
import { readBest, connectScoreBridge, connectResizeBridge, formatScore } from './bridge.mjs';
import { boardLayout } from './render-layout.mjs';

const $ = id => document.getElementById(id);
const root = $('playground'), stage = $('stage'), canvas = $('world'), context = canvas.getContext('2d');
const resizeBridge = connectResizeBridge({ id: 'snake', element: root });
let game = createSnake({ best: readBest('snake') });
let frameId = 0, previous = null, lastStatus = '', pointer = null;
const bridge = connectScoreBridge({ id: 'snake', getBest: () => game.best,
  onBest: best => { game = { ...game, best }; render(); }, onPause: () => update(pauseSnake(game)) });

function paint() {
  const width = stage.clientWidth, height = stage.clientHeight;
  const layout = boardLayout(width, height, game.cols, game.rows, window.devicePixelRatio);
  if (!layout) {
    // Do not issue paths with negative geometry; ResizeObserver repaints when usable.
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  const { ratio, size, segment, radius, x, y, pixelWidth, pixelHeight } = layout;
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth; canvas.height = pixelHeight;
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);context.clearRect(0, 0, width, height);
  context.strokeStyle = '#303740';context.globalAlpha = 0.35;context.lineWidth = 1;
  context.beginPath();
  for (let c = 0; c <= game.cols; c++) { context.moveTo(x + c * size, y);context.lineTo(x + c * size, y + size * game.rows); }
  for (let r = 0; r <= game.rows; r++) { context.moveTo(x, y + r * size);context.lineTo(x + size * game.cols, y + r * size); }
  context.stroke();context.globalAlpha = 1;
  game.body.forEach((cell, index) => {
    context.fillStyle = '#007bff';context.globalAlpha = index === 0 ? 1 : 0.65;
    context.beginPath();context.roundRect(x + cell.x * size + 1, y + cell.y * size + 1, segment, segment, radius);context.fill();
  });
  context.globalAlpha = 1;
  if (game.food) { context.fillStyle = '#ffca72';context.beginPath();context.arc(x + (game.food.x + 0.5) * size, y + (game.food.y + 0.5) * size, size * 0.36, 0, Math.PI * 2);context.fill(); }
}

function render() {
  $('score').textContent = formatScore(game.score);
  $('best').textContent = formatScore(game.best);
  $('score').setAttribute('aria-label', game.score + ' pontos');
  $('best').setAttribute('aria-label', game.best + ' pontos de recorde');
  $('speed').textContent = game.rate + '/s';stage.dataset.status = game.status;
  $('toggle').textContent = game.status === 'running' ? 'Pausar' : game.status === 'paused' ? 'Continuar' : ['gameover', 'won'].includes(game.status) ? 'Jogar de novo' : 'Começar';
  $('overlay').hidden = game.status === 'running';
  if (game.status !== lastStatus) {
    lastStatus = game.status;
    const states = { ready: ['Um caminho. Muitas escolhas.', 'Coma, cresça e evite as paredes.', 'Começar'], paused: ['Jogo pausado', 'Seu próximo movimento pode esperar.', 'Continuar'], gameover: ['Fim de jogo.', game.score + ' pontos. Vamos tentar outra rota?', 'Jogar de novo'], won: ['Tabuleiro completo!', game.score + ' pontos. Caminho concluído.', 'Jogar de novo'] };
    if (states[game.status]) {
      [$('state-title').textContent, $('state-hint').textContent, $('state-action').textContent] = states[game.status];
      $('announcement').textContent = states[game.status][0] + (['gameover', 'won'].includes(game.status) ? ' ' + game.score + ' pontos.' : '');
    } else $('announcement').textContent = 'Partida iniciada.';
    if (['gameover', 'won'].includes(game.status)) bridge.report();
  }
  paint();
}

function loop(now) {
  frameId = 0;if (game.status !== 'running') return;
  game = advanceSnake(game, previous === null ? 0 : now - previous);previous = now;render();
  if (game.status === 'running') frameId = requestAnimationFrame(loop);
}
function update(next) {
  game = next;render();
  if (game.status === 'running' && !frameId) { previous = null;frameId = requestAnimationFrame(loop); }
  if (game.status !== 'running' && frameId) { cancelAnimationFrame(frameId);frameId = 0;previous = null; }
}
function action() {
  if (game.status === 'running') { update(pauseSnake(game));bridge.report(); }
  else if (game.status === 'paused') update(resumeSnake(game));
  else if (['gameover', 'won'].includes(game.status)) update(startSnake(resetSnake(game)));
  else update(startSnake(game));
  stage.focus({ preventScroll: true });
}
function direction(value) {
  if (game.status === 'paused' || ['gameover', 'won'].includes(game.status)) return;
  update(turnSnake(startSnake(game), value));stage.focus({ preventScroll: true });
}
function reset() { bridge.report();update(resetSnake(game));stage.focus({ preventScroll: true }); }
$('state-action').addEventListener('click', action);$('toggle').addEventListener('click', action);$('reset').addEventListener('click', reset);
$('rate').addEventListener('change', event => { bridge.report();update(setSnakeRate(game, Number(event.target.value))); });
document.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => direction(button.dataset.direction)));
const keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', a: 'left', s: 'down', d: 'right' };
root.addEventListener('keydown', event => {
  if (event.repeat || event.target.closest('input,select') || (event.target.closest('button') && [' ', 'Enter'].includes(event.key))) return;
  const dir = keys[event.key] ?? keys[event.key.toLowerCase()];
  if (dir) { event.preventDefault();direction(dir); }
  if (event.key === ' ' || event.key.toLowerCase() === 'p') { event.preventDefault();action(); }
  if (event.key.toLowerCase() === 'r') { event.preventDefault();reset(); }
});
stage.addEventListener('pointerdown', event => {
  if (event.target.closest('button')) return;
  pointer = { x: event.clientX, y: event.clientY, id: event.pointerId };
  stage.setPointerCapture(event.pointerId);stage.focus({ preventScroll: true });
});
stage.addEventListener('pointerup', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;pointer = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 12) direction(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
  else if (game.status === 'ready') action();
});
stage.addEventListener('pointercancel', () => { pointer = null; });
function autoPause() { update(pauseSnake(game));bridge.report(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
window.addEventListener('blur', autoPause);window.addEventListener('pagehide', () => { autoPause();bridge.dispose();resizeBridge.dispose(); });
new ResizeObserver(paint).observe(stage);render();
