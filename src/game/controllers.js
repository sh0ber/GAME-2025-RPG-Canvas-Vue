export const CONTROLLERS = {
  // 0: NONE / IDLE
  0: (id, sys) => {
    sys.vx[id] = 0;
    sys.vy[id] = 0;
  },

  // 1: LOCAL PLAYER (Keyboard)
  1: (id, sys, { inputManager }) => {
    let vx = 0; let vy = 0;
    if (inputManager.isKeyDown('w')) vy -= 1;
    if (inputManager.isKeyDown('s')) vy += 1;
    if (inputManager.isKeyDown('a')) vx -= 1;
    if (inputManager.isKeyDown('d')) vx += 1;

    if (vx === 0 && vy === 0) {
      sys.vx[id] = 0; sys.vy[id] = 0;
      return;
    }

    // In-place normalization (Zero object allocation)
    const speed = 250;
    const len = Math.sqrt(vx * vx + vy * vy);
    sys.vx[id] = (vx / len) * speed;
    sys.vy[id] = (vy / len) * speed;
  },

  // 2: STANDARD AI (Staggered)
  2: (id, sys, { zone, frameCount }) => {
    // Only "think" every 10 frames
    if ((frameCount + id) % 10 !== 0) return;

    if (sys.targetId[id] === -1) {
      sys.targetId[id] = zone.findNearestHostile(id, sys);
    } else {
      const tx = sys.x[sys.targetId[id]];
      const ty = sys.y[sys.targetId[id]];
      const dx = tx - sys.x[id];
      const dy = ty - sys.y[id];
      
      // Use squared distance for the comparison (optimization)
      const distSq = dx * dx + dy * dy;

      if (distSq > 900) { // 900 is 30px squared
        // In-place normalization (Zero object allocation)
        const len = Math.sqrt(distSq);
        const speed = 150;
        sys.vx[id] = (dx / len) * speed;
        sys.vy[id] = (dy / len) * speed;
      } else {
        sys.vx[id] = 0; sys.vy[id] = 0;
      }
    }
  }
};