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
    // 1. INSTANT ATTACK STOP
    let tid = sys.targetId[id];
    if (tid !== -1 && sys.hp[tid] > 0) {
      const dx = sys.x[tid] - sys.x[id];
      const dy = sys.y[tid] - sys.y[id];
      const dSq = dx * dx + dy * dy;
      if (dSq <= sys.attackRangeSq[id]) {
        sys.vx[id] = 0; sys.vy[id] = 0;
        return;
      }
    }

    // 2. STAGGERED LOGIC (Every 10 frames)
    if ((frameCount + id) % 10 !== 0) return;
    if (tid === -1 || sys.hp[tid] <= 0) {
      tid = sys.targetId[id] = zone.findNearestHostile(id, sys);
    }
    if (tid === -1) { sys.vx[id] = 0; sys.vy[id] = 0; return; }

    const dx = sys.x[tid] - sys.x[id];
    const dy = sys.y[tid] - sys.y[id];
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);
    const tx = dx / dist; // Forward X
    const ty = dy / dist; // Forward Y

    // 3. FANNING & AVOIDANCE
    const fanThreshold = sys.attackRange[id] * 3;
    const personalSpace = dist < fanThreshold ? 44 : 8;
    const personalSpaceSq = personalSpace * personalSpace;
    
    const neighborCount = zone.getNeighbors(id, sys, 1);
    let sidePush = 0; // We only care about LEFT or RIGHT push

    // Perpendicular vector (Side direction)
    const sx = -ty; 
    const sy = tx;

    for (let i = 0; i < neighborCount; i++) {
      const nid = zone.neighborBuffer[i];
      if (sys.factions[nid] !== sys.factions[id]) continue;

      const nx = sys.x[id] - sys.x[nid];
      const ny = sys.y[id] - sys.y[nid];
      const nDSq = nx * nx + ny * ny;

      if (nDSq < personalSpaceSq && nDSq > 0) {
        const d = Math.sqrt(nDSq);
        const weight = (personalSpace - d) / personalSpace;
        
        // Calculate if the neighbor is to our LEFT or RIGHT relative to the player
        const dotSide = (nx / d) * sx + (ny / d) * sy;
        sidePush += dotSide * weight;
      }
    }

    // 4. FINAL MOVEMENT
    const speed = 150;
    
    // We construct the move vector by adding a "Side" component to the "Forward" component.
    // Because 'sx/sy' is perfectly perpendicular to the target, adding it 
    // can NEVER make the monster move backwards.
    let moveX = tx + (sx * sidePush * 2.0);
    let moveY = ty + (sy * sidePush * 2.0);

    // Final Normalization
    const mag = Math.sqrt(moveX * moveX + moveY * moveY);
    sys.vx[id] = (moveX / mag) * speed;
    sys.vy[id] = (moveY / mag) * speed;
  }
};