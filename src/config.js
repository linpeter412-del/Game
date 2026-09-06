// ===== 基本設定 =====
export const CELL = 60, COLS = 13, ROWS = 8;
export const W = COLS * CELL, H = ROWS * CELL;

// 費用大致與 DPS(傷害/攻擊間隔)成正比：約每 1 點 DPS 對應 3~3.4 金幣，
// 帶有控場/多重目標效果的元素(土的暈眩、風的多重攻擊)再加收一筆效果溢價。
export const ELEMENTS = {
  fire:  { name: '火', color: '#ff5533', cost: 30, dmg: 8,  range: 110, atkInterval: 900,  effect: 'burn',  desc: '燃燒：造成持續傷害' },
  water: { name: '水', color: '#33aaff', cost: 25, dmg: 6,  range: 100, atkInterval: 800,  effect: 'slow',  desc: '冰凍：減緩敵人速度' },
  wood:  { name: '木', color: '#55cc55', cost: 20, dmg: 6,  range: 90,  atkInterval: 1000, effect: 'grow',  desc: '生長：傷害隨時間增加' },
  metal: { name: '金', color: '#cfd6de', cost: 48, dmg: 20, range: 130, atkInterval: 1300, effect: 'pierce',desc: '破甲：高額單體傷害' },
  earth: { name: '土', color: '#b08654', cost: 32, dmg: 9,  range: 80,  atkInterval: 1100, effect: 'stun',  desc: '震擊：機率暈眩敵人' },
  wind:  { name: '風', color: '#8fe9cf', cost: 38, dmg: 4,  range: 120, atkInterval: 400,  effect: 'multi', desc: '疾風：攻速快，可攻擊多個目標' }
};
export const ELEMENT_KEYS = Object.keys(ELEMENTS);
export const OVERCOMES = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };

// 融合表的 key 必須是兩個元素名稱「排序後」以 '+' 相接，查表時才找得到。
export const COMBOS = {
  'fire+wood':   { name: '焚', color: '#ff8800', dmgMult: 2.0, effect: 'burnAoe',  desc: '烈焰焚燒，範圍持續傷害' },
  'fire+water':  { name: '蒸', color: '#e8f6ff', dmgMult: 1.6, effect: 'steamAoe', desc: '蒸氣爆散，範圍傷害＋減速' },
  'metal+water': { name: '銹', color: '#93a596', dmgMult: 1.4, effect: 'corrode', desc: '侵蝕鏽化，降低敵人防禦' },
  'earth+wood':  { name: '森', color: '#2f8f3f', dmgMult: 1.5, effect: 'root',    desc: '密林纏繞，短暫定身' },
  'fire+metal':  { name: '鍛', color: '#ff4411', dmgMult: 2.5, effect: 'pierceBig', desc: '鍛造烈刃，極高破甲傷害' },
  'fire+wind':   { name: '爆', color: '#ff7711', dmgMult: 2.2, effect: 'explode', desc: '爆裂衝擊，大範圍爆炸傷害' },
  'earth+wind':  { name: '沙', color: '#d8c08a', dmgMult: 1.3, effect: 'sandstorm', desc: '沙塵暴，大幅減速全場敵人' }
};

export const MAX_LOADOUT = 5;
export const LOADOUT_KEY = 'wordTD_loadout';
export const REROLL_ALL_COST = 25;

// ===== 波次 =====
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
export const WAVES = buildWaves();
