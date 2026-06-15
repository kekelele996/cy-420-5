import type { GameState } from '../models/gameState';
import { CellType } from '../constants/cell';
import { MAP_CONFIG } from '../constants/map';
import { logGame } from './gameLogger';

export function renderMap(canvas: HTMLCanvasElement, state: GameState) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = MAP_CONFIG.width * MAP_CONFIG.cellSize;
  canvas.height = MAP_CONFIG.height * MAP_CONFIG.cellSize;
  ctx.fillStyle = '#edf7ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const row of state.map) {
    for (const cell of row) {
      ctx.strokeStyle = '#d5e8f5';
      ctx.strokeRect(
        cell.x * MAP_CONFIG.cellSize,
        cell.y * MAP_CONFIG.cellSize,
        MAP_CONFIG.cellSize,
        MAP_CONFIG.cellSize
      );
      if (cell.type !== CellType.EMPTY) {
        ctx.fillStyle = cell.type === CellType.TRAIL ? '#f2c94c' : '#9fd3ff';
        ctx.fillRect(
          cell.x * MAP_CONFIG.cellSize + 2,
          cell.y * MAP_CONFIG.cellSize + 2,
          MAP_CONFIG.cellSize - 4,
          MAP_CONFIG.cellSize - 4
        );
      }
    }
  }
  for (const p of state.players) {
    if (p.speed_boost_ticks > 0) {
      const gradient = ctx.createRadialGradient(
        (p.position.x + 0.5) * MAP_CONFIG.cellSize,
        (p.position.y + 0.5) * MAP_CONFIG.cellSize,
        5,
        (p.position.x + 0.5) * MAP_CONFIG.cellSize,
        (p.position.y + 0.5) * MAP_CONFIG.cellSize,
        18
      );
      gradient.addColorStop(0, p.color + '80');
      gradient.addColorStop(1, p.color + '00');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(
        (p.position.x + 0.5) * MAP_CONFIG.cellSize,
        (p.position.y + 0.5) * MAP_CONFIG.cellSize,
        18,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(
      (p.position.x + 0.5) * MAP_CONFIG.cellSize,
      (p.position.y + 0.5) * MAP_CONFIG.cellSize,
      7,
      0,
      Math.PI * 2
    );
    ctx.fill();
    if (p.speed_boost_ticks > 0) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        (p.position.x + 0.5) * MAP_CONFIG.cellSize,
        (p.position.y + 0.5) * MAP_CONFIG.cellSize,
        9,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
  }
  logGame('MAP_RENDER', { tick: state.tick });
}
