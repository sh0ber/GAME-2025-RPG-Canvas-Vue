import { Enemy } from '@/game/Enemy.js';

export class AIManager {
  constructor() {
    this.updateIndex = 0;
    this.batchSize = 50; // Staggered search: 20 frames to update 1,000 enemies
  }

  processAI(deltaTime, zone) {
    const allObjects = zone.gameObjects;
    const enemies = [];
    
    // 1. Separate Enemies (O(n) pass)
    for (let i = 0; i < allObjects.length; i++) {
      const obj = allObjects[i];
      if (obj instanceof Enemy) {
        enemies.push(obj);
      }
    }

    // 2. DISTRIBUTED TARGET SEARCH
    const start = this.updateIndex;
    const end = Math.min(start + this.batchSize, enemies.length);

    for (let i = start; i < end; i++) {
      this.findNearestHostile(enemies[i], allObjects);
    }

    this.updateIndex = (end >= enemies.length) ? 0 : end;
  }

  findNearestHostile(actor, allObjects) {
    if (actor.target) return; // Leashing logic in Enemy.js handles target loss

    let closest = null;
    let minDistSq = actor.aggroRange ** 2;

    for (let i = 0; i < allObjects.length; i++) {
      const candidate = allObjects[i];
      if (candidate === actor || candidate.faction === actor.faction) continue;

      const dx = actor.x - candidate.x;
      const dy = actor.y - candidate.y;
      const dSq = dx * dx + dy * dy;

      if (dSq < minDistSq) {
        minDistSq = dSq;
        closest = candidate;
      }
    }
    actor.target = closest;
  }
}