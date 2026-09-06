import { CELL, W } from './config.js';

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
export const PATH_SET = new Set(pathCellsOrdered.map(([c,r]) => c + ',' + r));

export function cellCenter(col, row) { return { x: (col + 0.5) * CELL, y: (row + 0.5) * CELL }; }

export const PATH = {
  waypoints: [
    { x: -30, y: 90 },
    ...pathCellsOrdered.map(([c, r]) => cellCenter(c, r)),
    { x: W + 30, y: 150 }
  ]
};
