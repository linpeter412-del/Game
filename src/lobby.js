import { ELEMENTS, ELEMENT_KEYS, MAX_LOADOUT, LOADOUT_KEY } from './config.js';
import { state } from './state.js';
import { getContrastColor } from './utils.js';
import { drawCardFace } from './icons.js';
import { showTooltip, hideTooltip, cardTooltipHtml } from './tooltip.js';

// ===== 大廳 / 裝備 =====
function loadLoadout() {
  try {
    const raw = localStorage.getItem(LOADOUT_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.filter(k => ELEMENT_KEYS.includes(k)).slice(0, MAX_LOADOUT);
    }
  } catch (e) { /* localStorage 不可用時忽略 */ }
  return ELEMENT_KEYS.slice(0, MAX_LOADOUT);
}
function saveLoadout() {
  try { localStorage.setItem(LOADOUT_KEY, JSON.stringify(state.loadout)); } catch (e) { /* 忽略 */ }
}

let lobbyToastTimer = null;
function lobbyToast(msg) {
  const el = document.getElementById('lobbyToast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(lobbyToastTimer);
  lobbyToastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

function renderLoadoutPreview() {
  const box = document.getElementById('loadoutPreview');
  box.innerHTML = '';
  if (!state.loadout.length) {
    const hint = document.createElement('span');
    hint.className = 'empty-hint';
    hint.textContent = '尚未裝備文字，將隨機使用全部六個字';
    box.appendChild(hint);
    return;
  }
  state.loadout.forEach(key => {
    const def = ELEMENTS[key];
    const chip = document.createElement('span');
    chip.className = 'loadout-chip';
    chip.style.background = def.color;
    chip.style.color = getContrastColor(def.color);
    chip.textContent = def.name;
    box.appendChild(chip);
  });
}

function toggleLoadout(key) {
  const idx = state.loadout.indexOf(key);
  if (idx >= 0) {
    state.loadout.splice(idx, 1);
  } else {
    if (state.loadout.length >= MAX_LOADOUT) { lobbyToast('最多只能裝備 ' + MAX_LOADOUT + ' 個字'); return; }
    state.loadout.push(key);
  }
  saveLoadout();
  renderLoadoutGrid();
}

function renderLoadoutGrid() {
  const grid = document.getElementById('loadoutGrid');
  grid.innerHTML = '';
  ELEMENT_KEYS.forEach(key => {
    const def = ELEMENTS[key];
    const selected = state.loadout.includes(key);
    const card = document.createElement('div');
    card.className = 'card loadout-card' + (selected ? ' selected' : '');
    card.innerHTML = '<canvas class="card-icon" width="112" height="112"></canvas><div class="cost">💰' + def.cost + '</div>';
    drawCardFace(card.querySelector('.card-icon').getContext('2d'), 56, 56, 38, key, def);
    card.addEventListener('click', () => toggleLoadout(key));
    card.addEventListener('mouseenter', ev => showTooltip(cardTooltipHtml(def), ev.clientX, ev.clientY));
    card.addEventListener('mousemove', ev => showTooltip(cardTooltipHtml(def), ev.clientX, ev.clientY));
    card.addEventListener('mouseleave', hideTooltip);
    grid.appendChild(card);
  });
  document.getElementById('loadoutCount').textContent = state.loadout.length;
  renderLoadoutPreview();
  document.getElementById('startGameBtn').disabled = state.loadout.length === 0;
}

// 讀取已儲存的裝備並掛上大廳事件；必須在抽手牌之前呼叫，
// 因為 drawRandomElement() 的牌池就是 state.loadout。
export function initLobby() {
  state.loadout = loadLoadout();
  renderLoadoutGrid();

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tabHome').classList.toggle('hidden', btn.dataset.tab !== 'home');
      document.getElementById('tabLoadout').classList.toggle('hidden', btn.dataset.tab !== 'loadout');
    });
  });
  document.getElementById('startGameBtn').addEventListener('click', () => {
    if (!state.loadout.length) return;
    document.getElementById('lobbyScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  });
}
