import { GameConfig } from '@/config/config.js';

const DIAGONAL_FACTOR = 0.70710678;

export class Character {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = GameConfig.TILE_SIZE;
    this.height = GameConfig.TILE_SIZE;
    this.speed = 100;
    this.attackRange = 30; // Eventually weapon based

    this.faction = 'neutral';
    this.effects = [];
    this.target = null;
  }

  get centerX() { return this.x + this.width / 2; }
  get centerY() { return this.y + this.height / 2; }
  get bottomY() { return this.y + this.height; }

  update(deltaTime, zone) {
    this.effects = this.effects.filter(effect => {
      effect.onTick(this, deltaTime);
      if (effect.duration <= 0) { effect.onRemove(this); return false; }
      return true;
    });
  }

  move(vx, vy, zone) {
    // Pure movement logic
    if (!this.isCollidingAt(this.x + vx, this.y, zone)) this.x += vx;
    if (!this.isCollidingAt(this.x, this.y + vy, zone)) this.y += vy;
  }

  isCollidingAt(tx, ty, zone) {
    // Standard tile check
    if (this._check(tx + 2, ty + 2, zone) ||
      this._check(tx + this.width - 2, ty + 2, zone) ||
      this._check(tx + 2, ty + this.height - 2, zone) ||
      this._check(tx + this.width - 2, ty + this.height - 2, zone)) return true;

    return false;
  }

  _check(px, py, zone) {
    const col = (px / zone.tileSize) | 0;
    const row = (py / zone.tileSize) | 0;
    if (row < 0 || row >= zone.rows || col < 0 || col >= zone.cols) return true;
    return zone.isSolid(row, col);
  }

  clampToBoundaries(zone) {
    const maxX = (zone.cols * zone.tileSize) - this.width;
    const maxY = (zone.rows * zone.tileSize) - this.height;
    if (this.x < 0) this.x = 0; else if (this.x > maxX) this.x = maxX;
    if (this.y < 0) this.y = 0; else if (this.y > maxY) this.y = maxY;
  }
}