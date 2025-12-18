import { ZoneConfig } from '@/config/zones.js';
import { GameConfig } from '@/config/config.js';

export class Zone {
  constructor(name, system) {
    const data = ZoneConfig[name];
    this.name = name;
    this.mapData = data.mapData;
    this.rows = this.mapData.length;
    // Fix: Safely calculate columns based on first row
    this.cols = this.rows > 0 ? this.mapData[0].length : 0;
    this.tileSize = GameConfig.TILE_SIZE || 32;

    // Spatial Grid initialization
    this.presenceGrid = Array.from({ length: this.rows * this.cols }, () => []);

    // Initial Spawning: Hero is always ID 0
    // spawn(x, y, faction, huntPolicy, controllerType)
    system.spawn(100, 100, 1, 2, 1);

    if (data.enemies) {
      data.enemies.forEach(e => system.spawn(e.x, e.y, 2, 1, 2));
    }
  }

  /**
   * Clears and repopulates the spatial grid with current entity IDs.
   */
  refreshPresenceMap(sys) {
    for (let i = 0; i < this.presenceGrid.length; i++) {
      this.presenceGrid[i].length = 0;
    }

    for (let id = 0; id < sys.activeCount; id++) {
      const c = (sys.x[id] / this.tileSize) | 0;
      const r = (sys.y[id] / this.tileSize) | 0;

      if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
        this.presenceGrid[r * this.cols + c].push(id);
      }
    }
  }

  /**
   * Precise distance-based hostile search using the spatial grid.
   */
  findNearestHostile(id, sys) {
    const px = sys.x[id];
    const py = sys.y[id];
    const range = sys.aggroRange[id];
    const rangeSq = range * range; // PRE-CALCULATED SQUARED RANGE

    const col = (px / this.tileSize) | 0;
    const row = (py / this.tileSize) | 0;
    const cellRadius = Math.ceil(range / this.tileSize);

    let closestId = -1;
    let minDistSq = rangeSq; // COMPARE SQUARED DISTANCES

    for (let r = row - cellRadius; r <= row + cellRadius; r++) {
      if (r < 0 || r >= this.rows) continue;
      const rowOffset = r * this.cols;

      for (let c = col - cellRadius; c <= col + cellRadius; c++) {
        if (c < 0 || c >= this.cols) continue;

        const cell = this.presenceGrid[rowOffset + c];
        for (let i = 0; i < cell.length; i++) {
          const targetId = cell[i];
          if (targetId === id) continue;

          if (!(sys.huntPolicies[id] & sys.factions[targetId])) continue;

          const dx = sys.x[targetId] - px;
          const dy = sys.y[targetId] - py;
          const dSq = dx * dx + dy * dy; // NO SQRT HERE

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
   * Collision check for an area (AABB).
   */
  isAreaWalkable(x, y, w, h) {
    const inset = 4;
    return (
      this.isWalk(x + inset, y + inset) &&
      this.isWalk(x + w - inset, y + inset) &&
      this.isWalk(x + inset, y + h - inset) &&
      this.isWalk(x + w - inset, y + h - inset)
    );
  }

  /**
   * Simple pixel-to-tile walkability check.
   */
  isWalk(px, py) {
    const c = (px / this.tileSize) | 0;
    const r = (py / this.tileSize) | 0;
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.mapData[r][c] !== 0;
  }

  /**
   * Prevents entities from leaving map boundaries.
   */
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