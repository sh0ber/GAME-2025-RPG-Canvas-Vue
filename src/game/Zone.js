import { ZoneConfig } from '@/config/zones.js';
import { GameConfig } from '@/config/config.js';
import { flattenMapData } from '@/utils/maps.js';

export class Zone {
  constructor(name, characterManager) {
    const data = ZoneConfig[name]; // Map is 2D here
    const { mapData, rows, cols } = flattenMapData(data.mapData);
    this.mapData = mapData; // Map is 1D stored
    this.name = name;
    this.rows = rows;
    this.cols = cols;
    this.tileSize = GameConfig.TILE_SIZE || 32;

    // Spatial Grid
    this.spatialGrid = Array.from({ length: this.rows * this.cols }, () => []);
    this.neighborBuffer = new Int32Array(characterManager.capacity);
    this.neighborCount = 0;

    // Spawns (unchanged)
    characterManager.spawn(100, 100, 1, 2, 1);
    if (data.enemies) {
      data.enemies.forEach(e => characterManager.spawn(e.x, e.y, 2, 1, 2));
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
   * Identifies up to MAX_NEIGHBORS neighbors nearby using a spatial grid (called by AI steering controller)
   */
  getNeighbors(id, sys, radius = 1) {
    const grid = this.spatialGrid;
    const buffer = this.neighborBuffer;
    const cols = this.cols;
    const rows = this.rows;
    const tileSize = this.tileSize;

    const col = (sys.x[id] / tileSize) | 0;
    const row = (sys.y[id] / tileSize) | 0;

    let count = 0;
    const MAX_NEIGHBORS = 32;

    for (let r = row - radius; r <= row + radius; r++) {
      if (r < 0 || r >= rows) continue;
      const rowOffset = r * cols;

      for (let c = col - radius; c <= col + radius; c++) {
        if (c < 0 || c >= cols) continue;

        const cell = grid[rowOffset + c];
        const cellLen = cell.length; // 2. Cache cell length

        for (let i = 0; i < cellLen; i++) {
          const nid = cell[i];
          if (nid === id) continue;

          buffer[count++] = nid; // 3. Use local buffer reference

          if (count >= MAX_NEIGHBORS) {
            this.neighborCount = count; // Sync back to class before exiting
            return count;
          }
        }
      }
    }
    this.neighborCount = count; // Sync back to class
    return count;
  }

  isPixelWalkable(px, py) {
    const c = (px / this.tileSize) | 0;
    const r = (py / this.tileSize) | 0;
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
    
    return this.mapData[r * this.cols + c] !== 0;
  }

  checkTileCollision(x, y, w, h, vx, vy) {
    const inset = 4;

    if (vx !== 0) {
      // Moving horizontally? Check the leading vertical edge (Left or Right)
      const edgeX = vx > 0 ? x + w - inset : x + inset;
      return this.isPixelWalkable(edgeX, y + inset) &&
        this.isPixelWalkable(edgeX, y + h - inset);
    }

    if (vy !== 0) {
      // Moving vertically? Check the leading horizontal edge (Top or Bottom)
      const edgeY = vy > 0 ? y + h - inset : y + inset;
      return this.isPixelWalkable(x + inset, edgeY) &&
        this.isPixelWalkable(x + w - inset, edgeY);
    }

    return true;
  }

  clamp(id, sys) {
    const x = sys.x[id], y = sys.y[id];
    const maxX = (this.cols * this.tileSize) - sys.width[id];
    const maxY = (this.rows * this.tileSize) - sys.height[id];

    sys.x[id] = x < 0 ? 0 : (x > maxX ? maxX : x);
    sys.y[id] = y < 0 ? 0 : (y > maxY ? maxY : y);
  }
}