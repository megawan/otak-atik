import { LEVELS, generate, PEERS, candMask, conflicts } from './engine.js';

const $ = (s) => document.querySelector(s);
const SAVE_KEY = 'otak-atik.sudoku.game';
const BEST_KEY = 'otak-atik.sudoku.best';

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* penyimpanan tidak tersedia: game tetap jalan */ }
  },
};

const els = {
  board: $('#board'),
  levels: $('#levels'),
  pad: $('#pad'),
  time: $('#time'),
  status: $('#status'),
  loading: $('#loading'),
  notes: $('#notes'),
  win: $('#win'),
  winText: $('#win-text'),
};

let S = null; // {level, puzzle, solution, cells, notes, seconds, hints, done}
let selected = -1;
let noteMode = false;
let history = [];
let wrongMarks = new Set();
let busy = false;

// ---------- build ----------
const cellEls = [];
for (let i = 0; i < 81; i++) {
  const r = (i / 9) | 0;
  const c = i % 9;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'cell' + (c % 3 === 0 ? ' bl' : '') + (r % 3 === 0 ? ' bt' : '');
  b.dataset.r = r;
  b.dataset.c = c;
  b.setAttribute('role', 'gridcell');
  b.innerHTML = '<span class="v"></span><span class="notes">' + '<span></span>'.repeat(9) + '</span>';
  b.addEventListener('click', () => select(i));
  els.board.appendChild(b);
  cellEls.push(b);
}

for (const [key, lv] of Object.entries(LEVELS)) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = lv.label;
  b.dataset.level = key;
  b.addEventListener('click', () => chooseLevel(key));
  els.levels.appendChild(b);
}

const padEls = [];
for (let d = 1; d <= 9; d++) {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `${d}<small></small>`;
  b.setAttribute('aria-label', `Angka ${d}`);
  b.addEventListener('click', () => input(d));
  els.pad.appendChild(b);
  padEls.push(b);
}

// ---------- state ----------
function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function persist() {
  if (S) store.set(SAVE_KEY, { ...S, noteMode });
}

function validSave(g) {
  const arr = (a) => Array.isArray(a) && a.length === 81 && a.every((v) => Number.isInteger(v) && v >= 0 && v <= 511);
  return g && LEVELS[g.level] && arr(g.puzzle) && arr(g.solution) && arr(g.cells) && arr(g.notes)
    && Number.isInteger(g.seconds) && Number.isInteger(g.hints);
}

function start(game) {
  S = game;
  selected = -1;
  history = [];
  wrongMarks = new Set();
  setStatus('');
  render();
  persist();
}

function newGame(levelKey) {
  if (busy) return;
  busy = true;
  els.loading.hidden = false;
  // Beri browser kesempatan menggambar "Menyiapkan…" sebelum generator berjalan.
  setTimeout(() => {
    const g = generate(levelKey);
    start({
      level: levelKey,
      puzzle: g.puzzle,
      solution: g.solution,
      cells: g.puzzle.slice(),
      notes: new Array(81).fill(0),
      seconds: 0,
      hints: 0,
      done: false,
    });
    els.loading.hidden = true;
    busy = false;
  }, 30);
}

function hasProgress() {
  return S && !S.done && S.cells.some((v, i) => v && !S.puzzle[i]);
}

function chooseLevel(key) {
  if (key === S?.level && !hasProgress()) return newGame(key);
  if (hasProgress() && !confirm('Mulai game baru? Progres game ini akan hilang.')) return;
  newGame(key);
}

function setStatus(msg) {
  els.status.textContent = msg;
}

// ---------- render ----------
function render() {
  const bad = conflicts(S.cells);
  const selVal = selected >= 0 ? S.cells[selected] : 0;
  const peers = selected >= 0 ? new Set(PEERS[selected]) : new Set();
  const counts = new Array(10).fill(0);

  for (let i = 0; i < 81; i++) {
    const el = cellEls[i];
    const v = S.cells[i];
    const given = S.puzzle[i] !== 0;
    counts[v]++;
    el.querySelector('.v').textContent = v || '';
    el.classList.toggle('given', given);
    el.classList.toggle('sel', i === selected);
    el.classList.toggle('peer', i !== selected && peers.has(i));
    el.classList.toggle('same', i !== selected && selVal > 0 && v === selVal);
    el.classList.toggle('bad', bad.has(i) && !given);
    el.classList.toggle('wrong', wrongMarks.has(i));
    const noteSpans = el.querySelectorAll('.notes span');
    for (let d = 0; d < 9; d++) noteSpans[d].textContent = !v && S.notes[i] & (1 << d) ? d + 1 : '';
    const r = ((i / 9) | 0) + 1;
    const c = (i % 9) + 1;
    el.setAttribute('aria-label', `Baris ${r}, kolom ${c}, ${v ? (given ? 'angka ' + v + ', petunjuk' : 'angka ' + v) : 'kosong'}`);
    el.tabIndex = i === (selected >= 0 ? selected : 0) ? 0 : -1;
  }

  padEls.forEach((b, k) => {
    const left = 9 - counts[k + 1];
    b.disabled = left <= 0;
    b.querySelector('small').textContent = left > 0 ? left : '';
  });
  for (const b of els.levels.children) b.setAttribute('aria-pressed', String(b.dataset.level === S.level));
  els.notes.setAttribute('aria-pressed', String(noteMode));
  els.notes.textContent = `✎ Catatan: ${noteMode ? 'nyala' : 'mati'}`;
  els.time.textContent = fmt(S.seconds);
}

// ---------- actions ----------
function select(i) {
  if (!S || S.done) return;
  selected = i;
  render();
  cellEls[i].focus({ preventScroll: true });
}

