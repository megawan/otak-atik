// Mesin sudoku murni: tanpa DOM, bisa dites dengan Node.
// Papan = array 81 angka (0 = kosong), indeks = baris * 9 + kolom.

const ALL = 0x1ff;
const bit = (d) => 1 << (d - 1);

const POP = new Uint8Array(512);
const DIG = new Uint8Array(512); // digit untuk mask satu-bit
for (let m = 1; m < 512; m++) POP[m] = POP[m >> 1] + (m & 1);
for (let d = 1; d <= 9; d++) DIG[bit(d)] = d;

const row = (i) => (i / 9) | 0;
const col = (i) => i % 9;
const box = (i) => (((row(i) / 3) | 0) * 3) + ((col(i) / 3) | 0);

export const UNITS = [];
for (let k = 0; k < 9; k++) {
  UNITS.push(Array.from({ length: 9 }, (_, j) => k * 9 + j));
  UNITS.push(Array.from({ length: 9 }, (_, j) => j * 9 + k));
  const r0 = ((k / 3) | 0) * 3;
  const c0 = (k % 3) * 3;
  UNITS.push(Array.from({ length: 9 }, (_, j) => (r0 + ((j / 3) | 0)) * 9 + c0 + (j % 3)));
}

export const PEERS = Array.from({ length: 81 }, (_, i) => {
  const s = new Set();
  for (const u of UNITS) if (u.includes(i)) for (const j of u) if (j !== i) s.add(j);
  return [...s];
});

// target = jumlah petunjuk yang dikejar generator, max = batas terima.
// tech    = teknik yang harus cukup untuk menyelesaikan puzzle.
// stall   = [min, max] sel kosong yang tersisa setelah teknik single buntu
//           (untuk level yang butuh lebih dari single).
export const LEVELS = {
  newbie: { label: 'Newbie', target: 44, max: 46, tech: 'naked' },
  mudah: { label: 'Mudah', target: 36, max: 38, tech: 'singles' },
  sedang: { label: 'Sedang', target: 30, max: 34, tech: 'singles' },
  sulit: { label: 'Sulit', target: 26, max: 30, stall: [1, 36] },
  extreme: { label: 'Extreme', target: 22, max: 25, stall: [37, 81] },
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Bitmask angka yang masih mungkin untuk sel i.
export function candMask(g, i) {
  let m = ALL;
  for (const j of PEERS[i]) if (g[j]) m &= ~bit(g[j]);
  return m;
}

// Cari solusi dengan backtracking (sel dengan kandidat paling sedikit dulu).
// Berhenti setelah `limit` solusi. Dengan rng, urutan angka diacak.
export function solve(grid, limit = 1, rng = null) {
  const cells = grid.slice();
  const rows = new Array(9).fill(0);
  const cols = new Array(9).fill(0);
  const boxes = new Array(9).fill(0);
  for (let i = 0; i < 81; i++) {
    if (cells[i]) {
      const b = bit(cells[i]);
      rows[row(i)] |= b;
      cols[col(i)] |= b;
      boxes[box(i)] |= b;
    }
  }
  const state = { count: 0, solution: null };

  const search = () => {
    let best = -1;
    let bestMask = 0;
    let bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (cells[i]) continue;
      const m = ALL & ~(rows[row(i)] | cols[col(i)] | boxes[box(i)]);
      const n = POP[m];
      if (n === 0) return;
      if (n < bestN) {
        best = i;
        bestMask = m;
        bestN = n;
        if (n === 1) break;
      }
    }
    if (best < 0) {
      state.count++;
      if (!state.solution) state.solution = cells.slice();
      return;
    }
    const digits = [];
    for (let d = 1; d <= 9; d++) if (bestMask & bit(d)) digits.push(d);
    if (rng) shuffle(digits, rng);
    const r = row(best);
    const c = col(best);
    const b = box(best);
    for (const d of digits) {
      const m = bit(d);
      cells[best] = d;
      rows[r] |= m;
      cols[c] |= m;
      boxes[b] |= m;
      search();
      rows[r] &= ~m;
      cols[c] &= ~m;
      boxes[b] &= ~m;
      cells[best] = 0;
      if (state.count >= limit) return;
    }
  };
  search();
  return state;
}

