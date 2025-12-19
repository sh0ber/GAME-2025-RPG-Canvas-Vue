export const CONTROLLER_TYPES = {
  NONE: 0,
  PLAYER: 1,
  AI: 2
};

export const CONTROLLERS = {
  [CONTROLLER_TYPES.NONE]: (id, sys) => {
    sys.vx[id] = 0;
    sys.vy[id] = 0;
  },

  [CONTROLLER_TYPES.PLAYER]: (id, sys, { inputManager }) => {
    let vx = 0;
    let vy = 0;

    if (inputManager.isKeyDown('w')) vy -= 1;
    if (inputManager.isKeyDown('s')) vy += 1;
    if (inputManager.isKeyDown('a')) vx -= 1;
    if (inputManager.isKeyDown('d')) vx += 1;

    if (vx === 0 && vy === 0) {
      sys.vx[id] = 0;
      sys.vy[id] = 0;
      return;
    }

    const len = Math.sqrt(vx * vx + vy * vy);
    const speed = 250;
    sys.vx[id] = (vx / len) * speed;
    sys.vy[id] = (vy / len) * speed;
  },

  [CONTROLLER_TYPES.AI]: (id, sys, { zone, frameCount }) => {
    // 1. Attack Range Check
    let tid = sys.targetId[id];
    if (tid !== -1 && sys.hp[tid] > 0) {
      const dx = sys.x[tid] - sys.x[id];
      const dy = sys.y[tid] - sys.y[id];
      const dSq = dx * dx + dy * dy;
      if (dSq <= sys.attackRangeSq[id] || dSq <= 1024) {
        sys.vx[id] = 0; sys.vy[id] = 0;
        return;
      }
    }

    // 2. Throttle
    if ((frameCount + id) % 10 !== 0) return;

    if (tid === -1 || sys.hp[tid] <= 0) {
      tid = sys.targetId[id] = zone.findNearestHostile(id, sys);
    }
    if (tid === -1) { sys.vx[id] = 0; sys.vy[id] = 0; return; }

    const dx = sys.x[tid] - sys.x[id];
    const dy = sys.y[tid] - sys.y[id];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const tx = dx / dist;
    const ty = dy / dist;

    let moveX = tx;
    let moveY = ty;

    // IMPORTANT: Limit is small (e.g. 10), so every neighbor must count!
    const neighborCount = zone.getNeighbors(id, sys, 1);
    const personalSpace = 42; // Increased to compensate for fewer neighbor checks
    const personalSpaceSq = 1764;

    for (let i = 0; i < neighborCount; i++) {
      const nid = zone.neighborBuffer[i];
      if (sys.factions[nid] !== sys.factions[id]) continue;

      const nx = sys.x[id] - sys.x[nid];
      const ny = sys.y[id] - sys.y[nid];
      const distSq = nx * nx + ny * ny;

      if (distSq < personalSpaceSq && distSq > 0) {
        const d = Math.sqrt(distSq);
        const ux = nx / d;
        const uy = ny / d;

        // Check if neighbor is in the forward-facing 180-degree arc
        const dot = ux * tx + uy * ty;

        if (dot < 0) {
          // BLOCKER FOUND: Neighbor is between us and the player
          const side = (id % 2 === 0) ? 1 : -1;

          // Perpendicular vector
          const rx = -ty * side;
          const ry = tx * side;

          const weight = (personalSpace - d) / personalSpace;
          // Increase multiplier to 5.0 because we have fewer neighbors to tell us to turn
          moveX += rx * weight * 5.0;
          moveY += ry * weight * 5.0;
        } else {
          // FOLLOWER/SIDE: Soft nudge to maintain gap
          const weight = (personalSpace - d) / personalSpace;
          moveX += ux * weight * 2.0;
          moveY += uy * weight * 2.0;
        }
      }
    }

    const mag = Math.sqrt(moveX * moveX + moveY * moveY);
    const speed = 150;

    if (mag < 0.01) {
      sys.vx[id] = tx * speed;
      sys.vy[id] = ty * speed;
    } else {
      // We use a slightly more expensive normalization to ensure 
      // that the "Sideways" desire isn't lost when neighbor count is low
      sys.vx[id] = (moveX / mag) * speed;
      sys.vy[id] = (moveY / mag) * speed;
    }
  }
};