import { ELEMENTS } from './config.js';
import { state } from './state.js';
import { cellFromEvent } from './canvas.js';
import { drawCardFace } from './icons.js';
import { showTooltip, hideTooltip, cardTooltipHtml, updateDragTooltip } from './tooltip.js';
import { attemptDropOnCell } from './game.js';

const handEl = document.getElementById('hand');
const ghostEl = document.getElementById('ghostCard');

export function renderHand() {
  handEl.innerHTML = '';
  state.hand.forEach((el, i) => {
    const def = ELEMENTS[el];
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<canvas class="card-icon" width="112" height="112"></canvas><div class="cost">💰' + def.cost + '</div>';
    drawCardFace(card.querySelector('.card-icon').getContext('2d'), 56, 56, 38, el, def);
    card.addEventListener('pointerdown', ev => startDrag(ev, i, el));
    card.addEventListener('mouseenter', ev => showTooltip(cardTooltipHtml(def), ev.clientX, ev.clientY));
    card.addEventListener('mousemove', ev => showTooltip(cardTooltipHtml(def), ev.clientX, ev.clientY));
    card.addEventListener('mouseleave', hideTooltip);
    handEl.appendChild(card);
  });
}

// ===== 手牌拖曳 =====
function startDrag(ev, slot, element) {
  if (state.ended) return;
  ev.preventDefault();
  hideTooltip();
  state.dragging = { slot, element };
  const def = ELEMENTS[element];
  ghostEl.innerHTML = '<canvas class="card-icon" width="112" height="112"></canvas><div class="cost">💰' + def.cost + '</div>';
  drawCardFace(ghostEl.querySelector('.card-icon').getContext('2d'), 56, 56, 38, element, def);
  ghostEl.classList.remove('hidden');
  moveGhost(ev.clientX, ev.clientY);
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd);
}
function moveGhost(x, y) {
  ghostEl.style.left = (x - 38) + 'px';
  ghostEl.style.top = (y - 50) + 'px';
}
function onDragMove(ev) {
  moveGhost(ev.clientX, ev.clientY);
  state.hoverCell = cellFromEvent(ev);
  updateDragTooltip(ev.clientX, ev.clientY);
}
function onDragEnd(ev) {
  window.removeEventListener('pointermove', onDragMove);
  window.removeEventListener('pointerup', onDragEnd);
  ghostEl.classList.add('hidden');
  hideTooltip();
  const cell = cellFromEvent(ev);
  if (cell && state.dragging) attemptDropOnCell(cell.col, cell.row, state.dragging.element, state.dragging.slot);
  state.dragging = null;
  state.hoverCell = null;
}
