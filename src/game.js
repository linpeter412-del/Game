import { COLS, ROWS, ELEMENTS, COMBOS, WAVES } from './config.js';
import { PATH_SET } from './path.js';
import { state, towerAt, drawRandomElement } from './state.js';
import { createTower, upgradeCost, upgradeTower, fuseTower, updateTower } from './tower.js';
import { spawnNextEnemy, updateEnemy } from './enemy.js';
import { updateProjectiles } from './combat.js';
import { updateFloatTexts, updateParticles, spawnGoldText, spawnCoinBurst } from './effects.js';
import { toast, updateUI } from './hud.js';
import { renderHand } from './hand.js';

// ===== 波次控制 =====
export function startWave() {
  if (state.ended || state.waveActive || state.waveIndex >= state.totalWaves) return;
  state.waveIndex++;
  const wdef = WAVES[state.waveIndex - 1];
  state.currentWave = Object.assign({}, wdef, { totalToSpawn: wdef.count + (wdef.isBoss ? 1 : 0) });
  state.spawnedCount = 0;
  state.spawnTimer = 0;
  state.bossSpawned = false;
  state.waveActive = true;
  updateUI();
}
export function endGame(win) {
  if (state.ended) return;
  state.ended = true;
  state.waveActive = false;
  document.getElementById('endTitle').textContent = win ? '🎉 通關勝利！' : '💀 遊戲結束';
  document.getElementById('endDesc').textContent = win
    ? '你成功守住了所有波次，運用五行文字擊退了所有敵人！'
    : ('你在第 ' + state.waveIndex + ' 波倒下了，再試一次吧！');
  document.getElementById('endModal').classList.remove('hidden');
  updateUI();
}

// ===== 放置 / 升級 / 融合 =====
export function attemptDropOnCell(col, row, element, slot) {
  if (state.ended) return;
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
  const key = col + ',' + row;
  if (PATH_SET.has(key)) { toast('不能在道路上建造'); return; }
  const existing = towerAt(col, row);
  if (!existing) {
    const cost = ELEMENTS[element].cost;
    if (state.gold < cost) { toast('金幣不足（需要 ' + cost + '）'); return; }
    state.gold -= cost;
    state.towers.push(createTower(col, row, element));
    toast('召喚了「' + ELEMENTS[element].name + '」！');
  } else if (existing.level < 3 && ((existing.element === element) || (existing.fusedFrom && existing.fusedFrom.includes(element)))) {
    const cost = upgradeCost(existing);
    if (state.gold < cost) { toast('金幣不足，升級需要 ' + cost); return; }
    state.gold -= cost;
    upgradeTower(existing);
    toast(existing.name + ' 升級到 Lv.' + existing.level + '！');
  } else if (!existing.fusedFrom && existing.element !== element) {
    const comboKey = [existing.element, element].sort().join('+');
    const combo = COMBOS[comboKey];
    if (!combo) { toast('這兩個字無法融合'); return; }
    if (state.gold < 30) { toast('金幣不足，融合需要 30'); return; }
    state.gold -= 30;
    fuseTower(existing, element);
    toast('融合成功！誕生了「' + existing.name + '」！');
  } else {
    toast('這格的塔已經滿級或無法操作'); return;
  }
  state.hand[slot] = drawRandomElement();
  renderHand();
  updateUI();
}

// ===== 主更新迴圈 =====
export function updateGame(dtRaw) {
  const dt = Math.min(dtRaw, 0.05) * state.speedMul;
  if (state.waveActive) {
    state.spawnTimer -= dt * 1000;
    if (state.spawnTimer <= 0 && state.spawnedCount < state.currentWave.totalToSpawn) {
      spawnNextEnemy();
      state.spawnedCount++;
      state.spawnTimer = state.currentWave.spawnInterval;
    }
  }
  state.enemies.forEach(e => updateEnemy(e, dt));
  state.towers.forEach(t => updateTower(t, dt));
  updateProjectiles(dt);
  updateFloatTexts(dt);
  updateParticles(dt);

  state.enemies = state.enemies.filter(e => {
    if (e.hp <= 0) {
      state.gold += e.goldReward;
      spawnGoldText(e.x, e.y - 14, e.goldReward);
      spawnCoinBurst(e.x, e.y);
      return false;
    }
    if (e.escaped) {
      state.lives -= e.livesDamage;
      if (state.lives <= 0) { state.lives = 0; endGame(false); }
      return false;
    }
    return true;
  });

  if (state.waveActive && state.spawnedCount >= state.currentWave.totalToSpawn && state.enemies.length === 0) {
    state.waveActive = false;
    const bonus = 20 + state.waveIndex * 4;
    state.gold += bonus;
    toast('第 ' + state.waveIndex + ' 波完成！獲得 ' + bonus + ' 金幣獎勵');
    if (state.waveIndex >= state.totalWaves) endGame(true);
  }
  updateUI();
}
