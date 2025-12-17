import { Enemy } from '@/game/Enemy.js';

export class AIManager {
  constructor() {
    this.moveThresholdSq = 0.0025; 
  }

  processAI(deltaTime, zone) {
    // 1. Get only active enemies from the spatial hash/grid
    const enemies = zone.gameObjects.filter(obj => obj instanceof Enemy);

    for (const actor of enemies) {
      // 1. Target Acquisition
      if (!actor.target || actor.target.active === false) {
        actor.target = this.findNearestHostile(actor, zone);
      }

      if (!actor.target) continue;

      // 2. Get the direction from the Actor
      // This calls the logic we moved into the Enemy class
      const force = actor.calculateSteeringForce(zone);
      
      // 3. APPLY MOVEMENT (The missing link)
      const vx = force.x * actor.speed * deltaTime;
      const vy = force.y * actor.speed * deltaTime;

      // Jitter-free check
      if ((vx * vx + vy * vy) > this.moveThresholdSq) {
        actor.move(vx, vy, zone);
      }
    }
  }

  findNearestHostile(actor, zone) {
    let currentMinDistSq = (actor.aggroRange || 500) ** 2;
    let closest = null;

    for (let i = 0; i < zone.gameObjects.length; i++) {
      const obj = zone.gameObjects[i];
      if (obj.faction !== actor.faction && obj.faction !== 'neutral' && obj.active !== false) {
        const dx = obj.x - actor.x;
        const dy = obj.y - actor.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < currentMinDistSq) {
          currentMinDistSq = dSq;
          closest = obj;
        }
      }
    }
    return closest;
  }
}