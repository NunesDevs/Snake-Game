export const validScore = value => Number.isSafeInteger(value) && value >= 0 && value <= 1e9;

export function formatScore(value) {
  if (!validScore(value)) return '—';
  if (value < 100000) return String(value).padStart(5, '0');
  if (value < 1e6) return Math.floor(value / 1000) + 'k';
  if (value < 1e9) return Number((value / 1e6).toFixed(1)) + 'M';
  return '1B';
}

export function readBest(id, win = window) {
  try {
    const value = win.localStorage.getItem('nd-best:' + id);
    if (value === null || !/^\d+$/.test(value)) return 0;
    const score = Number(value);
    return validScore(score) ? score : 0;
  } catch {
    // A sandboxed iframe has an opaque origin and may not access storage.
    return 0;
  }
}

export function connectScoreBridge({ id, getBest, onBest, onPause, win = window }) {
  if (!['dino', 'snake'].includes(id)) throw new RangeError('Unknown game');
  let lastReported = 0;
  function persist(score) {
    try { win.localStorage.setItem('nd-best:' + id, String(score)); } catch { /* Parent owns persistence in an opaque iframe. */ }
  }
  function report() {
    const score = getBest();
    if (!validScore(score) || score <= lastReported) return;
    lastReported = score;
    persist(score);
    if (win.parent !== win) win.parent.postMessage({ type: 'nd:score', id, score }, '*');
  }
  function receive(event) {
    if (win.parent === win || event.source !== win.parent) return;
    const data = event.data;
    if (!data || typeof data !== 'object' || data.id !== id) return;
    if (data.type === 'nd:pause') { onPause(); report(); }
    if (data.type === 'nd:best' && validScore(data.score) && data.score > getBest()) {
      onBest(data.score);
      lastReported = Math.max(lastReported, data.score);
      persist(data.score);
    }
  }
  win.addEventListener('message', receive);
  report();
  return { report, dispose() { win.removeEventListener('message', receive); } };
}

export function connectResizeBridge({ id, element, win = window }) {
  if (!['dino', 'snake', 'bubble-sort'].includes(id) || !element) throw new TypeError('Expected a known playable and its content wrapper');
  let frame = 0, lastHeight = 0;
  function send() {
    frame = 0;
    const height = Math.min(1800, Math.max(320, Math.ceil(element.getBoundingClientRect().height)));
    if (height === lastHeight || win.parent === win) return;
    lastHeight = height;
    win.parent.postMessage({ type: 'nd:resize', id, height }, '*');
  }
  function schedule() { if (!frame) frame = win.requestAnimationFrame(send); }
  const observer = new win.ResizeObserver(schedule);
  observer.observe(element);
  schedule();
  return { dispose() { observer.disconnect(); if (frame) win.cancelAnimationFrame(frame); } };
}
