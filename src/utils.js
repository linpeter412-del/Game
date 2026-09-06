// ===== 工具函式 =====
export function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

export function getContrastColor(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16), g = parseInt(c.substring(2, 4), 16), b = parseInt(c.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#1a1a1a' : '#ffffff';
}

export function roundRectPath(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export function lighten(hex, amt) {
  const c = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(c.substring(0, 2), 16) + amt));
  const g = Math.max(0, Math.min(255, parseInt(c.substring(2, 4), 16) + amt));
  const b = Math.max(0, Math.min(255, parseInt(c.substring(4, 6), 16) + amt));
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

export function darken(hex, amt) { return lighten(hex, -amt); }
