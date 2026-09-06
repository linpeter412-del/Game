import { CELL, COLS, ROWS, ELEMENTS } from './config.js';
import { PATH_SET, cellCenter } from './path.js';
import { state, towerAt, towerNear } from './state.js';
import { canvas, pointFromEvent, cellFromEvent } from './canvas.js';
import { hideTooltip, updateCanvasHoverTooltip } from './tooltip.js';
import { toast, updateUI } from './hud.js';

// ===== 塔的移動 =====
function onTowerMoveDrag(e) {
  const pt = pointFromEvent(e);
  state.hoverCell = pt ? { col: Math.floor(pt.x / CELL), row: Math.floor(pt.y / CELL) } : null;
  if (state.movingTower && pt) state.movingTower.center = pt;
}
function onTowerMoveEnd(e) {
  window.removeEventListener('pointermove', onTowerMoveDrag);
  window.removeEventListener('pointerup', onTowerMoveEnd);
  const t = state.movingTower;
  if (!t) return;
  const from = state.movingFrom;
  const pt = pointFromEvent(e);
  const cell = pt ? { col: Math.floor(pt.x / CELL), row: Math.floor(pt.y / CELL) } : null;
  let moved = false;
  if (cell && cell.col >= 0 && cell.col < COLS && cell.row >= 0 && cell.row < ROWS) {
    const key = cell.col + ',' + cell.row;
    const occupied = towerAt(cell.col, cell.row) && !(cell.col === from.col && cell.row === from.row);
    if (!PATH_SET.has(key) && !occupied) {
      t.col = cell.col; t.row = cell.row; t.center = cellCenter(cell.col, cell.row);
      moved = true;
      if (cell.col !== from.col || cell.row !== from.row) toast('已移動「' + t.name + '」');
    }
  }
  if (!moved) t.center = cellCenter(from.col, from.row);
  state.movingTower = null;
  state.movingFrom = null;
  state.hoverCell = null;
}

export function initCanvasInput() {
  canvas.addEventListener('mousemove', e => {
    if (state.dragging || state.movingTower) return;
    state.mousePoint = pointFromEvent(e);
    updateCanvasHoverTooltip(e.clientX, e.clientY);
  });
  canvas.addEventListener('mouseleave', () => { state.mousePoint = null; hideTooltip(); });

  // 右鍵拆除，退還基礎費用的一半 × 等級
  canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    const cell = cellFromEvent(e);
    if (!cell) return;
    const idx = state.towers.findIndex(t => t.col === cell.col && t.row === cell.row);
    if (idx >= 0) {
      const t = state.towers[idx];
      const baseCost = t.element ? ELEMENTS[t.element].cost : Math.round((ELEMENTS[t.fusedFrom[0]].cost + ELEMENTS[t.fusedFrom[1]].cost) / 2);
      const refund = Math.round(baseCost * 0.5 * t.level);
      state.gold += refund;
      state.towers.splice(idx, 1);
      toast('已拆除「' + t.name + '」，退還 ' + refund + ' 金幣');
      updateUI();
    }
  });

  canvas.addEventListener('pointerdown', e => {
    if (state.ended || state.dragging || e.button !== 0) return;
    const pt = pointFromEvent(e);
    if (!pt) return;
    const t = towerNear(pt, 26);
    if (!t) return;
    e.preventDefault();
    hideTooltip();
    state.movingTower = t;
    state.movingFrom = { col: t.col, row: t.row };
    window.addEventListener('pointermove', onTowerMoveDrag);
    window.addEventListener('pointerup', onTowerMoveEnd);
  });
}
