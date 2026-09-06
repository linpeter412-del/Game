import { state } from './state.js';
import { PATH } from './path.js';
import { spawnFloatingText } from './effects.js';
import { toast } from './hud.js';

// ===== 敵人 =====
export function spawnNextEnemy() {
  const w = state.currentWave;
  let isBossSpawn = w.isBoss && !state.bossSpawned;
  if (isBossSpawn) state.bossSpawned = true;
  const fiveKeys = ['fire', 'water', 'wood', 'metal', 'earth'];
  let element = null;
  if (Math.random() < w.elementChance) element = fiveKeys[Math.floor(Math.random() * fiveKeys.length)];
  let armor = 0, ccResist = 0;
  if (isBossSpawn) {
    if (!element) element = fiveKeys[Math.floor(Math.random() * fiveKeys.length)];
    armor = 0.25;
    ccResist = 0.5;
  } else if (state.waveIndex >= 5 && !element && Math.random() < 0.2) {
    armor = 0.15;
  }
  const hpMul = isBossSpawn ? 6 : 1;
  const speedMul = isBossSpawn ? 0.6 : 1;
  state.enemies.push({
    x: PATH.waypoints[0].x, y: PATH.waypoints[0].y, wpIndex: 0,
    maxHp: Math.round(w.hp * hpMul), hp: Math.round(w.hp * hpMul),
    speed: w.speed * speedMul, element, isBoss: isBossSpawn,
    armor, ccResist,
    radius: isBossSpawn ? 22 : 13, statuses: {}, distanceTraveled: 0,
    goldReward: isBossSpawn ? w.goldPerKill * 8 : w.goldPerKill,
    livesDamage: isBossSpawn ? 5 : 1, escaped: false
  });
  if (isBossSpawn) toast('⚠️ 首領來襲！小心應對！');
}
export function ccFactor(e) { return 1 - (e.ccResist || 0); }
export function updateEnemy(e, dt) {
  let speedMult = 1;
  if (e.statuses.slow) {
    speedMult *= e.statuses.slow.mult;
    e.statuses.slow.timer -= dt * 1000;
    if (e.statuses.slow.timer <= 0) delete e.statuses.slow;
  }
  if (e.statuses.stun) {
    speedMult = 0;
    e.statuses.stun.timer -= dt * 1000;
    if (e.statuses.stun.timer <= 0) delete e.statuses.stun;
  }
  if (e.statuses.root) {
    speedMult = 0;
    e.statuses.root.timer -= dt * 1000;
    if (e.statuses.root.timer <= 0) delete e.statuses.root;
  }
  if (e.statuses.corrode) {
    e.statuses.corrode.timer -= dt * 1000;
    if (e.statuses.corrode.timer <= 0) delete e.statuses.corrode;
  }
  if (e.statuses.burn && e.statuses.burn.ticks > 0) {
    e.statuses.burn.tickTimer -= dt * 1000;
    if (e.statuses.burn.tickTimer <= 0) {
      e.hp -= e.statuses.burn.dmgPerTick;
      spawnFloatingText(e.x, e.y - 20, '-' + Math.round(e.statuses.burn.dmgPerTick), '#ff8844');
      e.statuses.burn.ticks--;
      e.statuses.burn.tickTimer = 700;
      if (e.statuses.burn.ticks <= 0) delete e.statuses.burn;
    }
  }
  if (e.hp <= 0 || e.escaped) return;
  const nextIdx = e.wpIndex + 1;
  if (nextIdx >= PATH.waypoints.length) { e.escaped = true; return; }
  const target = PATH.waypoints[nextIdx];
  const dx = target.x - e.x, dy = target.y - e.y, d = Math.hypot(dx, dy);
  const move = e.speed * speedMult * dt;
  if (d === 0 || move >= d) {
    e.x = target.x; e.y = target.y; e.wpIndex = nextIdx; e.distanceTraveled += d;
    if (nextIdx === PATH.waypoints.length - 1) e.escaped = true;
  } else {
    e.x += dx / d * move; e.y += dy / d * move; e.distanceTraveled += move;
  }
}
