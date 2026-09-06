import { COLS, ROWS, ELEMENTS, COMBOS, OVERCOMES } from './config.js';
import { state, towerAt, towerNear, enemyNear } from './state.js';
import { getTowerDamage, upgradeCost } from './tower.js';
import { drawFusedArt } from './icons.js';

// ===== 提示框 =====
const tooltipEl = document.getElementById('gameTooltip');
export function showTooltip(html, x, y) {
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
export function hideTooltip() { tooltipEl.classList.add('hidden'); }
export function statRow(label, value) { return '<div class="tt-row"><span>' + label + '</span><span>' + value + '</span></div>'; }
export function cardTooltipHtml(def) {
  const aps = (1000 / def.atkInterval).toFixed(1);
  let html = '<div class="tt-title"><span style="color:' + def.color + '">◆</span>' + def.name + '</div>';
  html += statRow('傷害', def.dmg) + statRow('射程', def.range) + statRow('攻速', aps + ' 次/秒') + statRow('召喚花費', '💰' + def.cost);
  html += '<div class="tt-desc">' + def.desc + '</div>';
  return html;
}
export function towerTooltipHtml(t) {
  const dmg = Math.round(getTowerDamage(t));
  const aps = (1000 / t.atkInterval).toFixed(1);
  const desc = t.fusedFrom ? COMBOS[[...t.fusedFrom].sort().join('+')].desc : ELEMENTS[t.element].desc;
  let html = '<div class="tt-title"><span style="color:' + t.color + '">◆</span>' + t.name + ' · Lv.' + t.level + '</div>';
  html += statRow('傷害', dmg) + statRow('射程', Math.round(t.range)) + statRow('攻速', aps + ' 次/秒');
  if (t.fusedFrom) html += statRow('組成', ELEMENTS[t.fusedFrom[0]].name + '+' + ELEMENTS[t.fusedFrom[1]].name);
  html += '<div class="tt-desc">' + desc + '</div>';
  return html;
}
export function enemyTooltipHtml(e) {
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
export function computeFusePreview(existing, newEl) {
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
export function fusionPreviewHtml(preview) {
  const aps = (1000 / preview.atkInterval).toFixed(1);
  let html = '<div class="tt-title">🔮 融合預覽</div>';
  html += '<div class="tt-fusion-preview"><canvas class="fusion-icon" width="96" height="96"></canvas><div class="tt-fusion-stats">';
  html += statRow('新腳色', preview.name) + statRow('傷害', preview.dmg) + statRow('射程', preview.range) + statRow('攻速', aps + ' 次/秒');
  html += '</div></div><div class="tt-desc">' + preview.desc + '</div>';
  return html;
}
export function upgradePreviewHtml(t) {
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
export function updateDragTooltip(clientX, clientY) {
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
export function updateCanvasHoverTooltip(clientX, clientY) {
  if (!state.mousePoint) { hideTooltip(); return; }
  const t = towerNear(state.mousePoint, 26);
  if (t) { showTooltip(towerTooltipHtml(t), clientX, clientY); return; }
  const en = enemyNear(state.mousePoint);
  if (en) { showTooltip(enemyTooltipHtml(en), clientX, clientY); return; }
  hideTooltip();
}
