# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`文字塔防 · 五行卡牌` — a Traditional Chinese, browser-based tower defense game built on the Wu Xing (five elements) system. Towers are dragged from a hand of cards onto a grid; matching drops upgrade, mismatched drops fuse into combo towers.

No dependencies, no build step, no tests, no package manager. `index.html` + `style.css` + ES modules under `src/`, loaded via `<script type="module" src="src/main.js">`.

## Running

**Must be served over HTTP** — ES modules are blocked by CORS on `file://`, so double-clicking `index.html` shows a blank page. `localStorage` (loadout persistence) also needs a real origin.

```powershell
python -m http.server 8000   # then http://localhost:8000
```

There is nothing to build, lint, or test. Verify changes by playing: the lobby's 開始遊戲 button, then 開始下一波 for waves; `speedBtn` cycles 1x/2x/3x to reach later waves quickly.

To sanity-check module wiring without a browser, the modules can be imported in Node behind a small DOM/canvas stub and stepped with `updateGame(1/60)` in a loop — useful for catching a missing import or a crash in a late wave.

## Module layout

Roughly a dependency ladder — data at the top, entry point at the bottom:

| Module | Contents |
| --- | --- |
| `config.js` | `ELEMENTS`, `OVERCOMES`, `COMBOS`, `WAVES`, grid/economy constants. All balance lives here. |
| `path.js` | The hand-authored enemy route: `PATH_SET` (blocks building), `PATH.waypoints`, `cellCenter`. |
| `utils.js` | `dist`, color helpers (`lighten`/`darken`/`getContrastColor`), `roundRectPath`. No DOM. |
| `state.js` | The single mutable `state` object plus `towerAt` / `towerNear` / `enemyNear` / `drawRandomElement`. |
| `canvas.js` | `canvas` / `ctx` refs and `pointFromEvent` / `cellFromEvent` coordinate conversion. |
| `icons.js` | Procedural Canvas2D element art; `drawElementArt`, `drawFusedArt`, `drawCardFace`. |
| `tower.js` | Tower creation, upgrade/fuse math, targeting, firing. |
| `effects.js` | Floating text and coin particles (leaf module — keeps `combat` and `enemy` acyclic). |
| `combat.js` | Status application (`applySpecial`), damage resolution (`applyHit`), projectile stepping. |
| `enemy.js` | Spawning (incl. bosses), status decay, waypoint movement. |
| `hud.js` | `toast`, `updateUI`, topbar/modal buttons (`initHud`). |
| `tooltip.js` | All hover and drag-preview tooltip HTML. |
| `render.js` | `draw()` — the whole frame. |
| `game.js` | Wave control, `attemptDropOnCell`, `updateGame`. |
| `hand.js` | Hand card rendering and card drag-and-drop. |
| `input.js` | Canvas pointer interactions: hover, right-click sell, tower relocation (`initCanvasInput`). |
| `lobby.js` | Loadout screen and `localStorage` persistence (`initLobby`). |
| `main.js` | Entry point: init calls in order, then the `requestAnimationFrame` loop. |

Modules only *declare*; every listener registration and startup side effect is in an `init*()` exported for `main.js` to call. Keep it that way — it is what makes the intentional import cycles safe (`game.js` ↔ `hand.js`, `game.js` ↔ `hud.js`). Those cycles work because ESM hoists function-declaration bindings; a cycle that reads an imported `const` at module-evaluation time would break, so don't add top-level code that does.

`initLobby()` must run before the hand is dealt: `drawRandomElement()` draws from `state.loadout`, which `initLobby` restores from `localStorage`.

## Architecture

**Single mutable `state` object** (`src/state.js`) holds gold, lives, wave progress, and the entity arrays (`towers`, `enemies`, `projectiles`, `floatTexts`, `particles`) plus transient interaction state (`dragging`, `hoverCell`, `movingTower`). Everything reads and writes it directly.

**Game loop** (`src/main.js`): `requestAnimationFrame` → `updateGame(dt)` then `draw()`. `dt` is seconds, clamped to 0.05, multiplied by `state.speedMul`. Note the mixed time units — `dt` is seconds, but all timers/cooldowns/status durations are milliseconds, so update code reads `x -= dt * 1000`. Keep that convention when adding timers.

