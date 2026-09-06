import { ELEMENTS, COMBOS, REROLL_ALL_COST } from './config.js';
import { state, drawRandomElement } from './state.js';
import { startWave } from './game.js';
import { renderHand } from './hand.js';

// ===== 提示訊息 =====
let toastTimer = null;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

// ===== 頂部資訊列 =====
export function updateUI() {
  document.getElementById('goldVal').textContent = Math.floor(state.gold);
  document.getElementById('livesVal').textContent = Math.max(0, Math.floor(state.lives));
  document.getElementById('waveVal').textContent = state.waveIndex + ' / ' + state.totalWaves;
  const btn = document.getElementById('startWaveBtn');
  if (state.ended) { btn.disabled = true; btn.textContent = '遊戲結束'; }
  else if (state.waveActive) { btn.disabled = true; btn.textContent = '戰鬥中...'; }
  else if (state.waveIndex >= state.totalWaves) { btn.disabled = true; btn.textContent = '已完成'; }
  else { btn.disabled = false; btn.textContent = '開始第 ' + (state.waveIndex + 1) + ' 波'; }
  document.getElementById('rerollAllBtn').disabled = state.ended || state.gold < REROLL_ALL_COST;
}

function populateComboList() {
  const box = document.getElementById('comboList');
  box.innerHTML = '';
  Object.entries(COMBOS).forEach(([key, c]) => {
    const [a, b] = key.split('+');
    const row = document.createElement('div');
    row.className = 'combo-row';
    row.innerHTML = '<span>' + ELEMENTS[a].name + '+' + ELEMENTS[b].name + ' → <b style="color:' + c.color + '">' + c.name + '</b></span><span>' + c.desc + '</span>';
    box.appendChild(row);
  });
}

export function initHud() {
  document.getElementById('startWaveBtn').addEventListener('click', startWave);
  document.getElementById('speedBtn').addEventListener('click', () => {
    const seq = [1, 2, 3];
    const idx = seq.indexOf(state.speedMul);
    state.speedMul = seq[(idx + 1) % seq.length];
    document.getElementById('speedBtn').textContent = state.speedMul + 'x 速度';
  });
  document.getElementById('rerollAllBtn').addEventListener('click', () => {
    if (state.ended) return;
    if (state.gold < REROLL_ALL_COST) { toast('金幣不足，換牌需要 ' + REROLL_ALL_COST); return; }
    state.gold -= REROLL_ALL_COST;
    state.hand = state.hand.map(() => drawRandomElement());
    renderHand();
    updateUI();
    toast('已換一批新手牌！');
  });
  document.getElementById('helpBtn').addEventListener('click', () => document.getElementById('helpModal').classList.remove('hidden'));
  document.getElementById('closeHelp').addEventListener('click', () => document.getElementById('helpModal').classList.add('hidden'));
  document.getElementById('restartBtn').addEventListener('click', () => location.reload());
  populateComboList();
}
