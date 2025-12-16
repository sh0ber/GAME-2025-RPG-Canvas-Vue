import { Enemy } from '@/game/Enemy.js';

export class AIManager {
  static STOP_THRESHOLD = 5;
  static SEPARATION_RADIUS = 30;
  static AGGRO_MULTIPLIER = 1.5;
  static SEPARATION_WEIGHT = 0.4; // The "nudge" factor

  processAI(deltaTime, zone, player) {
  for (const actor of zone.gameObjects) {
    if (!(actor instanceof Enemy)) continue;

    this.updateTarget(actor, zone, player);

    if (actor.target) {
      const dx = actor.target.x - actor.x;
      const dy = actor.target.y - actor.y;
      
      // Just pass the raw direction. The Character class handles the rest.
      actor.tryMove(dx, dy, deltaTime, zone, true);
    }
  }
}

  updateTarget(actor, zone, player) {
    if (actor.target) {
      const dx = actor.x - actor.target.x;
      const dy = actor.y - actor.target.y;
      const leashRangeSq = (actor.aggroRange * AIManager.AGGRO_MULTIPLIER) ** 2;

      if ((dx * dx + dy * dy) > leashRangeSq) {
        actor.target = null;
      } else {
        return;
      }
    }

    let candidates = [...zone.getNearby(actor, 2), player];
    let closest = null;
    let minDistSq = actor.aggroRange ** 2;

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      if (this.isHostile(actor, candidate)) {
        const dx = actor.x - candidate.x;
        const dy = actor.y - candidate.y;
        const dSq = dx * dx + dy * dy;

        if (dSq < minDistSq) {
          minDistSq = dSq;
          closest = candidate;
        }
      }
    }
    actor.target = closest;
  }

  isHostile(actor, target) {
    if (!actor || !target || actor === target) return false;
    return actor.faction !== target.faction;
  }
}