export const countSolutions = (grid, limit = 2) => solve(grid, limit).count;

// Selesaikan hanya dengan teknik manusia paling dasar.
//   hidden=false: hanya naked single (sel dengan satu kandidat)
//   hidden=true : ditambah hidden single (angka yang hanya punya satu tempat di baris/kolom/kotak)
export function solveBySingles(puzzle, hidden = true) {
  const g = puzzle.slice();
  let progress = true;
  while (progress) {
    progress = false;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = candMask(g, i);
      if (m === 0) return { solved: false, grid: g };
      if (POP[m] === 1) {
        g[i] = DIG[m];
        progress = true;
      }
    }
    if (!progress && hidden) {
      for (const unit of UNITS) {
        for (let d = 1; d <= 9; d++) {
          let placed = false;
          let pos = -1;
          let n = 0;
          for (const i of unit) {
            if (g[i] === d) {
              placed = true;
              break;
            }
            if (!g[i] && candMask(g, i) & bit(d)) {
              pos = i;
              n++;
            }
          }
          if (!placed && n === 1) {
            g[pos] = d;
            progress = true;
          }
        }
      }
    }
  }
  return { solved: g.every(Boolean), grid: g };
}

export function isValidSolved(g) {
  if (g.length !== 81 || g.some((v) => !(v >= 1 && v <= 9))) return false;
  return UNITS.every((u) => new Set(u.map((i) => g[i])).size === 9);
}

// Indeks sel terisi yang bertabrakan dengan sel lain di baris/kolom/kotak yang sama.
export function conflicts(cells) {
  const bad = new Set();
  for (let i = 0; i < 81; i++) {
    if (!cells[i]) continue;
    for (const j of PEERS[i]) {
      if (cells[j] === cells[i]) {
        bad.add(i);
        bad.add(j);
      }
    }
  }
  return bad;
}

// Setiap level punya syarat bentuk, lalu dicek ulang sebelum dikembalikan:
//   newbie  : solusi tunggal, selesai hanya dengan naked single
//   mudah, sedang: solusi tunggal, selesai dengan naked + hidden single
//   sulit   : solusi tunggal, single buntu dengan sedikit sel tersisa
//   extreme : solusi tunggal, petunjuk paling sedikit, single buntu dengan
//             banyak sel tersisa (butuh teknik lanjutan atau coba-coba)
function accepts(level, puzzle, clues) {
  if (clues > level.max) return false;
  if (level.stall) {
    const left = solveBySingles(puzzle, true).grid.filter((v) => !v).length;
    return left >= level.stall[0] && left <= level.stall[1];
  }
  return true;
}

function makeAttempt(level, rng) {
  const solution = solve(new Array(81).fill(0), 1, rng).solution;
  const puzzle = solution.slice();
  let clues = 81;
  for (const i of shuffle(Array.from({ length: 81 }, (_, k) => k), rng)) {
    if (clues <= level.target) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    const ok =
      countSolutions(puzzle, 2) === 1 &&
      (level.tech === 'naked'
        ? solveBySingles(puzzle, false).solved
        : level.tech === 'singles'
          ? solveBySingles(puzzle, true).solved
          : true);
    if (ok) clues--;
    else puzzle[i] = keep;
  }
  return { puzzle, solution, clues };
}

export function generate(levelKey, rng = Math.random, maxAttempts = 300) {
  const level = LEVELS[levelKey];
  if (!level) throw new Error(`Level tidak dikenal: ${levelKey}`);
  let best = null;
  for (let n = 0; n < maxAttempts; n++) {
    const r = makeAttempt(level, rng);
    if (accepts(level, r.puzzle, r.clues)) return { ...r, level: levelKey };
    if (!best || r.clues < best.clues) best = r;
  }
  return { ...best, level: levelKey };
}
