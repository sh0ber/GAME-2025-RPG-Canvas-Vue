import { GameConfig } from '@/config/config.js';

export class CameraManager {
  constructor() {
    this.width = GameConfig.CANVAS_WIDTH;
    this.height = GameConfig.CANVAS_HEIGHT;
    this.x = 0;
    this.y = 0;
    this.xMax = 0;
    this.yMax = 0;
    this.targetId = -1; // Changed from null to -1
  }

  setMapBoundaries(cols, rows) {
    this.xMax = cols * GameConfig.TILE_SIZE;
    this.yMax = rows * GameConfig.TILE_SIZE;
  }

  // Set the ID of the character to follow (usually 0 for the Hero)
  setTargetId(id) {
    this.targetId = id;
  }

  update(system) {
    if (this.targetId === -1 || this.targetId >= system.activeCount) return;

    const targetX = system.x[this.targetId];
    const targetY = system.y[this.targetId];

    // Center and clamp
    let nextX = targetX - this.width / 2;
    let nextY = targetY - this.height / 2;
    
    nextX = Math.max(0, Math.min(nextX, this.xMax - this.width));
    nextY = Math.max(0, Math.min(nextY, this.yMax - this.height));

    // OPTIMIZATION: Rounding the camera prevent "Tile Jitter" when moving at sub-pixel speeds (common with deltaTime)
    this.x = Math.round(nextX);
    this.y = Math.round(nextY);
  }

  getVisibleGridBoundaries() {
    const TILE_SIZE = GameConfig.TILE_SIZE;
    // We add +1 to the end indices to act as a buffer for smooth scrolling
    const startCol = Math.floor(this.x / TILE_SIZE);
    const endCol = startCol + Math.ceil(this.width / TILE_SIZE);
    const startRow = Math.floor(this.y / TILE_SIZE);
    const endRow = startRow + Math.ceil(this.height / TILE_SIZE);

    return { startCol, endCol, startRow, endRow };
  }
}