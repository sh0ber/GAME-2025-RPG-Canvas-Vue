import { GameConfig } from '@/config/config.js';
// TODO:  Character pooling!  When a character dies, put it in a pool to be reused later.

const DIAGONAL_FACTOR = 0.70710678;

export class Character {
  constructor(x, y) {
    // Spatial
    this.x = x;
    this.y = y;
    this.width = GameConfig.TILE_SIZE;
    this.height = GameConfig.TILE_SIZE;

    // Stats
    this.speed = 100;
    this.atkSpd = 1.0;
    this.attackRange = 30; // Eventually weapon based

    // Personality
    this.faction = 'neutral';

    // Gameplay
    this.effects = [];
    this.target = null;

    // AI
    this.isAIControlled = false;

    // Lifecycle
    this.isEnabled = true; // Technical state: Is this object currently in the AI/Physics loops?
    this.isAlive = true; // Gameplay state: Is this character still a participant in combat?
  }

  get centerX() { return this.x + this.width / 2; }
  get centerY() { return this.y + this.height / 2; }
  get bottomY() { return this.y + this.height; }

  update(deltaTime, zone) {
    // Update effects
    this.effects = this.effects.filter(effect => {
      effect.onTick(this, deltaTime);
      if (effect.duration <= 0) { effect.onRemove(this); return false; }
      return true;
    });
  }

  move(dirX, dirY, deltaTime, zone) {
    // This is the ONLY place speed and deltaTime are applied
    const vx = dirX * this.speed * deltaTime;
    const vy = dirY * this.speed * deltaTime;

    if (!this.isCollidingAt(this.x + vx, this.y, zone)) this.x += vx;
    if (!this.isCollidingAt(this.x, this.y + vy, zone)) this.y += vy;
  }

  isCollidingAt(newX, newY, zone) {
    const inset = 2;

    const isBlocked =
      !this.isTileWalkable(newX + inset, newY + inset, zone) ||
      !this.isTileWalkable(newX + this.width - inset, newY + inset, zone) ||
      !this.isTileWalkable(newX + inset, newY + this.height - inset, zone) ||
      !this.isTileWalkable(newX + this.width - inset, newY + this.height - inset, zone);

    return isBlocked;
  }

  isTileWalkable(px, py, zone) {
    const col = (px / zone.tileSize) | 0;
    const row = (py / zone.tileSize) | 0;
    const isWithinBounds = row >= 0 && row < zone.rows && col >= 0 && col < zone.cols;
    if (!isWithinBounds) return false;
    return !zone.isSolid(row, col);
  }

  clampToBoundaries(zone) {
    const maxX = (zone.cols * zone.tileSize) - this.width;
    const maxY = (zone.rows * zone.tileSize) - this.height;
    if (this.x < 0) this.x = 0; else if (this.x > maxX) this.x = maxX;
    if (this.y < 0) this.y = 0; else if (this.y > maxY) this.y = maxY;
  }
}