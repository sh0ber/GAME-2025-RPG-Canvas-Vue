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
    this.gameObjects = [];
    
    // Optimized Spatial Grid
    this.presenceGrid = []; 

    this.aiManager = new AIManager();

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
    this.refreshPresenceMap(this.gameObjects);
    // Standard update for cooldowns/logic
    for (let i = 0; i < this.gameObjects.length; i++) {
        this.gameObjects[i].update(deltaTime, this);
    }
    this.aiManager.processAI(deltaTime, this);
  }

  refreshPresenceMap(gameObjects) {
    const totalCells = this.rows * this.cols;
    
    if (!this.presenceGrid || this.presenceGrid.length !== totalCells) {
      this.presenceGrid = Array.from({ length: totalCells }, () => []);
    }

    for (let i = 0; i < totalCells; i++) {
      this.presenceGrid[i].length = 0;
    }

    for (let i = 0; i < gameObjects.length; i++) {
      const obj = gameObjects[i];
      const col = (obj.x / this.tileSize) | 0;
      const row = (obj.y / this.tileSize) | 0;
      
      if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
        this.presenceGrid[row * this.cols + col].push(obj);
      }
    }
  }

  getNearby(originObj, radius = 1) {
    const col = (originObj.x / this.tileSize) | 0;
    const row = (originObj.y / this.tileSize) | 0;
    const neighbors = [];

    for (let r = row - radius; r <= row + radius; r++) {
      if (r < 0 || r >= this.rows) continue;
      const rowOffset = r * this.cols;
      for (let c = col - radius; c <= col + radius; c++) {
        if (c < 0 || c >= this.cols) continue;
        
        const cell = this.presenceGrid[rowOffset + c];
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

  isSolid(row, col) {
    return this.getTileType(row, col) === 0;
  }
}