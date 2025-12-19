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
    let vx = 0; let vy = 0;
    if (inputManager.isKeyDown('w')) vy -= 1;
    if (inputManager.isKeyDown('s')) vy += 1;
    if (inputManager.isKeyDown('a')) vx -= 1;
    if (inputManager.isKeyDown('d')) vx += 1;

    if (vx === 0 && vy === 0) {
      sys.vx[id] = 0; sys.vy[id] = 0;
      return;
    }

    const len = Math.sqrt(vx * vx + vy * vy);
    const speed = 250;
    sys.vx[id] = (vx / len) * speed;
    sys.vy[id] = (vy / len) * speed;
  },

  [CONTROLLER_TYPES.AI]: (id, sys, { zone, frameCount }) => {
    // 1. INSTANT STOP (Run every frame to prevent orbiting/overshoot)
    let tid = sys.targetId[id];
    if (tid !== -1 && sys.hp[tid] > 0) {
      const dx = sys.x[tid] - sys.x[id];
      const dy = sys.y[tid] - sys.y[id];
      const dSq = dx * dx + dy * dy;

      // If in attack range, stop dead immediately
      if (dSq <= sys.attackRangeSq[id]) {
        sys.vx[id] = 0;
        sys.vy[id] = 0;
        return;
      }
    }

    // 2. STAGGERED UPDATE (Run heavy steering math only every 10 frames)
    if ((frameCount + id) % 10 !== 0) return;

    // Refresh target if none exists
    if (tid === -1 || sys.hp[tid] <= 0) {
      tid = sys.targetId[id] = zone.findNearestHostile(id, sys);
    }
    if (tid === -1) { 
      sys.vx[id] = 0; sys.vy[id] = 0; 
      return; 
    }

    // BASE DIRECTION (Target seeking)
    const dx = sys.x[tid] - sys.x[id];
    const dy = sys.y[tid] - sys.y[id];
    const dist = Math.sqrt(dx * dx + dy * dy);
    const tx = dx / dist;
    const ty = dy / dist;

    // 3. SEPARATION & AVOIDANCE (Fixes V-shape and clumping)
    const neighborCount = zone.getNeighbors(id, sys, 1);
    const personalSpace = 45; 
    const personalSpaceSq = 2025;
    
    let avoidX = 0;
    let avoidY = 0;

    for (let i = 0; i < neighborCount; i++) {
      const nid = zone.neighborBuffer[i];
      if (sys.factions[nid] !== sys.factions[id]) continue;

      const nx = sys.x[id] - sys.x[nid];
      const ny = sys.y[id] - sys.y[nid];
      const dSq = nx * nx + ny * ny;

      if (dSq < personalSpaceSq && dSq > 0) {
        const d = Math.sqrt(dSq);
        const weight = (personalSpace - d) / personalSpace;
        // Accumulate a "push away" force
        avoidX += (nx / d) * weight;
        avoidY += (ny / d) * weight;
      }
    }

    // 4. FINAL INTEGRATION
    // Mix the direct target vector with the avoidance vector
    // This allows monsters to "arc" around others to reach the player
    const speed = 150;
    const finalX = tx + (avoidX * 1.5); 
    const finalY = ty + (avoidY * 1.5);
    
    const mag = Math.sqrt(finalX * finalX + finalY * finalY);
    if (mag > 0.01) {
      sys.vx[id] = (finalX / mag) * speed;
      sys.vy[id] = (finalY / mag) * speed;
    } else {
      sys.vx[id] = tx * speed;
      sys.vy[id] = ty * speed;
    }
  }
};