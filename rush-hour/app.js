import { LEVELS } from './levels.js';
import { carSvg } from './car-art.js';
import { play, rise, interactive, spring } from '../shared/fx.js';
import { N, TIERS, parse, reach, isSolved, starsFor } from './engine.js';

const $ = (s) => document.querySelector(s);
const el = (tag, cls) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
};
const SAVE_KEY = 'otak-atik.rush-hour.best';
const COLORS = ['#c8372d', '#3f8fd2', '#e0a21f', '#4aa564', '#8d5fc9', '#e8793a', '#2fa5a0', '#d9558f', '#7f8c3a', '#5a6bd6', '#a8744a', '#6e7f8d', '#c2c04a'];

// Best moves per level: { 'newbie-1': 3, ... }
const best = (() => {
  let data = {};
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch { /* no saved progress */ }
  return {
    get: (id) => data[id] || 0,
    set(id, moves) {
      if (data[id] && data[id] <= moves) return;
      data[id] = moves;
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* storage unavailable: the game still works */ }
    },
  };
})();

const levelId = (ti, n) => `${TIERS[ti].id}-${n + 1}`;
const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
const boardEl = $('#board');
let G = null; // {ti, n, min, cars, start, pos, hist, busy, els}

// ---- level list ----
function renderMenu() {
  const root = $('#tiers');
  root.textContent = '';
  let got = 0;
  let all = 0;
  TIERS.forEach((t, ti) => {
    const sec = el('div', 'tier');
    const h = el('h2');
    const small = el('small');
    h.append(t.name, small);
    const p = el('p', 'muted');
    p.textContent = t.note;
    const grid = el('div', 'levels');
    let tierStars = 0;
    LEVELS[t.id].forEach((lv, n) => {
      const moves = best.get(levelId(ti, n));
      const s = moves ? starsFor(moves, lv.min) : 0;
      tierStars += s;
      all += 3;
      const b = el('button', 'lv' + (moves ? ' done' : ''));
      b.type = 'button';
      b.innerHTML = '<b></b><span aria-hidden="true"></span>';
      b.firstChild.textContent = n + 1;
      b.lastChild.textContent = moves ? starText(s) : '';
      b.setAttribute('aria-label', `${t.name} level ${n + 1}${moves ? `, ${s} of 3 stars` : ', not played yet'}`);
      b.addEventListener('click', () => start(ti, n));
      grid.append(b);
    });
    got += tierStars;
    small.textContent = `${tierStars} / ${LEVELS[t.id].length * 3} stars`;
    sec.append(h, p, grid);
    root.append(sec);
  });
  $('#total').textContent = `${got} / ${all} stars`;
  rise(root.children, { gap: 0.05, from: 14 });
  interactive('.lv', { lift: 1.06, sink: 0.94 });
}

// ---- play ----
function start(ti, n) {
  const lv = LEVELS[TIERS[ti].id][n];
  const cars = parse(lv.board);
  G = { ti, n, min: lv.min, cars, start: cars.map((c) => c.p), pos: cars.map((c) => c.p), hist: [], busy: false, els: [] };
  boardEl.querySelectorAll('.car').forEach((e) => e.remove());
  $('#title').textContent = `${TIERS[ti].name} ${n + 1}`;
  $('#best').textContent = lv.min;
  $('#menu').hidden = true;
  $('#play').hidden = false;
  cars.forEach((c, i) => {
    const b = el('button', `car ${c.v ? 'v' : 'h'}${i === 0 ? ' red' : ''}`);
    b.type = 'button';
    b.style.setProperty('--c', COLORS[i === 0 ? 0 : 1 + ((i - 1) % (COLORS.length - 1))]);
    b.innerHTML = carSvg(c, i);
    bindCar(b, i);
    boardEl.append(b);
    G.els.push(b);
  });
  render();
  window.scrollTo(0, 0);
}

function render() {
  G.cars.forEach((c, i) => {
    const e = G.els[i];
    const p = G.pos[i];
    e.style.setProperty('--x', c.v ? c.f : p);
    e.style.setProperty('--y', c.v ? p : c.f);
    e.style.setProperty('--w', c.v ? 1 : c.len);
    e.style.setProperty('--h', c.v ? c.len : 1);
    e.setAttribute('aria-label', `${i === 0 ? 'Red car' : `Car ${i}`}, slides ${c.v ? 'up and down' : 'left and right'}, row ${(c.v ? p : c.f) + 1} column ${(c.v ? c.f : p) + 1}`);
  });
  $('#moves').textContent = G.hist.length;
  $('#undo').disabled = !G.hist.length || G.busy;
  $('#restart').disabled = !G.hist.length || G.busy;
}

