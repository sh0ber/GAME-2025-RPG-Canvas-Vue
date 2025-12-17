import { Enemy } from '@/game/Enemy.js';

export class AIManager {
  constructor() {
    this.moveThresholdSq = 0.0025;
  }

  processAI(deltaTime, zone) {
    const npcs = zone.npcs;

    for (let i = 0; i < npcs.length; i++) {
      const npc = npcs[i];

      // 1. DYNAMIC CHECK: Does this character have AI capabilities?
      // We check if it has the steering method, allowing any class to opt-in.
      if (typeof npc.calculateSteeringForce !== 'function') continue;

      // 2. TARGET ACQUISITION
      // If it doesn't have a target, or target is dead/gone
      if (!npc.target || npc.target.isEnabled === false) {
        // Spatial Optimization: Only check within aggro range
        const cellRadius = Math.ceil(npc.aggroRange / zone.tileSize);
        const candidates = zone.getNearby(npc, cellRadius);
        npc.target = this.findNearestHostile(npc, candidates);
      }

      if (!npc.target) continue;

      // 3. TARGET PERSISTENCE (Optional Leashing)
      // If your NPC has its own leashing logic in update(), it will handle clearing target.

      // 4. MOVEMENT
      const force = npc.calculateSteeringForce(zone);

      // Pass normalized intent to Character.move
      npc.move(force.x, force.y, deltaTime, zone);
    }
  }

  findNearestHostile(npc, candidates) {
    const policy = npc.huntPolicy;
    if (policy.length === 0) return null;

    let currentMinDistSq = npc.aggroRange * npc.aggroRange;
    let closest = null;

    for (let i = 0; i < candidates.length; i++) {
      const target = candidates[i];

      // Skip self, inactive targets, or targets not in hunt policy
      if (target === npc || !target.isEnabled || !target.isAlive) continue;
      if (!policy.includes(target.faction)) continue;

      const dx = target.x - npc.x;
      const dy = target.y - npc.y;
      const dSq = dx * dx + dy * dy;

      if (dSq < currentMinDistSq) {
        currentMinDistSq = dSq;
        closest = target;
      }
    }
    return closest;
  }
}