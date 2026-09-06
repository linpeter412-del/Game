import { OVERCOMES } from './config.js';
import { state } from './state.js';
import { dist } from './utils.js';
import { getTowerDamage } from './tower.js';
import { ccFactor } from './enemy.js';
import { spawnFloatingText } from './effects.js';

export function addStatus(e, key, obj) { e.statuses[key] = obj; }
export function splash(primary, radius, fn) {
  state.enemies.forEach(o => {
    if (o !== primary && !o.escaped && o.hp > 0 && dist(o, primary) <= radius) fn(o);
  });
}
export function applySpecial(tower, primary, dmg) {
  switch (tower.special) {
    case 'burn': addStatus(primary, 'burn', { dmgPerTick: dmg * 0.22, ticks: 4, tickTimer: 700 }); break;
    case 'slow': addStatus(primary, 'slow', { mult: 0.5, timer: 1600 * ccFactor(primary) }); break;
    case 'stun': if (Math.random() < 0.3 * ccFactor(primary)) addStatus(primary, 'stun', { timer: 900 * ccFactor(primary) }); break;
    case 'burnAoe':
      addStatus(primary, 'burn', { dmgPerTick: dmg * 0.3, ticks: 5, tickTimer: 700 });
      splash(primary, 70, o => {
        const d = dmg * 0.4 * (1 - (o.armor || 0));
        o.hp -= d;
        spawnFloatingText(o.x, o.y - 18, '-' + Math.round(d), '#ff8800');
        addStatus(o, 'burn', { dmgPerTick: dmg * 0.2 * (1 - (o.armor || 0)), ticks: 3, tickTimer: 700 });
      });
      break;
    case 'steamAoe':
      addStatus(primary, 'slow', { mult: 0.55, timer: 1500 * ccFactor(primary) });
      splash(primary, 65, o => {
        const d = dmg * 0.35 * (1 - (o.armor || 0));
        o.hp -= d;
        spawnFloatingText(o.x, o.y - 18, '-' + Math.round(d), '#cceeff');
        addStatus(o, 'slow', { mult: 0.6, timer: 1200 * ccFactor(o) });
      });
      break;
    case 'corrode': addStatus(primary, 'corrode', { timer: 3000 }); break;
    case 'root':
      addStatus(primary, 'root', { timer: 1400 * ccFactor(primary) });
      splash(primary, 55, o => addStatus(o, 'root', { timer: 1400 * ccFactor(o) }));
      break;
    case 'explode':
      splash(primary, 85, o => {
        const d = dmg * 0.5 * (1 - (o.armor || 0));
        o.hp -= d;
        spawnFloatingText(o.x, o.y - 18, '-' + Math.round(d), '#ff6600');
      });
      break;
    case 'sandstorm':
      splash(primary, 140, o => addStatus(o, 'slow', { mult: 0.4, timer: 1800 * ccFactor(o) }));
      break;
  }
}
export function applyHit(tower, enemy) {
  let dmg = getTowerDamage(tower);
  if (tower.element && enemy.element) {
    if (OVERCOMES[tower.element] === enemy.element) dmg *= 1.6;
    else if (OVERCOMES[enemy.element] === tower.element) dmg *= 0.65;
  } else if (tower.fusedFrom && enemy.element) {
    if (tower.fusedFrom.some(el => OVERCOMES[el] === enemy.element)) dmg *= 1.35;
  }
  if (enemy.statuses.corrode) dmg *= 1.25;
  if (enemy.armor) {
    const isMetal = tower.element === 'metal' || (tower.fusedFrom && tower.fusedFrom.includes('metal'));
    dmg *= (1 - enemy.armor * (isMetal ? 0.5 : 1));
  }
  enemy.hp -= dmg;
  spawnFloatingText(enemy.x, enemy.y - 18, '-' + Math.round(dmg), tower.color);
  applySpecial(tower, enemy, dmg);
}
export function updateProjectiles(dt) {
  state.projectiles = state.projectiles.filter(p => {
    if (!p.target || p.target.hp <= 0 || p.target.escaped) return false;
    const dx = p.target.x - p.x, dy = p.target.y - p.y, d = Math.hypot(dx, dy);
    const move = p.speed * dt;
    if (move >= d) { applyHit(p.tower, p.target); return false; }
    p.x += dx / d * move; p.y += dy / d * move;
    return true;
  });
}
