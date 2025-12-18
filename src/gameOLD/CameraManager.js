import { GameConfig } from '@/config/config.js';

export class CameraManager {
  constructor() {
    this.width = GameConfig.CANVAS_WIDTH;
    this.height = GameConfig.CANVAS_HEIGHT;
    this.x = 0;
    this.y = 0;
    this.xMax = 0;
    this.yMax = 0;
    this.target = null;
  }

  setMapBoundaries(cols, rows) {
    this.xMax = cols * GameConfig.TILE_SIZE;
    this.yMax = rows * GameConfig.TILE_SIZE;
  }

  setTarget(gameObject) {
    this.target = gameObject;
  }

  update() {
    if (!this.target) return;

    const targetX = this.target.x;
    const targetY = this.target.y;

    this.x = targetX - this.width / 2;
    this.y = targetY - this.height / 2;

    this.x = Math.max(0, Math.min(this.x, this.xMax - this.width));
    this.y = Math.max(0, Math.min(this.y, this.yMax - this.height));
  }

  getVisibleGridBoundaries() {
    const TILE_SIZE = GameConfig.TILE_SIZE;
    const startCol = Math.floor(this.x / TILE_SIZE);
    const endCol = startCol + Math.ceil(this.width / TILE_SIZE);
    const startRow = Math.floor(this.y / TILE_SIZE);
    const endRow = startRow + Math.ceil(this.height / TILE_SIZE);

    return { startCol, endCol, startRow, endRow };
  }
}