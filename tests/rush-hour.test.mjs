import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../rush-hour/levels.js';
import { N, EXIT_ROW, TIERS, parse, reach, solve, isSolved, starsFor } from '../rush-hour/engine.js';

const all = TIERS.flatMap((t) => LEVELS[t.id].map((lv, n) => ({ ...lv, name: `${t.id} ${n + 1}`, tier: t.id })));

test('there are ten levels in each tier', () => {
  for (const t of TIERS) assert.equal(LEVELS[t.id].length, 10, t.id);
});

test('every level is a valid board with the red car on the exit row', () => {
  for (const lv of all) {
    assert.equal(lv.board.length, N * N, lv.name);
    const cars = parse(lv.board);
    assert.ok(cars.every((c) => c.len === 2 || c.len === 3), lv.name);
    assert.equal(cars[0].v, false, lv.name);
    assert.equal(cars[0].f, EXIT_ROW, lv.name);
    assert.equal(cars[0].len, 2, lv.name);
    assert.ok(!isSolved(cars, cars.map((c) => c.p)), `${lv.name} starts solved`);
  }
});

test('every level can be solved in exactly the fewest moves it claims', () => {
  for (const lv of all) assert.equal(solve(parse(lv.board)), lv.min, lv.name);
});

test('levels get harder within a tier and from tier to tier', () => {
  const mins = all.map((lv) => lv.min);
  assert.deepEqual(mins, [...mins].sort((a, b) => a - b));
});

test('reach stops at the board edge and at other cars', () => {
  // The red car (AA) is at the left of row 3 with another car (BB) at columns 4 and 5 of the same row.
  const cars = parse('............AA.BB...................');
  const pos = cars.map((c) => c.p);
  assert.deepEqual(reach(cars, pos, 0), [0, 1]);
  assert.deepEqual(reach(cars, pos, 1), [2, 4]);
});

test('solve reports a board that cannot be solved', () => {
  // A car of three cells in column 4 is wedged between full rows above and below, so it always blocks the exit row.
  const cars = parse('CCDDEE...B..AA.B.....B..FFGGHH......');
  assert.equal(solve(cars), -1);
});

test('stars: fewest moves is three, up to half as many again is two', () => {
  assert.equal(starsFor(10, 10), 3);
  assert.equal(starsFor(15, 10), 2);
  assert.equal(starsFor(16, 10), 1);
});
