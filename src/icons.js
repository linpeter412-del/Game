import { ELEMENTS } from './config.js';
import { lighten, darken, roundRectPath } from './utils.js';

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
export function drawElementArt(ctx, cx, cy, s, elKey) {
  ELEMENT_ICONS[elKey](ctx, cx, cy, s, ELEMENTS[elKey].color);
}
export function drawFusedArt(ctx, cx, cy, s, fusedFrom) {
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
export function drawCardFace(ictx, cx, cy, s, elKey, def) {
  ictx.clearRect(0, 0, cx * 2, cy * 2);
  drawElementArt(ictx, cx, cy, s, elKey);
  ictx.font = 'bold ' + Math.round(s * 0.62) + 'px "Noto Sans TC", sans-serif';
  ictx.textAlign = 'center'; ictx.textBaseline = 'middle';
  ictx.lineWidth = 4; ictx.strokeStyle = 'rgba(0,0,0,0.55)';
  ictx.strokeText(def.name, cx, cy + 2);
  ictx.fillStyle = '#ffffff';
  ictx.fillText(def.name, cx, cy + 2);
}
