import { GameConfig } from '@/config/config.js';
// TODO:  Character pooling!  When a character dies, put it in a pool to be reused later.

const DIAGONAL_FACTOR = 0.70710678;

export class Character {
  constructor(x, y) {
    // Spatial
    this.x = x;
    this.y = y;
    this.xSpawn = x; // Remember spawn point for respawns / leash
    this.ySpawn = y; // Remember spawn point for respawns / leash
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

  // == Gameplay
  update(deltaTime, zone) {
    // Update effects
    this.effects = this.effects.filter(effect => {
      effect.onTick(this, deltaTime);
      if (effect.duration <= 0) { effect.onRemove(this); return false; }
      return true;
    });
  }

  // == Spatial
  move(dirX, dirY, deltaTime, zone) {
    const vx = dirX * this.speed * deltaTime;
    const vy = dirY * this.speed * deltaTime;

    if (!zone.checkCollision(this, this.x + vx, this.y)) this.x += vx;
    if (!zone.checkCollision(this, this.x, this.y + vy)) this.y += vy;
    
    zone.clamp(this);
  }
}