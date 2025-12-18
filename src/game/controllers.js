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
    // 1. Every-frame Stop Check (Fast dSq check, no sqrt)
    let tid = sys.targetId[id];
    if (tid !== -1 && sys.hp[tid] > 0) {
      const dx = sys.x[tid] - sys.x[id];
      const dy = sys.y[tid] - sys.y[id];
      const dSq = dx * dx + dy * dy;

      if (dSq <= sys.attackRangeSq[id] || dSq <= 1024) {
        sys.vx[id] = 0;
        sys.vy[id] = 0;
        return; 
      }
    }

    // 2. Throttled Steering Logic
    if ((frameCount + id) % 10 !== 0) return;

    if (tid === -1 || sys.hp[tid] <= 0) {
      tid = sys.targetId[id] = zone.findNearestHostile(id, sys);
    }
    if (tid === -1) { 
      sys.vx[id] = 0; 
      sys.vy[id] = 0; 
      return; 
    }

    const dx = sys.x[tid] - sys.x[id];
    const dy = sys.y[tid] - sys.y[id];
    const dSqTarget = dx * dx + dy * dy;
    const distTarget = Math.sqrt(dSqTarget);
    
    const fx = dx / distTarget; 
    const fy = dy / distTarget; 

    let finalFx = fx;
    let finalFy = fy;

    // 3. Optimized Separation (Check dSq before committing to sqrt)
    const neighbors = zone.getNearby(id, sys, 1);
    const minDist = 28;
    const minDistSq = 784;

    for (let i = 0; i < neighbors.length; i++) {
      const nid = neighbors[i];
      if (nid === id || sys.factions[nid] !== sys.factions[id]) continue;

      const nx = sys.x[id] - sys.x[nid];
      const ny = sys.y[id] - sys.y[nid];
      const nDistSq = nx * nx + ny * ny;

      // Only perform sqrt and normalization if the neighbor is within range
      if (nDistSq < minDistSq && nDistSq > 0) {
        const nD = Math.sqrt(nDistSq);
        const weight = (minDist - nD) / minDist;
        
        const px = (nx / nD) * weight;
        const py = (ny / nD) * weight;
        const dot = px * fx + py * fy;
        
        if (dot < 0) {
          finalFx += (px - dot * fx);
          finalFy += (py - dot * fy);
        } else {
          finalFx += px;
          finalFy += py;
        }
      }
    }

    // 4. Final Velocity Application
    const totalMagSq = finalFx * finalFx + finalFy * finalFy;
    if (totalMagSq > 0.0001) {
      const totalMag = Math.sqrt(totalMagSq);
      const speed = 150;
      sys.vx[id] = (finalFx / totalMag) * speed;
      sys.vy[id] = (finalFy / totalMag) * speed;
    } else {
      sys.vx[id] = 0; 
      sys.vy[id] = 0;
    }
  }
};