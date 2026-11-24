# otak-atik

A collection of puzzles for adults. Static pages with no build step and no dependencies, served with GitHub Pages at https://megawan.github.io/otak-atik/. Progress is saved in the browser's `localStorage`; nothing is sent to a server.

The name *otak-atik* is Indonesian for "to tinker", as in tinkering with a problem until it works.

## Puzzles

| Folder | Puzzle |
| --- | --- |
| [`sudoku/`](sudoku) | Sudoku in five levels: Newbie, Easy, Medium, Hard, Extreme. Pencil notes, undo, hints, check, timer, best time per level, and a game that resumes after the page is closed. |
| [`rush-hour/`](rush-hour) | Rush Hour: slide the cars out of a traffic jam and drive the red car out. Sixty levels in six tiers (Newbie to Extreme), undo, restart, stars for the fewest moves and best moves saved per level. |

## Sudoku levels

The generator builds puzzles with a unique solution, then rates difficulty with a human-technique solver (`solveBySingles`) instead of only counting clues:

| Level | Clues | Requirement |
| --- | --- | --- |
| Newbie | ≤ 46 | Solvable with naked singles only |
| Easy | ≤ 38 | Solvable with naked + hidden singles |
| Medium | ≤ 34 | Solvable with naked + hidden singles |
| Hard | ≤ 30 | Singles get stuck, 1–36 cells left |
| Extreme | ≤ 25 | Singles get stuck, 37+ cells left (needs advanced techniques or guessing) |

This is a simple difficulty measure. Advanced techniques such as pairs, X-wing or chains are not rated one by one.

## Rush Hour levels

Levels are fixed boards in `rush-hour/levels.js`, ten per tier, ordered by the fewest moves needed (one move slides one car any distance). The tests solve every level with a breadth-first search and check that the stored number is exact:

| Tier | Fewest moves |
| --- | --- |
| Newbie | 3–7 |
| Easy | 8–12 |
| Medium | 13–18 |
| Hard | 19–25 |
| Expert | 26–33 |
| Extreme | 34–40 |

Three stars for the fewest moves, two for up to half as many again, otherwise one.

## Motion

Animations use [Motion](https://motion.dev) (MIT), vendored as a single file in `shared/vendor/motion.js` so the site still needs no build step, network or install. `shared/fx.js` wraps it and skips every effect when the visitor prefers reduced motion. To update, bundle `animate, stagger, hover, press, spring` from the `motion` package with esbuild (`--bundle --minify --format=esm`).

## Running locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. The pages use ES modules, so they do not work from `file://`.

## Tests

```bash
npm test
```

Uses Node's built-in test runner (no dependencies). The tests check unique solutions, clue counts and the technique requirement of every level.

## Adding a puzzle

Create a new folder (for example `nonogram/`) with an `index.html`, add a card to the root `index.html`, and use `shared/style.css` to keep the look consistent. Save progress under keys named `otak-atik.<puzzle>.*`.
