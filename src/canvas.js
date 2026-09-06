import { CELL, W, H } from './config.js';

export const canvas = document.getElementById('board');
export const ctx = canvas.getContext('2d');

// 畫布的顯示尺寸可能與內部解析度不同，所有滑鼠座標都必須經過這裡換算。
export function pointFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX, y = (e.clientY - rect.top) * scaleY;
  if (x < 0 || y < 0 || x >= W || y >= H) return null;
  return { x, y };
}

export function cellFromEvent(e) {
  const pt = pointFromEvent(e);
  if (!pt) return null;
  return { col: Math.floor(pt.x / CELL), row: Math.floor(pt.y / CELL) };
}
