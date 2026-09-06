import { state, drawRandomElement } from './state.js';
import { updateGame } from './game.js';
import { draw } from './render.js';
import { renderHand } from './hand.js';
import { initHud, updateUI } from './hud.js';
import { initCanvasInput } from './input.js';
import { initLobby } from './lobby.js';

// ===== 啟動 =====
initLobby();          // 先還原裝備，之後抽牌才有正確的牌池
initHud();
initCanvasInput();

state.hand = [drawRandomElement(), drawRandomElement(), drawRandomElement(), drawRandomElement()];
renderHand();
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
