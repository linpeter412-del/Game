import { ELEMENTS, COMBOS } from './config.js';
import { cellCenter } from './path.js';
import { state } from './state.js';
import { dist } from './utils.js';

// ===== 塔 =====
export function createTower(col, row, elKey) {
  const def = ELEMENTS[elKey];
  return {
    col, row, center: cellCenter(col, row),
    element: elKey, fusedFrom: null, name: def.name, color: def.color,
    baseDmg: def.dmg, dmg: def.dmg, baseRange: def.range, range: def.range,
    atkInterval: def.atkInterval, level: 1, special: def.effect,
    cooldown: 0, createdAt: performance.now()
  };
}
export function upgradeCost(t) {
  const base = t.element ? ELEMENTS[t.element].cost : Math.round((ELEMENTS[t.fusedFrom[0]].cost + ELEMENTS[t.fusedFrom[1]].cost) / 2);
  return Math.round(base * 0.55 * t.level);
}
export function upgradeTower(t) {
  t.level++;
  t.dmg = Math.round(t.baseDmg * Math.pow(1.4, t.level - 1));
  t.range = Math.round(t.baseRange * Math.pow(1.06, t.level - 1));
}
export function fuseTower(t, newEl) {
  const d1 = ELEMENTS[t.element], d2 = ELEMENTS[newEl];
  const key = [t.element, newEl].sort().join('+');
  const combo = COMBOS[key];
  t.fusedFrom = [t.element, newEl];
  t.element = null;
  t.name = combo.name;
  t.color = combo.color;
  t.baseDmg = Math.round((d1.dmg + d2.dmg) / 2 * combo.dmgMult);
  t.dmg = t.baseDmg;
  t.baseRange = Math.round((d1.range + d2.range) / 2 * 1.1);
  t.range = t.baseRange;
  t.atkInterval = Math.round((d1.atkInterval + d2.atkInterval) / 2 * 0.9);
  t.special = combo.effect;
  t.level = 1;
  t.createdAt = performance.now();
}
export function getTowerDamage(t) {
  if (t.special === 'grow') {
    const age = performance.now() - t.createdAt;
    const growth = Math.min(Math.floor(age / 4000) * t.dmg * 0.15, t.dmg * 1.5);
    return t.dmg + growth;
  }
  return t.dmg;
}
export function findTargets(t) {
  const inRange = state.enemies.filter(e => !e.escaped && e.hp > 0 && dist(t.center, e) <= t.range);
  if (!inRange.length) return [];
  inRange.sort((a, b) => b.distanceTraveled - a.distanceTraveled);
  if (t.special === 'multi') return inRange.slice(0, 3);
  return [inRange[0]];
}
export function spawnProjectile(t, e) {
  state.projectiles.push({ x: t.center.x, y: t.center.y, color: t.color, target: e, tower: t, speed: 460 });
}
export function updateTower(t, dt) {
  t.cooldown -= dt * 1000;
  if (t.cooldown <= 0) {
    const targets = findTargets(t);
    if (targets.length) {
      targets.forEach(e => spawnProjectile(t, e));
      t.cooldown = t.atkInterval;
    }
  }
}
