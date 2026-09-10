# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vanilla-JS Tetris (HTML5 Canvas + CSS). No dependencies, no `package.json`, no build step, no test suite, no linter.

## Running

Open `index.html` directly (`xdg-open index.html`), or serve statically for a more browser-faithful environment:

```bash
python3 -m http.server 8000   # then http://localhost:8000
```

There is nothing to build or install; edits are live on reload.

## Architecture

Three files: `index.html` (DOM + two canvases), `style.css` (dark arcade theme), `game.js` (all logic, ~300 lines, module-free script with top-level `let` state).

Key design decisions that span the code:

- **Cell values are color indices.** A board cell and a piece cell hold `0` (empty) or `1..7`. That same integer indexes both `PIECES` and `COLORS`, so a piece's shape matrix is pre-filled with its own type number and `drawBlock` needs no extra type argument. Adding a piece means appending to *both* arrays at the same index and filling its matrix with that index.
- **Rotation is pure matrix transform + kick.** `rotateCW` transposes/reverses the square matrix; `tryRotate` retries the result at x-offsets `[0,-1,1,-2,2]` and silently drops the rotation if all collide. There is no SRS kick table and no rotation-state tracking.
- **Line clears mutate the board array itself** (`splice` + `unshift` in `clearLines`), so row objects shift — never hold a reference to a row across a clear.
- **Single `collide(shape, ox, oy)` predicate** backs movement, rotation, ghost projection, hard drop, and game-over detection. Any new mechanic should go through it rather than re-checking bounds. It deliberately allows `ny < 0` (piece partly above the board) but never `nx` out of range.
- **Game loop** is `requestAnimationFrame` with a `dropAccum` accumulator against `dropInterval`; `dropAccum` is reset to `0` (not decremented) on each drop step. Level/speed are recomputed only inside `clearLines`: `level = floor(lines/10)+1`, `dropInterval = max(100, 1000 - (level-1)*90)`.
- **`init()` is the single reset path** — it is called at load and by the restart button, and re-initializes every top-level `let`. New state must be reset there or it leaks across games.

Known quirk: `endGame()` calls `cancelAnimationFrame`, but it is reached from inside `loop()`, which then schedules the next frame anyway — the loop keeps running behind the Game Over overlay (input is blocked by the `gameOver` guard in the keydown handler). Worth knowing before debugging anything timing-related after a loss.

## Conventions

- User-facing strings and README are in Spanish; code identifiers and comments are English/Spanish-mixed as in `game.js`.
- Canvas size is hard-coded in `index.html` (`300x600`) and must stay equal to `COLS*BLOCK` x `ROWS*BLOCK` from `game.js`; changing board dimensions requires editing both files. The next-piece preview assumes a 4x4 area at `NB = 30` against the 120x120 `#next-canvas`.
