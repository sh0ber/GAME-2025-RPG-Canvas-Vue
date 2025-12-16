import { GameConfig } from '@/config/config.js';

const DIAGONAL_FACTOR = 0.70710678;

export class Character {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = GameConfig.TILE_SIZE;
    this.height = GameConfig.TILE_SIZE;
    this.speed = 100;
    this.faction = 'monster';
    this.effects = [];
    this.aggroRange = 500;
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

  tryMove(targetDirX, targetDirY, deltaTime, zone, isAI = false) {
    let moveX = 0, moveY = 0;

    if (isAI) {
      const { avoidX, avoidY, count } = this.resolveCrowding(zone);

      // Normalize the target direction first so it has a magnitude of 1
      const tMag = Math.abs(targetDirX) + Math.abs(targetDirY) || 1;
      const unitTargetX = targetDirX / tMag;
      const unitTargetY = targetDirY / tMag;

      // BLEND: Target (1.0 weight) + Avoidance (2.5 weight)
      // Avoidance is much higher to prevent stacking
      moveX = unitTargetX + avoidX * 2.5;
      moveY = unitTargetY + avoidY * 2.5;

      // GO AROUND: If blocked, nudge sideways
      if (count > 0 && (Math.abs(moveX) < 0.5 && Math.abs(moveY) < 0.5)) {
        moveX += avoidY * 2.0;
        moveY -= avoidX * 2.0;
      }
    } else {
      moveX = targetDirX;
      moveY = targetDirY;
    }

    // Fast Magnitude & Normalize
    const ax = Math.abs(moveX), ay = Math.abs(moveY);
    const mag = (ax > ay) ? (0.96 * ax + 0.4 * ay) : (0.96 * ay + 0.4 * ax);

    if (mag < 0.01) return; // Static deadzone

    const vx = (moveX / mag) * this.speed * deltaTime;
    const vy = (moveY / mag) * this.speed * deltaTime;

    // Axis-Independent Collision
    if (!this.isCollidingAt(this.x + vx, this.y, zone)) this.x += vx;
    if (!this.isCollidingAt(this.x, this.y + vy, zone)) this.y += vy;
  }

  resolveCrowding(zone) {
    const neighbors = zone.getNearby(this, 1);
    const minDist = 28; // The "Personal Space" radius
    const minDistSq = 784;
    let steerX = 0, steerY = 0, count = 0;

    for (let i = 0; i < neighbors.length; i++) {
      const other = neighbors[i];
      if (other === this) continue;

      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dSq = dx * dx + dy * dy;

      if (dSq < minDistSq && dSq > 0) {
        // 1. Calculate actual overlap in pixels
        // Approx sqrt: (dSq + 784) / (2 * 28) is a fast linear fit for this range
        const dist = (dSq + 784) / 56;
        const overlap = (minDist - dist);

        // 2. Push force: Stronger as overlap increases
        const force = overlap / minDist;

        // 3. Targets (Player) act as a solid wall
        const weight = (other === this.target) ? 3.0 : 1.0;

        steerX += (dx / dist) * force * weight;
        steerY += (dy / dist) * force * weight;
        count++;
      }
    }
    return { avoidX: steerX, avoidY: steerY, count };
  }

  isCollidingAt(tx, ty, zone) {
    // Standard tile check
    if (this._check(tx + 2, ty + 2, zone) ||
      this._check(tx + this.width - 2, ty + 2, zone) ||
      this._check(tx + 2, ty + this.height - 2, zone) ||
      this._check(tx + this.width - 2, ty + this.height - 2, zone)) return true;

    // Hard body-block (Target is a solid wall to the seeker)
    if (this.target) {
      const dx = (tx + 16) - (this.target.x + 16);
      const dy = (ty + 16) - (this.target.y + 16);
      if (dx * dx + dy * dy < 676) return true; // 26px radius
    }
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