import { Character } from '@/game/Character.js';

export class Enemy extends Character {
  constructor(x, y) {
    super(x, y);
    this.speed = 150;
    this.faction = 'monster';
    this.aggroRange = 500;
    this.leashMultiplier = 1.5;
    this.tileType = 3;
    this.target = null;
  }

  update(deltaTime, zone) {
    super.update(deltaTime, zone);

    // 1. LEASHING: Squared check to avoid sqrt
    if (this.target) {
      const dx = this.x - this.target.x;
      const dy = this.y - this.target.y;
      const leashRangeSq = (this.aggroRange * this.leashMultiplier) ** 2;

      if ((dx * dx + dy * dy) > leashRangeSq || this.target.active === false) {
        this.target = null;
      }
    }

    // 2. STEERING
    if (this.target) {
      this.tryMove(this.target.x - this.x, this.target.y - this.y, deltaTime, zone);
    }
  }

  tryMove(targetDirX, targetDirY, deltaTime, zone) {
    const { avoidX, avoidY, count } = this.resolveCrowding(zone);

    // Alpha Max Plus Beta Min approximation for fast vector normalization
    const getMag = (x, y) => {
      const ax = Math.abs(x), ay = Math.abs(y);
      return (ax > ay) ? (0.96 * ax + 0.4 * ay) : (0.96 * ay + 0.4 * ax);
    };

    // 1. Normalize Target Force
    const tMag = getMag(targetDirX, targetDirY) || 1;
    const targetUnitX = targetDirX / tMag;
    const targetUnitY = targetDirY / tMag;

    // 2. BLEND: Target (1.0) + Avoidance (2.5)
    let moveX = targetUnitX + (avoidX * 2.5);
    let moveY = targetUnitY + (avoidY * 2.5);

    // 3. GO AROUND (Sideways nudge if stuck)
    if (count > 0 && Math.abs(moveX) < 0.5 && Math.abs(moveY) < 0.5) {
      moveX += avoidY * 2.0;
      moveY -= avoidX * 2.0;
    }

    // 4. Final Normalization & Speed Application
    const finalMag = getMag(moveX, moveY) || 1;
    const vx = (moveX / finalMag) * this.speed * deltaTime;
    const vy = (moveY / finalMag) * this.speed * deltaTime;

    this.move(vx, vy, zone);
  }

  resolveCrowding(zone) {
    const neighbors = zone.getNearby(this, 1);
    const minDist = 24;
    const minDistSq = minDist * minDist;
    let steerX = 0, steerY = 0, count = 0;

    for (let i = 0; i < neighbors.length; i++) {
      const other = neighbors[i];
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dSq = dx * dx + dy * dy;

      if (dSq < minDistSq && dSq > 0) {
        const dist = (dSq + 784) / 56; // Linear approximation
        const overlap = (minDist - dist);
        const force = overlap / minDist;
        const weight = (other === this.target) ? 3.0 : 1.0;

        steerX += (dx / dist) * force * weight;
        steerY += (dy / dist) * force * weight;
        count++;
      }
    }
    return { avoidX: steerX, avoidY: steerY, count };
  }
}