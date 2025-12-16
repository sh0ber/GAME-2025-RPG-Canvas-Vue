import { ZoneConfig } from '@/config/zones.js';
import { GameConfig } from '@/config/config.js';
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
    this.gameObjects = [];
    this.presenceMap = new Map();

    if (zoneData.enemies) {
      zoneData.enemies.forEach(data => this.addEntity(new Enemy(data.x, data.y)));
    }
  }

  addEntity(obj, x, y) {
    obj.x = x ?? obj.x;
    obj.y = y ?? obj.y;
    this.gameObjects.push(obj);
  }

  spawnEntity(obj, spawnName) {
    const spawnPoint = this.spawnPoints[spawnName] || this.spawnPoints['default'];
    this.addEntity(obj, spawnPoint.x, spawnPoint.y);
  }

  update(deltaTime) {
    this.gameObjects.forEach(obj => obj.update(deltaTime, this));
    this.refreshPresenceMap(this.gameObjects);
  }

  // Called once per frame by the Engine to refresh the grid
  refreshPresenceMap(gameObjects) {
    this.presenceMap.clear();
    for (const obj of gameObjects) {
      const col = Math.floor(obj.x / this.tileSize);
      const row = Math.floor(obj.y / this.tileSize);
      const key = `${col}_${row}`;

      if (!this.presenceMap.has(key)) this.presenceMap.set(key, []);
      this.presenceMap.get(key).push(obj);
    }
  }

  // Helper for the AIManager to find neighbors without coordinate math
  getNearby(originObj, radius = 1) { // Add radius parameter
    const col = Math.floor(originObj.x / this.tileSize);
    const row = Math.floor(originObj.y / this.tileSize);
    let neighbors = [];

    for (let i = -radius; i <= radius; i++) { // Use radius here
      for (let j = -radius; j <= radius; j++) {
        const key = `${col + i}_${row + j}`;
        const registry = this.presenceMap.get(key);
        if (registry) neighbors.push(...registry);
      }
    }
    return neighbors.filter(obj => obj !== originObj);
  }

  getTileType(row, col) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return this.mapData[row][col];
  }

  isSolid(row, col) {
    return this.getTileType(row, col) === 0;
  }
}