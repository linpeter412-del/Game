// ===== 基本設定 =====
const CELL = 60, COLS = 13, ROWS = 8;
const W = COLS * CELL, H = ROWS * CELL;

// 費用大致與 DPS(傷害/攻擊間隔)成正比：約每 1 點 DPS 對應 3~3.4 金幣，
// 帶有控場/多重目標效果的元素(土的暈眩、風的多重攻擊)再加收一筆效果溢價。
const ELEMENTS = {
  fire:  { name: '火', color: '#ff5533', cost: 30, dmg: 8,  range: 110, atkInterval: 900,  effect: 'burn',  desc: '燃燒：造成持續傷害' },
  water: { name: '水', color: '#33aaff', cost: 25, dmg: 6,  range: 100, atkInterval: 800,  effect: 'slow',  desc: '冰凍：減緩敵人速度' },
  wood:  { name: '木', color: '#55cc55', cost: 20, dmg: 6,  range: 90,  atkInterval: 1000, effect: 'grow',  desc: '生長：傷害隨時間增加' },
  metal: { name: '金', color: '#cfd6de', cost: 48, dmg: 20, range: 130, atkInterval: 1300, effect: 'pierce',desc: '破甲：高額單體傷害' },
  earth: { name: '土', color: '#b08654', cost: 32, dmg: 9,  range: 80,  atkInterval: 1100, effect: 'stun',  desc: '震擊：機率暈眩敵人' },
  wind:  { name: '風', color: '#8fe9cf', cost: 38, dmg: 4,  range: 120, atkInterval: 400,  effect: 'multi', desc: '疾風：攻速快，可攻擊多個目標' }
};
const ELEMENT_KEYS = Object.keys(ELEMENTS);
const OVERCOMES = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };

const COMBOS = {
  'fire+wood':   { name: '焚', color: '#ff8800', dmgMult: 2.0, effect: 'burnAoe',  desc: '烈焰焚燒，範圍持續傷害' },
  'fire+water':  { name: '蒸', color: '#e8f6ff', dmgMult: 1.6, effect: 'steamAoe', desc: '蒸氣爆散，範圍傷害＋減速' },
  'metal+water': { name: '銹', color: '#93a596', dmgMult: 1.4, effect: 'corrode', desc: '侵蝕鏽化，降低敵人防禦' },
  'earth+wood':  { name: '森', color: '#2f8f3f', dmgMult: 1.5, effect: 'root',    desc: '密林纏繞，短暫定身' },
  'fire+metal':  { name: '鍛', color: '#ff4411', dmgMult: 2.5, effect: 'pierceBig', desc: '鍛造烈刃，極高破甲傷害' },
  'fire+wind':   { name: '爆', color: '#ff7711', dmgMult: 2.2, effect: 'explode', desc: '爆裂衝擊，大範圍爆炸傷害' },
  'earth+wind':  { name: '沙', color: '#d8c08a', dmgMult: 1.3, effect: 'sandstorm', desc: '沙塵暴，大幅減速全場敵人' }
};

// ===== 路徑 =====
const pathCellsOrdered = [
  [0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],
  [6,2],[6,3],[6,4],
  [5,4],[4,4],[3,4],[2,4],[1,4],
  [1,5],[1,6],
  [2,6],[3,6],[4,6],[5,6],[6,6],[7,6],[8,6],
  [8,5],[8,4],[8,3],[8,2],
  [9,2],[10,2],[11,2],[12,2]
];
const PATH_SET = new Set(pathCellsOrdered.map(([c,r]) => c + ',' + r));
function cellCenter(col, row) { return { x: (col + 0.5) * CELL, y: (row + 0.5) * CELL }; }
const PATH = {
  waypoints: [
    { x: -30, y: 90 },
    ...pathCellsOrdered.map(([c, r]) => cellCenter(c, r)),
    { x: W + 30, y: 150 }
  ]
};

function buildWaves() {
  const waves = [];
  for (let w = 1; w <= 10; w++) {
    const isBoss = w % 5 === 0;
    waves.push({
      count: 6 + w * 2,
      hp: 16 + w * 10,
      speed: 42 + Math.min(w * 1.4, 24),
      spawnInterval: Math.max(300, 560 - w * 22),
      elementChance: Math.min(0.25 + w * 0.05, 0.75),
      isBoss,
      goldPerKill: 3 + Math.floor(w / 2)
    });
  }
  return waves;
}
const WAVES = buildWaves();

