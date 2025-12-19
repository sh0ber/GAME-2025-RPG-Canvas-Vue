import { ZoneConfig } from '@/config/zones.js';
import { GameConfig } from '@/config/config.js';
import { AIManager } from '@/game/AIManager.js';
import { Enemy } from '@/game/Enemy.js';

export class Zone {
  constructor(name) {
    const zoneData = ZoneConfig[name];
    this.name = name;
    this.mapData = zoneData.mapData;
    this.rows = zoneData.mapData.length;
    this.cols = this.rows > 0 ? zoneData.mapData[0].length : 0;
    this.tileSize = GameConfig.TILE_SIZE;

    this.spawnPoints = zoneData.spawnPoints;
    this.npcs = [];

    // Optimized Spatial Grid
    this.spatialGrid = [];

    this.aiManager = new AIManager();

    if (zoneData.enemies) {
      zoneData.enemies.forEach(data => this.addEntity(new Enemy(data.x, data.y)));
    }
  }

  addEntity(obj, x, y) {
    obj.x = x ?? obj.x;
    obj.y = y ?? obj.y;
    this.npcs.push(obj);
  }

  spawnEntity(obj, spawnName) {
    const spawnPoint = this.spawnPoints[spawnName] || this.spawnPoints['default'];
    this.addEntity(obj, spawnPoint.x, spawnPoint.y);
  }

  update(deltaTime) {
    this.refreshSpatialGrid(this.npcs);
    // Standard update for cooldowns/logic
    for (let i = 0; i < this.npcs.length; i++) {
      this.npcs[i].update(deltaTime, this);
    }
    this.aiManager.processAI(deltaTime, this);
  }

  checkCollision(entity, nextX, nextY) {
    const inset = 2;
    // Use isPixelWalkable here because nextX/nextY are raw pixel coordinates
    return (
      !this.isPixelWalkable(nextX + inset, nextY + inset) ||
      !this.isPixelWalkable(nextX + entity.width - inset, nextY + inset) ||
      !this.isPixelWalkable(nextX + inset, nextY + entity.height - inset) ||
      !this.isPixelWalkable(nextX + entity.width - inset, nextY + entity.height - inset)
    );
  }

  clamp(entity) {
    const maxX = (this.cols * this.tileSize) - entity.width;
    const maxY = (this.rows * this.tileSize) - entity.height;
    entity.x = Math.max(0, Math.min(entity.x, maxX));
    entity.y = Math.max(0, Math.min(entity.y, maxY));
  }

  refreshSpatialGrid(npcs) {
    const totalCells = this.rows * this.cols;

    if (!this.spatialGrid || this.spatialGrid.length !== totalCells) {
      this.spatialGrid = Array.from({ length: totalCells }, () => []);
    }

    for (let i = 0; i < totalCells; i++) {
      this.spatialGrid[i].length = 0;
    }

    for (let i = 0; i < npcs.length; i++) {
      const obj = npcs[i];
      const col = (obj.x / this.tileSize) | 0;
      const row = (obj.y / this.tileSize) | 0;

      if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
        this.spatialGrid[row * this.cols + col].push(obj);
      }
    }
  }

  getNeighbors(originObj, radius = 1) {
    const col = (originObj.x / this.tileSize) | 0;
    const row = (originObj.y / this.tileSize) | 0;
    const neighbors = [];

    for (let r = row - radius; r <= row + radius; r++) {
      if (r < 0 || r >= this.rows) continue;
      const rowOffset = r * this.cols;
      for (let c = col - radius; c <= col + radius; c++) {
        if (c < 0 || c >= this.cols) continue;

        const cell = this.spatialGrid[rowOffset + c];
        for (let i = 0; i < cell.length; i++) {
          neighbors.push(cell[i]);
        }
      }
    }
    return neighbors;
  }

  getTileType(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return this.mapData[row][col];
  }

  isPixelWalkable(px, py) {
    const col = (px / this.tileSize) | 0;
    const row = (py / this.tileSize) | 0;
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
    return this.isTileWalkable(row, col);
  }

  isTileWalkable(row, col) {
    return this.getTileType(row, col) !== 0;
  }
}