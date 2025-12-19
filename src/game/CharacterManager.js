import { CONTROLLERS } from './controllers.js';

// Pre-allocate memory buffers once in the constructor for life of the application
export class CharacterManager {
  constructor(capacity) {
    this.capacity = capacity;
    this.activeCount = 0;

    // SPATIAL
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.width = new Uint16Array(capacity).fill(32);
    this.height = new Uint16Array(capacity).fill(32);

    // PATHING
    this.pathIndex = new Int32Array(capacity).fill(0);    // Current waypoint index in the path
    this.pathLength = new Int32Array(capacity).fill(0);   // Total waypoints in current path
    this.paths = Array.from({ length: capacity }, () => new Int32Array(256)); // Pre-allocated waypoint buffers
    this.isMovingToTarget = new Uint8Array(capacity);     // 1 if following path, 0 if idle

    // STATS
    this.hp = new Float32Array(capacity);

    // BEHAVIOR
    this.factions = new Uint8Array(capacity);      // 1:Hero, 2:Monster, 4:NPC
    this.huntPolicies = new Uint8Array(capacity);  // Bitmask
    this.controllerType = new Uint8Array(capacity); // 1:Player, 2:AI
    this.aggroRange = new Float32Array(capacity).fill(320);
    this.attackRange = new Float32Array(capacity).fill(30);
    this.attackRangeSq = new Float32Array(capacity).fill(900); // Optimized for quick looping
    this.targetId = new Int32Array(capacity).fill(-1);
  }

  reset() {
    this.activeCount = 0;
    this.targetId.fill(-1);
    this.vx.fill(0);
    this.vy.fill(0);
  }

  spawn(x, y, faction, huntPolicy, controllerType) {
    const id = this.activeCount++;
    this.x[id] = x; this.y[id] = y;
    this.factions[id] = faction;
    this.huntPolicies[id] = huntPolicy;
    this.controllerType[id] = controllerType;
    this.hp[id] = 100;
    return id;
  }

  updateControllers(inputManager, zone, frameCount) {
    const params = { inputManager, zone, frameCount };
    for (let i = 0; i < this.activeCount; i++) {
      const type = this.controllerType[i];
      CONTROLLERS[type](i, this, params);
    }
  }

  updateMovement(dt, zone) {
    for (let i = 0; i < this.activeCount; i++) {
      // Test for valid values
      const vx = this.vx[i];
      const vy = this.vy[i];
      if (vx === 0 && vy === 0) continue;

      // Store variables locally for speed
      const w = this.width[i];
      const h = this.height[i];
      let px = this.x[i];
      let py = this.y[i];

      // Try moving X
      if (vx !== 0) {
        const nextX = px + vx * dt;
        if (zone.canMove(nextX, py, w, h, vx, 0)) {
          px = nextX;
          this.x[i] = px;
        }
      }

      // Try moving Y (using the potentially updated px)
      if (vy !== 0) {
        const nextY = py + vy * dt;
        if (zone.canMove(px, nextY, w, h, 0, vy)) {
          py = nextY;
          this.y[i] = py;
        }
      }

      // Make sure character is within zone bounds
      zone.clamp(i, this);
    }
  }
}