// Slide car i to place `to`. A run of arrow-key steps on one car is one move, so `byKey` extends the last move.
function slide(i, to, byKey) {
  const last = G.hist[G.hist.length - 1];
  if (byKey && last && last.i === i && last.byKey) {
    last.to = to;
    if (to === last.from) G.hist.pop();
  } else {
    G.hist.push({ i, from: G.pos[i], to, byKey });
  }
  G.pos[i] = to;
  render();
  if (isSolved(G.cars, G.pos)) win();
}

function bindCar(e, i) {
  let d = null;
  e.addEventListener('pointerdown', (ev) => {
    if (G.busy || ev.button > 0) return;
    const [lo, hi] = reach(G.cars, G.pos, i);
    d = { x: ev.clientX, y: ev.clientY, from: G.pos[i], lo, hi, cell: boardEl.clientWidth / N, at: G.pos[i] };
    e.setPointerCapture(ev.pointerId);
    e.classList.add('drag');
  });
  e.addEventListener('pointermove', (ev) => {
    if (!d) return;
    const c = G.cars[i];
    const delta = (c.v ? ev.clientY - d.y : ev.clientX - d.x) / d.cell;
    d.at = Math.min(d.hi, Math.max(d.lo, d.from + delta));
    const px = (d.at - d.from) * d.cell;
    e.style.transform = c.v ? `translateY(${px}px)` : `translateX(${px}px)`;
  });
  const end = () => {
    if (!d) return;
    const { from } = d;
    const to = Math.round(d.at);
    d = null;
    e.style.transform = '';
    if (to !== from) slide(i, to, false); else render();
    // keep the drag class (no transition) until the new place has been painted, so the car does not slide back
    requestAnimationFrame(() => requestAnimationFrame(() => e.classList.remove('drag')));
  };
  e.addEventListener('pointerup', end);
  e.addEventListener('pointercancel', end);
  e.addEventListener('keydown', (ev) => {
    const c = G.cars[i];
    const dir = (c.v ? { ArrowUp: -1, ArrowDown: 1 } : { ArrowLeft: -1, ArrowRight: 1 })[ev.key];
    if (!dir) return;
    ev.preventDefault();
    if (G.busy) return;
    const [lo, hi] = reach(G.cars, G.pos, i);
    const to = G.pos[i] + dir;
    if (to >= lo && to <= hi) slide(i, to, true);
  });
}

function undo() {
  const m = G.hist.pop();
  if (!m || G.busy) return;
  G.pos[m.i] = m.from;
  render();
}

function restart() {
  G.hist.length = 0;
  G.pos = G.start.slice();
  render();
}

function win() {
  G.busy = true;
  render();
  const moves = G.hist.length;
  const s = starsFor(moves, G.min);
  best.set(levelId(G.ti, G.n), moves);
  const red = G.els[0];
  red.classList.add('leave');
  red.style.setProperty('--x', N + 1);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => {
    $('#win-stars').innerHTML = `${'★'.repeat(s)}<span class="off">${'★'.repeat(3 - s)}</span>`;
    $('#win-text').textContent = `${moves} ${moves === 1 ? 'move' : 'moves'}${moves <= G.min ? ', the fewest possible.' : `. The fewest possible is ${G.min}.`}`;
    $('#win-next').hidden = !nextLevel();
    $('#win').showModal();
    play('#win-stars', { scale: [0.6, 1] }, spring);
    ($('#win-next').hidden ? $('#win-menu') : $('#win-next')).focus();
  }, reduced ? 0 : 950);
}

function nextLevel() {
  const { ti, n } = G;
  if (n + 1 < LEVELS[TIERS[ti].id].length) return [ti, n + 1];
  return ti + 1 < TIERS.length ? [ti + 1, 0] : null;
}

function toMenu() {
  if ($('#win').open) $('#win').close();
  $('#play').hidden = true;
  $('#menu').hidden = false;
  G = null;
  renderMenu();
  window.scrollTo(0, 0);
}

$('#undo').addEventListener('click', undo);
$('#restart').addEventListener('click', restart);
$('#back').addEventListener('click', toMenu);
$('#win-menu').addEventListener('click', toMenu);
$('#win-again').addEventListener('click', () => { const { ti, n } = G; $('#win').close(); start(ti, n); });
$('#win-next').addEventListener('click', () => { const [ti, n] = nextLevel(); $('#win').close(); start(ti, n); });
interactive('.btn');
renderMenu();
