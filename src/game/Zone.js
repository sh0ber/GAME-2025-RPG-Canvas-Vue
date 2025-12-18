import { ZoneConfig } from '@/config/zones.js';
import { GameConfig } from '@/config/config.js';

export class Zone {
  constructor(name, system) {
    const data = ZoneConfig[name];
    this.name = name;
    this.mapData = data.mapData;
    this.rows = this.mapData.length;
    this.cols = this.rows > 0 ? this.mapData[0].length : 0;
    this.tileSize = GameConfig.TILE_SIZE || 32;

    this.spatialGrid = Array.from({ length: this.rows * this.cols }, () => []);

    // 2025 OPTIMIZATION: Pre-allocate a shared buffer. 
    // This stops the engine from creating thousands of empty arrays [] every second.
    this.neighborBuffer = new Int32Array(system.capacity);
    this.neighborCount = 0;

    system.spawn(100, 100, 1, 2, 1);
    if (data.enemies) {
      data.enemies.forEach(e => system.spawn(e.x, e.y, 2, 1, 2));
    }
  }

  refreshSpatialGrid(sys) {
    // length = 0 is the fastest clear; it keeps the memory allocated for reuse.
    for (let i = 0; i < this.spatialGrid.length; i++) {
      this.spatialGrid[i].length = 0;
    }

    for (let id = 0; id < sys.activeCount; id++) {
      const c = (sys.x[id] / this.tileSize) | 0;
      const r = (sys.y[id] / this.tileSize) | 0;

      if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
        this.spatialGrid[r * this.cols + c].push(id);
      }
    }
  }

  findNearestHostile(id, sys) {
    const px = sys.x[id];
    const py = sys.y[id];
    const range = sys.aggroRange[id];
    const rangeSq = range * range;

    const col = (px / this.tileSize) | 0;
    const row = (py / this.tileSize) | 0;
    const cellRadius = Math.ceil(range / this.tileSize);

    let closestId = -1;
    let minDistSq = rangeSq;

    for (let r = row - cellRadius; r <= row + cellRadius; r++) {
      if (r < 0 || r >= this.rows) continue;
      const rowOffset = r * this.cols;
      for (let c = col - cellRadius; c <= col + cellRadius; c++) {
        if (c < 0 || c >= this.cols) continue;

        const cell = this.spatialGrid[rowOffset + c];
        for (let i = 0; i < cell.length; i++) {
          const targetId = cell[i];
          if (targetId === id) continue;
          if (!(sys.huntPolicies[id] & sys.factions[targetId])) continue;

          const dx = sys.x[targetId] - px;
          const dy = sys.y[targetId] - py;
          const dSq = dx * dx + dy * dy;

          if (dSq < minDistSq) {
            minDistSq = dSq;
            closestId = targetId;
          }
        }
      }
    }
    return closestId;
  }

  /**
   * Optimized getNearby: Returns count and populates neighborBuffer.
   * This version ensures neighbors are seen before they overlap.
   */
  getNearby(id, sys, radius = 1) {
    const col = (sys.x[id] / this.tileSize) | 0;
    const row = (sys.y[id] / this.tileSize) | 0;
    
    this.neighborCount = 0;

    for (let r = row - radius; r <= row + radius; r++) {
      if (r < 0 || r >= this.rows) continue;
      const rowOffset = r * this.cols;
      for (let c = col - radius; c <= col + radius; c++) {
        if (c < 0 || c >= this.cols) continue;

        const cell = this.spatialGrid[rowOffset + c];
        for (let i = 0; i < cell.length; i++) {
          const nid = cell[i];
          if (nid === id) continue;

          this.neighborBuffer[this.neighborCount++] = nid;
          // Safety break to prevent exceeding the buffer size
          if (this.neighborCount >= this.neighborBuffer.length) return this.neighborCount;
        }
      }
    }
    return this.neighborCount;
  }

  isWalk(px, py) {
    const c = (px / this.tileSize) | 0;
    const r = (py / this.tileSize) | 0;
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.mapData[r][c] !== 0;
  }

  isAreaWalkable(x, y, w, h) {
    const inset = 4;
    return (
      this.isWalk(x + inset, y + inset) &&
      this.isWalk(x + w - inset, y + inset) &&
      this.isWalk(x + inset, y + h - inset) &&
      this.isWalk(x + w - inset, y + h - inset)
    );
  }

  clamp(id, sys) {
    const maxX = (this.cols * this.tileSize) - sys.width[id];
    const maxY = (this.rows * this.tileSize) - sys.height[id];
    sys.x[id] = Math.max(0, Math.min(sys.x[id], maxX));
    sys.y[id] = Math.max(0, Math.min(sys.y[id], maxY));
  }

  getTileType(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return this.mapData[row][col];
  }
}