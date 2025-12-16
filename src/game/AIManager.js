import { Enemy } from '@/game/Enemy.js';

export class AIManager {
  constructor() {
    this.minDist = 28; 
    this.minDistSq = 784; 
    this.moveThresholdSq = 0.0025; // (0.05 * 0.05) to avoid sqrt in threshold check
  }

  processAI(deltaTime, zone) {
    const allObjects = zone.gameObjects;
    const enemies = allObjects.filter(obj => obj instanceof Enemy);

    for (let i = 0; i < enemies.length; i++) {
      const actor = enemies[i];

      // 1. TARGET ACQUISITION (Squared Check)
      if (!actor.target) {
        let currentMinDistSq = (actor.aggroRange || 500) ** 2;
        for (let j = 0; j < allObjects.length; j++) {
          const obj = allObjects[j];
          if (obj.faction !== actor.faction && obj.faction !== 'neutral') {
            const dx = obj.x - actor.x, dy = obj.y - actor.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < currentMinDistSq) {
              currentMinDistSq = dSq;
              actor.target = obj;
            }
          }
        }
      }
      if (!actor.target) continue;

      // 2. DEADZONE (Squared Check)
      const dx = actor.target.x - actor.x, dy = actor.target.y - actor.y;
      const distSq = dx * dx + dy * dy;
      const rangeSq = (actor.attackRange || 30) ** 2;

      if (distSq <= rangeSq) {
        actor.velocity.x = 0; actor.velocity.y = 0;
        continue; 
      }

      // 3. FORCE CALCULATION (Approximation)
      let forceX = 0, forceY = 0;
      
      // Inline absolute values for FastDist
      const adx = dx < 0 ? -dx : dx;
      const ady = dy < 0 ? -dy : dy;
      const d = adx > ady ? (0.96 * adx + 0.4 * ady) : (0.96 * ady + 0.4 * adx);
      
      forceX = dx / d;
      forceY = dy / d;

      // Neighbor Separation (Squared Gate)
      const neighbors = zone.getNearby(actor, 1);
      for (let n = 0; n < neighbors.length; n++) {
        const neighbor = neighbors[n];
        if (neighbor === actor || !(neighbor instanceof Enemy)) continue;

        const nx = actor.x - neighbor.x, ny = actor.y - neighbor.y;
        const nDistSq = nx * nx + ny * ny;

        if (nDistSq < this.minDistSq && nDistSq > 0) {
          const anx = nx < 0 ? -nx : nx;
          const any = ny < 0 ? -ny : ny;
          const nD = anx > any ? (0.96 * anx + 0.4 * any) : (0.96 * any + 0.4 * anx);
          
          const push = (this.minDist - nD) / this.minDist;
          forceX += (nx / nD) * push;
          forceY += (ny / nD) * push;
        }
      }

      // 4. JITTER-FREE MOVEMENT
      const afx = forceX < 0 ? -forceX : forceX;
      const afy = forceY < 0 ? -forceY : forceY;
      const fMag = afx > afy ? (0.96 * afx + 0.4 * afy) : (0.96 * afy + 0.4 * afx);

      if (fMag > 0.01) {
        const vx = (forceX / fMag) * actor.speed * deltaTime;
        const vy = (forceY / fMag) * actor.speed * deltaTime;
        
        // Threshold Check (Squared to skip another sqrt)
        if ((vx * vx + vy * vy) > this.moveThresholdSq) {
          actor.move(vx, vy, zone);
        }
      }
    }
  }
}