function snapshot() {
  history.push({ cells: S.cells.slice(), notes: S.notes.slice() });
  if (history.length > 200) history.shift();
}

function input(d) {
  if (!S || S.done || selected < 0 || S.puzzle[selected]) return;
  wrongMarks.clear();
  snapshot();
  if (noteMode) {
    if (!S.cells[selected]) S.notes[selected] ^= 1 << (d - 1);
  } else {
    S.cells[selected] = d;
    S.notes[selected] = 0;
    for (const j of PEERS[selected]) S.notes[j] &= ~(1 << (d - 1));
  }
  afterChange();
}

function erase() {
  if (!S || S.done || selected < 0 || S.puzzle[selected]) return;
  if (!S.cells[selected] && !S.notes[selected]) return;
  wrongMarks.clear();
  snapshot();
  S.cells[selected] = 0;
  S.notes[selected] = 0;
  afterChange();
}

function undo() {
  if (!S || S.done || !history.length) return;
  const h = history.pop();
  S.cells = h.cells;
  S.notes = h.notes;
  wrongMarks.clear();
  afterChange();
}

function hint() {
  if (!S || S.done) return;
  let i = selected;
  if (i < 0 || S.puzzle[i] || S.cells[i] === S.solution[i]) {
    // Pilih sel kosong yang hanya punya satu kandidat; kalau tidak ada, sel kosong pertama.
    const empties = S.cells.map((v, k) => (v === 0 ? k : -1)).filter((k) => k >= 0);
    const wrongs = S.cells.map((v, k) => (v && v !== S.solution[k] ? k : -1)).filter((k) => k >= 0);
    const pool = wrongs.length ? wrongs : empties;
    if (!pool.length) return;
    i = pool.find((k) => {
      const m = candMask(S.cells, k);
      return m && (m & (m - 1)) === 0;
    }) ?? pool[0];
  }
  wrongMarks.clear();
  snapshot();
  S.cells[i] = S.solution[i];
  S.notes[i] = 0;
  for (const j of PEERS[i]) S.notes[j] &= ~(1 << (S.solution[i] - 1));
  S.hints++;
  selected = i;
  afterChange();
  setStatus(`Petunjuk dipakai: ${S.hints}`);
}

function check() {
  if (!S || S.done) return;
  wrongMarks = new Set(S.cells.map((v, k) => (v && v !== S.solution[k] ? k : -1)).filter((k) => k >= 0));
  render();
  setStatus(wrongMarks.size ? `${wrongMarks.size} angka salah ditandai merah.` : 'Semua angka yang terisi sudah benar.');
}

function afterChange() {
  if (S.cells.every((v, i) => v === S.solution[i])) return win();
  if (S.cells.every(Boolean)) setStatus('Semua kotak terisi, tapi masih ada angka yang salah.');
  else if (!els.status.textContent.startsWith('Petunjuk')) setStatus('');
  render();
  persist();
}

function win() {
  S.done = true;
  const best = store.get(BEST_KEY, {});
  let msg = `Level ${LEVELS[S.level].label}, waktu ${fmt(S.seconds)}, petunjuk dipakai ${S.hints}.`;
  if (S.hints === 0) {
    if (best[S.level] === undefined || S.seconds < best[S.level]) {
      msg += best[S.level] === undefined ? ' Rekor pertamamu.' : ' Rekor baru!';
      best[S.level] = S.seconds;
      store.set(BEST_KEY, best);
    } else {
      msg += ` Rekormu: ${fmt(best[S.level])}.`;
    }
  } else {
    msg += ' Rekor hanya dihitung tanpa petunjuk.';
  }
  render();
  persist();
  els.winText.textContent = msg;
  els.win.showModal();
}

// ---------- events ----------
$('#undo').addEventListener('click', undo);
$('#erase').addEventListener('click', erase);
$('#hint').addEventListener('click', hint);
$('#check').addEventListener('click', check);
els.notes.addEventListener('click', () => {
  noteMode = !noteMode;
  render();
  persist();
});
els.win.addEventListener('close', () => {
  if (els.win.returnValue === 'again') newGame(S.level);
});

document.addEventListener('keydown', (e) => {
  if (!S || e.metaKey || e.ctrlKey || e.altKey || els.win.open) return;
  const k = e.key;
  if (/^[1-9]$/.test(k)) input(+k);
  else if (k === '0' || k === 'Backspace' || k === 'Delete') erase();
  else if (k === 'n' || k === 'N') els.notes.click();
  else if (k === 'z' || k === 'Z') undo();
  else if (k === 'h' || k === 'H') hint();
  else if (k.startsWith('Arrow')) {
    const base = selected < 0 ? 40 : selected;
    const r = (base / 9) | 0;
    const c = base % 9;
    const nr = Math.min(8, Math.max(0, r + (k === 'ArrowDown') - (k === 'ArrowUp')));
    const nc = Math.min(8, Math.max(0, c + (k === 'ArrowRight') - (k === 'ArrowLeft')));
    select(nr * 9 + nc);
  } else return;
  e.preventDefault();
});

// Timer: hanya berjalan saat tab terlihat dan game belum selesai.
setInterval(() => {
  if (!S || S.done || document.hidden || busy) return;
  S.seconds++;
  els.time.textContent = fmt(S.seconds);
  if (S.seconds % 5 === 0) persist();
}, 1000);
document.addEventListener('visibilitychange', () => document.hidden && persist());

// ---------- init ----------
const saved = store.get(SAVE_KEY, null);
if (validSave(saved) && !saved.done) {
  noteMode = !!saved.noteMode;
  start(saved);
} else {
  newGame(saved && LEVELS[saved.level] ? saved.level : 'newbie');
}
