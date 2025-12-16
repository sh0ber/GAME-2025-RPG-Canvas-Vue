import { Character } from '@/game/Character.js';

export class Enemy extends Character {
  constructor(x, y) {
    super(x, y);
    this.speed = 150;
    this.faction = 'monster';
    this.aggroRange = 300;
    this.leashMultiplier = 1.25;
    this.tileType = 3; 
    this.target = null;
    // Added this explicitly to avoid undefined errors
    this.velocity = { x: 0, y: 0 }; 
  }

  update(deltaTime, zone) {
    super.update(deltaTime, zone);

    // LEASHING: Squared check to avoid sqrt
    if (this.target) {
      const dx = this.x - this.target.x;
      const dy = this.y - this.target.y;
      const leashRangeSq = (this.aggroRange * this.leashMultiplier) ** 2;

      if ((dx * dx + dy * dy) > leashRangeSq || this.target.active === false) {
        this.target = null;
      }
    }
  }

  // Returns raw direction vector {-1 to 1}
  getIntentVector() {
    if (!this.target) return { x: 0, y: 0 };
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: dx / mag, y: dy / mag };
  }
}