// ===== 狀態 =====
const state = {
  gold: 180, lives: 20, waveIndex: 0, totalWaves: WAVES.length,
  waveActive: false, currentWave: null, spawnedCount: 0, spawnTimer: 0, bossSpawned: false,
  towers: [], enemies: [], projectiles: [], floatTexts: [],
  hand: [], dragging: null, hoverCell: null, mousePoint: null,
  movingTower: null, movingFrom: null,
  speedMul: 1, ended: false, loadout: [], particles: []
};
function towerNear(point, r) {
  if (!point) return null;
  return state.towers.find(t => dist(t.center, point) <= r) || null;
}
function enemyNear(point) {
  if (!point) return null;
  return state.enemies.find(e => !e.escaped && dist(e, point) <= e.radius + 6) || null;
}
const MAX_LOADOUT = 5;
const LOADOUT_KEY = 'wordTD_loadout';
const REROLL_ALL_COST = 25;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const handEl = document.getElementById('hand');
const ghostEl = document.getElementById('ghostCard');
let toastTimer = null;

// ===== 工具函式 =====
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function drawRandomElement() {
  const pool = state.loadout.length ? state.loadout : ELEMENT_KEYS;
  return pool[Math.floor(Math.random() * pool.length)];
}
function towerAt(col, row) { return state.towers.find(t => t.col === col && t.row === row); }
function getContrastColor(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16), g = parseInt(c.substring(2, 4), 16), b = parseInt(c.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#1a1a1a' : '#ffffff';
}
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}
function roundRectPath(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function lighten(hex, amt) {
  const c = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(c.substring(0, 2), 16) + amt));
  const g = Math.max(0, Math.min(255, parseInt(c.substring(2, 4), 16) + amt));
  const b = Math.max(0, Math.min(255, parseInt(c.substring(4, 6), 16) + amt));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function darken(hex, amt) { return lighten(hex, -amt); }

