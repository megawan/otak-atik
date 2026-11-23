import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVELS, generate, solve, countSolutions, solveBySingles, isValidSolved, conflicts, mulberry32,
} from '../sudoku/engine.js';

const EMPTY = new Array(81).fill(0);

test('solve mengisi papan kosong dengan solusi valid', () => {
  const { solution, count } = solve(EMPTY, 1, mulberry32(1));
  assert.equal(count, 1);
  assert.ok(isValidSolved(solution));
});

test('countSolutions menghitung lebih dari satu untuk papan kosong', () => {
  assert.equal(countSolutions(EMPTY, 2), 2);
});

test('conflicts menandai angka kembar di baris/kolom/kotak', () => {
  const g = EMPTY.slice();
  g[0] = 5;
  g[8] = 5; // baris sama
  g[40] = 5; // aman
  assert.deepEqual([...conflicts(g)].sort((a, b) => a - b), [0, 8]);
});

for (const [key, level] of Object.entries(LEVELS)) {
  test(`level ${key}: solusi tunggal, petunjuk <= ${level.max}, sesuai teknik`, () => {
    for (const seed of [11, 22]) {
      const { puzzle, solution, clues } = generate(key, mulberry32(seed));
      assert.ok(isValidSolved(solution));
      assert.equal(puzzle.filter(Boolean).length, clues);
      assert.ok(puzzle.every((v, i) => v === 0 || v === solution[i]), 'petunjuk cocok dengan solusi');
      assert.equal(countSolutions(puzzle, 2), 1, 'solusi harus tunggal');
      assert.ok(clues <= level.max, `petunjuk ${clues} > ${level.max}`);
      if (level.tech === 'naked') assert.ok(solveBySingles(puzzle, false).solved);
      if (level.tech === 'singles') assert.ok(solveBySingles(puzzle, true).solved);
      if (level.stall) {
        const left = solveBySingles(puzzle, true).grid.filter((v) => !v).length;
        assert.ok(left >= level.stall[0] && left <= level.stall[1], `sisa ${left}`);
      }
    }
  });
}
