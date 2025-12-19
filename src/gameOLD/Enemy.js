import { Character } from '@/game/Character.js';

// Reusable fast distance approximation
const fastDist = (dx, dy) => {
  const adx = dx < 0 ? -dx : dx;
  const ady = dy < 0 ? -dy : dy;
  return adx > ady ? (0.96 * adx + 0.4 * ady) : (0.96 * ady + 0.4 * adx);
};

export class Enemy extends Character {
  constructor(x, y) {
    super(x, y);
    this.isAIControlled = true;
    this.speed = 150;
    this.faction = 'monster';
    this.huntPolicy = ['hero'];
    this.tileType = 3;

    this.aggroRange = 300;
    this.leashMultiplier = 1.25;
    this.minDist = 28;
    this.attackRange = 30;
  }

  update(deltaTime, zone) {
    super.update(deltaTime, zone);

    if (this.target) {
      const dx = this.x - this.target.x;
      const dy = this.y - this.target.y;
      const leashRangeSq = (this.aggroRange * this.leashMultiplier) ** 2;

      // Drop target if out of leash range or dead
      if ((dx * dx + dy * dy) > leashRangeSq || this.target.active === false) {
        this.target = null;
      }
    }
  }

  // This is intentionally not in the AI manager to allow for easier customization per enemy type
  // But really you should move the different force strategies into another class
  // and have each enemy type reference that class instead of overriding this method
  calculateSteeringForce(zone) {
    if (!this.target) return { x: 0, y: 0 };

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distSq = dx * dx + dy * dy;

    // 1. Attack Range Check
    if (distSq <= (this.attackRange * this.attackRange)) return { x: 0, y: 0 };

    // 2. Initial Seek Force
    const d = fastDist(dx, dy);
    let fx = dx / d;
    let fy = dy / d;

    // 3. Separation (Neighbor logic moved from Manager to here)
    const neighbors = zone.getNeighbors(this, 1);
    for (let n = 0; n < neighbors.length; n++) {
      const neighbor = neighbors[n];
      if (neighbor === this || neighbor.faction !== this.faction) continue;

      const nx = this.x - neighbor.x;
      const ny = this.y - neighbor.y;
      const nDistSq = nx * nx + ny * ny;

      if (nDistSq < (this.minDist * this.minDist) && nDistSq > 0) {
        const nD = fastDist(nx, ny);
        const weight = (this.minDist - nD) / this.minDist;
        fx += (nx / nD) * weight;
        fy += (ny / nD) * weight;
      }
    }

    // Normalize final vector
    const totalMag = fastDist(fx, fy);
    return totalMag > 0.01 ? { x: fx / totalMag, y: fy / totalMag } : { x: 0, y: 0 };
  }
}