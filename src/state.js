import { ELEMENT_KEYS, WAVES } from './config.js';
import { dist } from './utils.js';

// ===== 狀態 =====
export const state = {
  gold: 180, lives: 20, waveIndex: 0, totalWaves: WAVES.length,
  waveActive: false, currentWave: null, spawnedCount: 0, spawnTimer: 0, bossSpawned: false,
  towers: [], enemies: [], projectiles: [], floatTexts: [],
  hand: [], dragging: null, hoverCell: null, mousePoint: null,
  movingTower: null, movingFrom: null,
  speedMul: 1, ended: false, loadout: [], particles: []
};

export function towerNear(point, r) {
  if (!point) return null;
  return state.towers.find(t => dist(t.center, point) <= r) || null;
}

export function enemyNear(point) {
  if (!point) return null;
  return state.enemies.find(e => !e.escaped && dist(e, point) <= e.radius + 6) || null;
}

export function towerAt(col, row) { return state.towers.find(t => t.col === col && t.row === row); }

export function drawRandomElement() {
  const pool = state.loadout.length ? state.loadout : ELEMENT_KEYS;
  return pool[Math.floor(Math.random() * pool.length)];
}