// ===== 元素圖示 =====
function flameLick(ctx, cx, cy, s, lean) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s);
  ctx.quadraticCurveTo(cx + s * 0.85 * lean, cy + s * 0.15, cx + s * 0.12 * lean, cy - s * 0.95);
  ctx.quadraticCurveTo(cx + s * 0.4 * lean, cy - s * 0.05, cx, cy + s);
  ctx.closePath();
  ctx.fill();
}
function drawFireIcon(ctx, cx, cy, s, color) {
  const grad = ctx.createLinearGradient(cx, cy - s, cx, cy + s);
  grad.addColorStop(0, lighten(color, 45));
  grad.addColorStop(1, darken(color, 15));
  ctx.fillStyle = grad;
  flameLick(ctx, cx - s * 0.34, cy + s * 0.3, s * 0.72, -1);
  flameLick(ctx, cx + s * 0.34, cy + s * 0.3, s * 0.72, 1);
  flameLick(ctx, cx, cy + s * 0.18, s * 1.05, 1);
  ctx.fillStyle = 'rgba(255,235,170,0.9)';
  flameLick(ctx, cx, cy + s * 0.4, s * 0.48, 1);
}
function drawWaterIcon(ctx, cx, cy, s, color) {
  const grad = ctx.createLinearGradient(cx, cy - s, cx, cy + s);
  grad.addColorStop(0, lighten(color, 60));
  grad.addColorStop(1, darken(color, 10));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 1.1);
  ctx.quadraticCurveTo(cx + s * 0.95, cy + s * 0.25, cx, cy + s * 1.0);
  ctx.quadraticCurveTo(cx - s * 0.95, cy + s * 0.25, cx, cy - s * 1.1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy + s * 0.35, s * 0.4, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
}
function drawWoodIcon(ctx, cx, cy, s, color) {
  ctx.fillStyle = '#7a4a2a';
  ctx.fillRect(cx - s * 0.1, cy + s * 0.2, s * 0.2, s * 0.75);
  const grad = ctx.createRadialGradient(cx - s * 0.15, cy - s * 0.35, s * 0.05, cx, cy - s * 0.15, s * 0.85);
  grad.addColorStop(0, lighten(color, 50));
  grad.addColorStop(1, darken(color, 15));
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy - s * 0.3, s * 0.52, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx - s * 0.4, cy - s * 0.05, s * 0.38, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + s * 0.4, cy - s * 0.05, s * 0.38, 0, Math.PI * 2); ctx.fill();
}
function drawMetalIcon(ctx, cx, cy, s, color) {
  const grad = ctx.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
  grad.addColorStop(0, lighten(color, 40));
  grad.addColorStop(0.5, darken(color, 10));
  grad.addColorStop(1, lighten(color, 20));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 1.05);
  ctx.lineTo(cx + s * 0.9, cy - s * 0.2);
  ctx.lineTo(cx + s * 0.55, cy + s * 0.95);
  ctx.lineTo(cx - s * 0.55, cy + s * 0.95);
  ctx.lineTo(cx - s * 0.9, cy - s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.15, cy - s * 0.7);
  ctx.lineTo(cx + s * 0.15, cy + s * 0.6);
  ctx.stroke();
}
function drawEarthIcon(ctx, cx, cy, s, color) {
  const grad = ctx.createLinearGradient(cx, cy - s, cx, cy + s);
  grad.addColorStop(0, lighten(color, 35));
  grad.addColorStop(1, darken(color, 20));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.85, cy + s * 0.9);
  ctx.lineTo(cx - s * 0.95, cy - s * 0.05);
  ctx.lineTo(cx - s * 0.4, cy - s * 0.85);
  ctx.lineTo(cx + s * 0.35, cy - s * 0.95);
  ctx.lineTo(cx + s * 0.9, cy - s * 0.25);
  ctx.lineTo(cx + s * 0.75, cy + s * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.15, cy - s * 0.3);
  ctx.lineTo(cx + s * 0.15, cy + s * 0.35);
  ctx.moveTo(cx + s * 0.3, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.1, cy - s * 0.1);
  ctx.stroke();
}
function drawWindIcon(ctx, cx, cy, s, color) {
  const grad = ctx.createRadialGradient(cx, cy, s * 0.1, cx, cy, s * 1.1);
  grad.addColorStop(0, lighten(color, 40));
  grad.addColorStop(1, darken(color, 5));
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, s * 1.02, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = darken(color, 60);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx - s * 0.05, cy - s * 0.05, s * 0.62, 0.2, Math.PI * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + s * 0.12, cy + s * 0.12, s * 0.3, 1.0, Math.PI * 2.3); ctx.stroke();
}
const ELEMENT_ICONS = { fire: drawFireIcon, water: drawWaterIcon, wood: drawWoodIcon, metal: drawMetalIcon, earth: drawEarthIcon, wind: drawWindIcon };
function drawElementArt(ctx, cx, cy, s, elKey) {
  ELEMENT_ICONS[elKey](ctx, cx, cy, s, ELEMENTS[elKey].color);
}
function drawFusedArt(ctx, cx, cy, s, fusedFrom) {
  const color1 = ELEMENTS[fusedFrom[0]].color, color2 = ELEMENTS[fusedFrom[1]].color;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  const grad = ctx.createLinearGradient(-s, -s, s, s);
  grad.addColorStop(0, lighten(color1, 15));
  grad.addColorStop(0.5, color1);
  grad.addColorStop(0.5, color2);
  grad.addColorStop(1, lighten(color2, 15));
  ctx.fillStyle = grad;
  roundRectPath(ctx, -s * 0.82, -s * 0.82, s * 1.64, s * 1.64, s * 0.3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}
function drawCardFace(ictx, cx, cy, s, elKey, def) {
  ictx.clearRect(0, 0, cx * 2, cy * 2);
  drawElementArt(ictx, cx, cy, s, elKey);
  ictx.font = 'bold ' + Math.round(s * 0.62) + 'px "Noto Sans TC", sans-serif';
  ictx.textAlign = 'center'; ictx.textBaseline = 'middle';
  ictx.lineWidth = 4; ictx.strokeStyle = 'rgba(0,0,0,0.55)';
  ictx.strokeText(def.name, cx, cy + 2);
  ictx.fillStyle = '#ffffff';
  ictx.fillText(def.name, cx, cy + 2);
}

// ===== 塔 =====
function createTower(col, row, elKey) {
  const def = ELEMENTS[elKey];
  return {
    col, row, center: cellCenter(col, row),
    element: elKey, fusedFrom: null, name: def.name, color: def.color,
    baseDmg: def.dmg, dmg: def.dmg, baseRange: def.range, range: def.range,
    atkInterval: def.atkInterval, level: 1, special: def.effect,
    cooldown: 0, createdAt: performance.now()
  };
}
function upgradeCost(t) {
  const base = t.element ? ELEMENTS[t.element].cost : Math.round((ELEMENTS[t.fusedFrom[0]].cost + ELEMENTS[t.fusedFrom[1]].cost) / 2);
  return Math.round(base * 0.55 * t.level);
}
function upgradeTower(t) {
  t.level++;
  t.dmg = Math.round(t.baseDmg * Math.pow(1.4, t.level - 1));
  t.range = Math.round(t.baseRange * Math.pow(1.06, t.level - 1));
}
function fuseTower(t, newEl) {
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
function getTowerDamage(t) {
  if (t.special === 'grow') {
    const age = performance.now() - t.createdAt;
    const growth = Math.min(Math.floor(age / 4000) * t.dmg * 0.15, t.dmg * 1.5);
    return t.dmg + growth;
  }
  return t.dmg;
}
function findTargets(t) {
  const inRange = state.enemies.filter(e => !e.escaped && e.hp > 0 && dist(t.center, e) <= t.range);
  if (!inRange.length) return [];
  inRange.sort((a, b) => b.distanceTraveled - a.distanceTraveled);
  if (t.special === 'multi') return inRange.slice(0, 3);
  return [inRange[0]];
}
function spawnProjectile(t, e) {
  state.projectiles.push({ x: t.center.x, y: t.center.y, color: t.color, target: e, tower: t, speed: 460 });
}
function updateTower(t, dt) {
  t.cooldown -= dt * 1000;
  if (t.cooldown <= 0) {
    const targets = findTargets(t);
    if (targets.length) {
      targets.forEach(e => spawnProjectile(t, e));
      t.cooldown = t.atkInterval;
    }
  }
}

// ===== 戰鬥效果 =====
function addStatus(e, key, obj) { e.statuses[key] = obj; }
function splash(primary, radius, fn) {
  state.enemies.forEach(o => {
    if (o !== primary && !o.escaped && o.hp > 0 && dist(o, primary) <= radius) fn(o);
  });
}
function applySpecial(tower, primary, dmg) {
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
function applyHit(tower, enemy) {
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
function updateProjectiles(dt) {
  state.projectiles = state.projectiles.filter(p => {
    if (!p.target || p.target.hp <= 0 || p.target.escaped) return false;
    const dx = p.target.x - p.x, dy = p.target.y - p.y, d = Math.hypot(dx, dy);
    const move = p.speed * dt;
    if (move >= d) { applyHit(p.tower, p.target); return false; }
    p.x += dx / d * move; p.y += dy / d * move;
    return true;
  });
}
function spawnFloatingText(x, y, text, color, size) {
  state.floatTexts.push({ x, y, text, color, life: 700, maxLife: 700, size: size || 13 });
}
function spawnGoldText(x, y, amount) {
  state.floatTexts.push({ x, y, text: '💰+' + amount, color: '#ffd76b', life: 950, maxLife: 950, size: 18 });
}
function updateFloatTexts(dt) {
  state.floatTexts = state.floatTexts.filter(f => {
    f.life -= dt * 1000; f.y -= dt * 28;
    return f.life > 0;
  });
}
function spawnCoinBurst(x, y) {
  for (let i = 0; i < 7; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 70;
    state.particles.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 40,
      life: 550, maxLife: 550, size: 2 + Math.random() * 2
    });
  }
}
function updateParticles(dt) {
  state.particles = state.particles.filter(p => {
    p.life -= dt * 1000;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 220 * dt;
    return p.life > 0;
  });
}

// ===== 敵人 =====
function spawnNextEnemy() {
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
function ccFactor(e) { return 1 - (e.ccResist || 0); }
function updateEnemy(e, dt) {
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

// ===== 波次控制 =====
function startWave() {
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
function endGame(win) {
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
function attemptDropOnCell(col, row, element, slot) {
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
function updateGame(dtRaw) {
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

// ===== 繪製 =====
function draw() {
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

// ===== UI =====
function updateUI() {
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

// ===== 提示框 =====
const tooltipEl = document.getElementById('gameTooltip');
function showTooltip(html, x, y) {
  tooltipEl.innerHTML = html;
  tooltipEl.classList.remove('hidden');
  const pad = 16;
  let left = x + pad, top = y + pad;
  const rect = tooltipEl.getBoundingClientRect();
  if (left + rect.width > window.innerWidth) left = x - rect.width - pad;
  if (top + rect.height > window.innerHeight) top = y - rect.height - pad;
  tooltipEl.style.left = Math.max(4, left) + 'px';
  tooltipEl.style.top = Math.max(4, top) + 'px';
}
function hideTooltip() { tooltipEl.classList.add('hidden'); }
function statRow(label, value) { return '<div class="tt-row"><span>' + label + '</span><span>' + value + '</span></div>'; }
function cardTooltipHtml(def) {
  const aps = (1000 / def.atkInterval).toFixed(1);
  let html = '<div class="tt-title"><span style="color:' + def.color + '">◆</span>' + def.name + '</div>';
  html += statRow('傷害', def.dmg) + statRow('射程', def.range) + statRow('攻速', aps + ' 次/秒') + statRow('召喚花費', '💰' + def.cost);
  html += '<div class="tt-desc">' + def.desc + '</div>';
  return html;
}
function towerTooltipHtml(t) {
  const dmg = Math.round(getTowerDamage(t));
  const aps = (1000 / t.atkInterval).toFixed(1);
  const desc = t.fusedFrom ? COMBOS[[...t.fusedFrom].sort().join('+')].desc : ELEMENTS[t.element].desc;
  let html = '<div class="tt-title"><span style="color:' + t.color + '">◆</span>' + t.name + ' · Lv.' + t.level + '</div>';
  html += statRow('傷害', dmg) + statRow('射程', Math.round(t.range)) + statRow('攻速', aps + ' 次/秒');
  if (t.fusedFrom) html += statRow('組成', ELEMENTS[t.fusedFrom[0]].name + '+' + ELEMENTS[t.fusedFrom[1]].name);
  html += '<div class="tt-desc">' + desc + '</div>';
  return html;
}
function enemyTooltipHtml(e) {
  let html = '<div class="tt-title">' + (e.isBoss ? '👑 首領' : '敵人') + (e.element ? '・' + ELEMENTS[e.element].name + '屬性' : '') + '</div>';
  html += statRow('生命值', Math.max(0, Math.ceil(e.hp)) + ' / ' + e.maxHp) + statRow('移動速度', Math.round(e.speed));
  let tags = '';
  if (e.element) {
    const weakTo = Object.keys(OVERCOMES).find(k => OVERCOMES[k] === e.element);
    const resistTo = OVERCOMES[e.element];
    if (weakTo) tags += '<span class="tt-tag tt-weak">弱點：' + ELEMENTS[weakTo].name + '系 +60%</span>';
    if (resistTo) tags += '<span class="tt-tag tt-resist">抗性：' + ELEMENTS[resistTo].name + '系 -35%</span>';
  }
  if (e.armor) tags += '<span class="tt-tag tt-armor">護甲：全屬性減傷 ' + Math.round(e.armor * 100) + '%</span>';
  if (e.ccResist) tags += '<span class="tt-tag tt-armor">異常狀態抗性 ' + Math.round(e.ccResist * 100) + '%</span>';
  if (tags) html += '<div class="tt-desc">' + tags + '</div>';
  return html;
}
function computeFusePreview(existing, newEl) {
  const key = [existing.element, newEl].sort().join('+');
  const combo = COMBOS[key];
  if (!combo) return null;
  const d1 = ELEMENTS[existing.element], d2 = ELEMENTS[newEl];
  return {
    name: combo.name, color: combo.color, fusedFrom: [existing.element, newEl],
    dmg: Math.round((d1.dmg + d2.dmg) / 2 * combo.dmgMult),
    range: Math.round((d1.range + d2.range) / 2 * 1.1),
    atkInterval: Math.round((d1.atkInterval + d2.atkInterval) / 2 * 0.9),
    desc: combo.desc
  };
}
function fusionPreviewHtml(preview) {
  const aps = (1000 / preview.atkInterval).toFixed(1);
  let html = '<div class="tt-title">🔮 融合預覽</div>';
  html += '<div class="tt-fusion-preview"><canvas class="fusion-icon" width="96" height="96"></canvas><div class="tt-fusion-stats">';
  html += statRow('新腳色', preview.name) + statRow('傷害', preview.dmg) + statRow('射程', preview.range) + statRow('攻速', aps + ' 次/秒');
  html += '</div></div><div class="tt-desc">' + preview.desc + '</div>';
  return html;
}
function upgradePreviewHtml(t) {
  const nextLevel = t.level + 1;
  const nextDmg = Math.round(t.baseDmg * Math.pow(1.4, nextLevel - 1));
  const nextRange = Math.round(t.baseRange * Math.pow(1.06, nextLevel - 1));
  let html = '<div class="tt-title"><span style="color:' + t.color + '">◆</span>' + t.name + ' 升級預覽</div>';
  html += statRow('等級', 'Lv.' + t.level + ' <span class="tt-upgrade-arrow">→</span> Lv.' + nextLevel);
  html += statRow('傷害', Math.round(getTowerDamage(t)) + ' <span class="tt-upgrade-arrow">→</span> ' + nextDmg);
  html += statRow('射程', Math.round(t.range) + ' <span class="tt-upgrade-arrow">→</span> ' + nextRange);
  html += statRow('花費', '💰' + upgradeCost(t));
  return html;
}
function updateDragTooltip(clientX, clientY) {
  if (!state.dragging || !state.hoverCell) { hideTooltip(); return; }
  const { col, row } = state.hoverCell;
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) { hideTooltip(); return; }
  const existing = towerAt(col, row);
  if (!existing) { hideTooltip(); return; }
  const el = state.dragging.element;
  if (existing.level < 3 && ((existing.element === el) || (existing.fusedFrom && existing.fusedFrom.includes(el)))) {
    showTooltip(upgradePreviewHtml(existing), clientX, clientY);
  } else if (!existing.fusedFrom && existing.element !== el) {
    const preview = computeFusePreview(existing, el);
    if (preview) {
      showTooltip(fusionPreviewHtml(preview), clientX, clientY);
      const c = tooltipEl.querySelector('.fusion-icon');
      if (c) drawFusedArt(c.getContext('2d'), 48, 48, 34, preview.fusedFrom);
    } else hideTooltip();
  } else {
    hideTooltip();
  }
}
function updateCanvasHoverTooltip(clientX, clientY) {
  if (!state.mousePoint) { hideTooltip(); return; }
  const t = towerNear(state.mousePoint, 26);
  if (t) { showTooltip(towerTooltipHtml(t), clientX, clientY); return; }
  const en = enemyNear(state.mousePoint);
  if (en) { showTooltip(enemyTooltipHtml(en), clientX, clientY); return; }
  hideTooltip();
}

function renderHand() {
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

function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX, y = (e.clientY - rect.top) * scaleY;
  if (x < 0 || y < 0 || x >= W || y >= H) return null;
  return { col: Math.floor(x / CELL), row: Math.floor(y / CELL) };
}

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

function pointFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX, y = (e.clientY - rect.top) * scaleY;
  if (x < 0 || y < 0 || x >= W || y >= H) return null;
  return { x, y };
}
canvas.addEventListener('mousemove', e => {
  if (state.dragging || state.movingTower) return;
  state.mousePoint = pointFromEvent(e);
  updateCanvasHoverTooltip(e.clientX, e.clientY);
});
canvas.addEventListener('mouseleave', () => { state.mousePoint = null; hideTooltip(); });
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

// ===== 塔的移動 =====
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
function lobbyToast(msg) {
  const el = document.getElementById('lobbyToast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(lobbyToast._t);
  lobbyToast._t = setTimeout(() => el.classList.remove('show'), 1600);
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

// ===== 啟動 =====
state.loadout = loadLoadout();
renderLoadoutGrid();
state.hand = [drawRandomElement(), drawRandomElement(), drawRandomElement(), drawRandomElement()];
renderHand();
populateComboList();
updateUI();

let lastTs = null;
function loop(ts) {
  if (lastTs === null) lastTs = ts;
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;
  if (!state.ended) updateGame(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