**Rendering is immediate-mode**: `draw()` repaints the whole canvas each frame from `state`; entities carry no DOM. The hand, loadout grid, and tooltips are the DOM half, re-rendered imperatively by `renderHand()` / `renderLoadoutGrid()` / `showTooltip()`. Element icons are drawn procedurally with Canvas2D (`drawFireIcon`, `drawWaterIcon`, …, dispatched via the module-private `ELEMENT_ICONS`) and reused for both the board and the small `<canvas class="card-icon">` inside each card.

### Data tables drive the game

Changing gameplay usually means editing `src/config.js`, not the logic:
- `ELEMENTS` (config.js:7) — the six placeable words (火水木金土風) with cost/dmg/range/atkInterval and an `effect` key.
- `OVERCOMES` (config.js:16) — the five-element counter cycle 木→土→水→火→金→木. Applied in `applyHit` (combat.js:54): ×1.6 when the tower counters the enemy, ×0.65 when countered, ×1.35 for a fused tower containing a countering element. 風 is deliberately outside this cycle and never counters.
- `COMBOS` (config.js:19) — fusion recipes keyed by the two element names **sorted and joined with `+`** (e.g. `'fire+wood'`). Any new recipe key must be in sorted order or `fuseTower`/`attemptDropOnCell` will never find it.

An `effect` string on an element or combo is dispatched by the `switch` in `applySpecial` (combat.js:14). Adding a new effect means adding both the table entry and a `case`; status effects that tick or expire also need handling in `updateEnemy` (enemy.js:36), which owns all status decay.

### Grid, path, and canvas coupling

`CELL=60, COLS=13, ROWS=8` implies a 780×480 board, and `<canvas id="board">` in `index.html` hardcodes those pixel dimensions — change one and you must change the other. The enemy route is `pathCellsOrdered` in `path.js`, a hand-authored cell list converted into `PATH.waypoints` (with off-screen entry/exit points) and into `PATH_SET`, which blocks building on the road. Enemies walk waypoint-to-waypoint and accumulate `distanceTraveled`, which is what `findTargets` sorts by to pick the furthest-along enemy.

Screen→board coordinates always go through `cellFromEvent` / `pointFromEvent` in `canvas.js`, which rescale by `getBoundingClientRect()` — the canvas may be displayed at a different size than its backing resolution, so never use raw client coordinates.

### Interaction model

Three pointer gestures share the canvas, distinguished at `pointerdown`:
- Dragging a hand card (`hand.js`, starts on the card element) → ghost card follows the cursor → `attemptDropOnCell` on release.
- Dragging an existing tower (`input.js`, starts on the canvas near a tower) → snaps back if the target cell is path or occupied.
- Right-click on the canvas (`input.js`) → sell for 50% of base cost × level.

`attemptDropOnCell` (game.js:36) is the single decision point for build vs. upgrade vs. fuse: same element and `level < 3` upgrades, different element on an unfused tower fuses (30 gold), anything else is rejected with a toast. Both drag paths also drive live preview tooltips (`updateDragTooltip`, `computeFusePreview` in `tooltip.js`) that must mirror whatever cost/stat math `attemptDropOnCell`, `upgradeTower`, and `fuseTower` do — if you change the formulas, update the preview helpers too or the tooltip will lie.

### Waves and progression

`buildWaves()` in `config.js` generates 10 waves procedurally from the wave index (hp, speed, spawn interval, chance an enemy has an element). Every 5th wave spawns one boss first: 6× hp, 0.6× speed, 25% armor, 50% CC resist (`ccResist` scales every stun/slow/root duration through `ccFactor`). Wave completion is detected in `updateGame` when all spawns are done and `state.enemies` is empty.

### Lobby / loadout

The lobby is a DOM screen shown before `#app`; the loadout (max 5 of the 6 words) persists to `localStorage` under `wordTD_loadout` and is the draw pool for `drawRandomElement()`, so the hand only ever contains equipped words. All `localStorage` access is wrapped in try/catch and falls back to the first 5 elements.

## Conventions

All user-facing strings, comments, and toasts are Traditional Chinese — match that when adding UI text. Restart is a full `location.reload()`; there is no state reset path, so new global state need not be teardown-safe.
