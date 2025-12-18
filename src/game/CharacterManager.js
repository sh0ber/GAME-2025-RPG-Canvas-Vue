import { CONTROLLERS } from './controllers.js';

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

  updateMovement(deltaTime, zone) {
    for (let i = 0; i < this.activeCount; i++) {
      if (this.vx[i] === 0 && this.vy[i] === 0) continue;

      const nextX = this.x[i] + this.vx[i] * deltaTime;
      const nextY = this.y[i] + this.vy[i] * deltaTime;

      // Independent axis check for wall-sliding
      if (zone.isAreaWalkable(nextX, this.y[i], this.width[i], this.height[i])) {
        this.x[i] = nextX;
      }
      if (zone.isAreaWalkable(this.x[i], nextY, this.width[i], this.height[i])) {
        this.y[i] = nextY;
      }
      zone.clamp(i, this);
    }
  }
}