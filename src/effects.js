import { state } from './state.js';

// ===== 浮動文字 / 粒子 =====
export function spawnFloatingText(x, y, text, color, size) {
  state.floatTexts.push({ x, y, text, color, life: 700, maxLife: 700, size: size || 13 });
}
export function spawnGoldText(x, y, amount) {
  state.floatTexts.push({ x, y, text: '💰+' + amount, color: '#ffd76b', life: 950, maxLife: 950, size: 18 });
}
export function updateFloatTexts(dt) {
  state.floatTexts = state.floatTexts.filter(f => {
    f.life -= dt * 1000; f.y -= dt * 28;
    return f.life > 0;
  });
}
export function spawnCoinBurst(x, y) {
  for (let i = 0; i < 7; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 70;
    state.particles.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 40,
      life: 550, maxLife: 550, size: 2 + Math.random() * 2
    });
  }
}
export function updateParticles(dt) {
  state.particles = state.particles.filter(p => {
    p.life -= dt * 1000;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 220 * dt;
    return p.life > 0;
  });
}
