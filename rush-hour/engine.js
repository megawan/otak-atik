// Pure Rush Hour engine: no DOM, testable with Node.
// A car slides along its lane: `v` is true for a car that goes up and down, `f` is the column (or row) of its lane, `len` is
// how many cells it covers and `p` is its place along the lane. Car 0 is the red car; it goes left and right on row 3 and
// leaves through the exit at the right edge of that row.

export const N = 6;
export const EXIT_ROW = 2;
export const TIERS = [
  { id: 'newbie', name: 'Newbie', note: 'A few cars in the way. Learn how it works.' },
  { id: 'easy', name: 'Easy', note: 'One or two cars to shuffle first.' },
  { id: 'medium', name: 'Medium', note: 'You have to plan a few moves ahead.' },
  { id: 'hard', name: 'Hard', note: 'Cars block cars that block cars.' },
  { id: 'expert', name: 'Expert', note: 'Long chains. Think before you slide.' },
  { id: 'extreme', name: 'Extreme', note: 'Jams that take dozens of moves to undo.' },
];

// Turns a 36-character board into cars (red first, then the rest by letter).
export function parse(board) {
  const seen = new Map();
  [...board].forEach((ch, k) => {
    if (ch === '.') return;
    const x = k % N;
    const y = (k / N) | 0;
    if (!seen.has(ch)) seen.set(ch, { ch, x, y, len: 0, v: false });
    const c = seen.get(ch);
    c.len++;
    if (c.len === 2) c.v = x === c.x; // second cell below the first: it slides up and down
  });
  const order = (a, b) => (a.ch === 'A' ? -1 : b.ch === 'A' ? 1 : a.ch < b.ch ? -1 : 1);
  return [...seen.values()].sort(order).map((c) => ({
    v: c.v, f: c.v ? c.x : c.y, len: c.len, p: c.v ? c.y : c.x,
  }));
}

export const cellOf = (c, p, k) => (c.v ? [c.f, p + k] : [p + k, c.f]);

// The car that fills each cell, or -1. Car `skip` is left out.
function occupied(cars, pos, skip = -1) {
  const g = new Int8Array(N * N).fill(-1);
  cars.forEach((c, i) => {
    if (i === skip) return;
    for (let k = 0; k < c.len; k++) {
      const [x, y] = cellOf(c, pos[i], k);
      g[y * N + x] = i;
    }
  });
  return g;
}

// The furthest places car i can slide to without leaving the board or touching another car: [lowest, highest].
export function reach(cars, pos, i) {
  const c = cars[i];
  const g = occupied(cars, pos, i);
  const free = (p, k) => {
    const [x, y] = cellOf(c, p, k);
    return g[y * N + x] < 0;
  };
  let lo = pos[i];
  let hi = pos[i];
  while (lo > 0 && free(lo - 1, 0)) lo--;
  while (hi + c.len < N && free(hi + 1, c.len - 1)) hi++;
  return [lo, hi];
}

export const isSolved = (cars, pos) => pos[0] === N - cars[0].len;

// Fewest moves from `pos` to a solved board (one move slides one car any distance), or -1 if it cannot be solved.
export function solve(cars, pos = cars.map((c) => c.p)) {
  const key = (p) => p.join(',');
  const seen = new Set([key(pos)]);
  let layer = [pos];
  for (let moves = 0; layer.length; moves++) {
    const next = [];
    for (const s of layer) {
      if (isSolved(cars, s)) return moves;
      cars.forEach((_, i) => {
        const [lo, hi] = reach(cars, s, i);
        for (let p = lo; p <= hi; p++) {
          if (p === s[i]) continue;
          const t = s.slice();
          t[i] = p;
          const k = key(t);
          if (!seen.has(k)) { seen.add(k); next.push(t); }
        }
      });
    }
    layer = next;
  }
  return -1;
}

// Three stars for the fewest moves, two for within half as many again, otherwise one.
export const starsFor = (moves, min) => (moves <= min ? 3 : moves <= min + Math.ceil(min / 2) ? 2 : 1);
