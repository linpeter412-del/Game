import { CELL, COLS, ROWS, W, H, ELEMENTS, COMBOS } from './config.js';
import { PATH_SET, cellCenter } from './path.js';
import { state, towerAt, towerNear } from './state.js';
import { ctx } from './canvas.js';
import { getContrastColor } from './utils.js';
import { drawElementArt, drawFusedArt } from './icons.js';

// ===== 繪製 =====
export function draw() {
  ctx.clearRect(0, 0, W, H);
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const isPath = PATH_SET.has(col + ',' + row);
      ctx.fillStyle = isPath ? '#4a3a22' : ((row + col) % 2 === 0 ? '#2c3a24' : '#28351f');
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let col = 0; col <= COLS; col++) { ctx.beginPath(); ctx.moveTo(col * CELL, 0); ctx.lineTo(col * CELL, H); ctx.stroke(); }
  for (let row = 0; row <= ROWS; row++) { ctx.beginPath(); ctx.moveTo(0, row * CELL); ctx.lineTo(W, row * CELL); ctx.stroke(); }

  if (state.dragging && state.hoverCell) {
    const { col, row } = state.hoverCell;
    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
      const key = col + ',' + row;
      const el = state.dragging.element;
      let color = 'rgba(255,60,60,0.5)';
      if (!PATH_SET.has(key)) {
        const existing = towerAt(col, row);
        if (!existing) {
          color = state.gold >= ELEMENTS[el].cost ? 'rgba(80,255,120,0.45)' : 'rgba(255,60,60,0.5)';
        } else {
          const canUp = existing.level < 3 && ((existing.element === el) || (existing.fusedFrom && existing.fusedFrom.includes(el)));
          const canFuse = !existing.fusedFrom && existing.element !== el && COMBOS[[existing.element, el].sort().join('+')];
          color = (canUp || canFuse) ? 'rgba(255,215,90,0.5)' : 'rgba(255,60,60,0.5)';
        }
      }
      ctx.fillStyle = color;
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
      if (!PATH_SET.has(key)) {
        const center = cellCenter(col, row);
        const existing = towerAt(col, row);
        const previewRange = existing ? existing.range : ELEMENTS[el].range;
        ctx.beginPath();
        ctx.arc(center.x, center.y, previewRange, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  } else if (state.movingTower && state.hoverCell) {
    const { col, row } = state.hoverCell;
    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
      const key = col + ',' + row;
      const occupied = towerAt(col, row) && !(col === state.movingFrom.col && row === state.movingFrom.row);
      const valid = !PATH_SET.has(key) && !occupied;
      ctx.fillStyle = valid ? 'rgba(80,255,120,0.45)' : 'rgba(255,60,60,0.5)';
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
      ctx.beginPath();
      ctx.arc(cellCenter(col, row).x, cellCenter(col, row).y, state.movingTower.range, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  } else if (state.mousePoint) {
    const t = towerNear(state.mousePoint, 26);
    if (t) {
      ctx.beginPath();
      ctx.arc(t.center.x, t.center.y, t.range, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.stroke();
    }
  }

  state.towers.forEach(t => {
    const { x, y } = t.center;
    ctx.beginPath(); ctx.ellipse(x, y + 21, 19, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();

    if (t.fusedFrom) drawFusedArt(ctx, x, y, 21, t.fusedFrom);
    else drawElementArt(ctx, x, y, 21, t.element);

    ctx.font = 'bold 19px "Noto Sans TC", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeText(t.name, x, y + 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(t.name, x, y + 2);

    for (let i = 0; i < t.level; i++) {
      ctx.beginPath(); ctx.arc(x - 10 + i * 10, y + 33, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd76b'; ctx.fill();
    }
    if (t.fusedFrom) {
      ctx.beginPath(); ctx.arc(x + 20, y - 20, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.fillStyle = '#333'; ctx.font = 'bold 9px "Noto Sans TC", sans-serif';
      ctx.fillText('融', x + 20, y - 19);
    }
  });

  state.enemies.forEach(e => {
    if (e.armor) {
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffd76b'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.beginPath();
    ctx.fillStyle = e.element ? ELEMENTS[e.element].color : '#888';
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = e.isBoss ? 3 : 1.5;
    ctx.strokeStyle = e.isBoss ? '#ff4444' : 'rgba(0,0,0,0.5)';
    ctx.stroke();
    if (e.element) {
      ctx.fillStyle = getContrastColor(ELEMENTS[e.element].color);
      ctx.font = 'bold 11px "Noto Sans TC", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ELEMENTS[e.element].name, e.x, e.y);
    }
    if (e.isBoss) {
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('👑', e.x, e.y - e.radius - 14);
    }
    const bw = e.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - bw / 2, e.y - e.radius - 10, bw, 4);
    ctx.fillStyle = e.hp / e.maxHp > 0.4 ? '#5ce65c' : '#e65c5c';
    ctx.fillRect(e.x - bw / 2, e.y - e.radius - 10, bw * Math.max(0, e.hp / e.maxHp), 4);
  });

  state.projectiles.forEach(p => {
    ctx.beginPath(); ctx.fillStyle = p.color; ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
  });

  state.particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = '#ffd76b';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  });

  state.floatTexts.forEach(f => {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.fillStyle = f.color;
    ctx.font = 'bold ' + (f.size || 13) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
    ctx.globalAlpha = 1;
  });
}

