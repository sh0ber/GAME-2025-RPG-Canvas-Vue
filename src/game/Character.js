import { GameConfig } from '@/config/config.js';

/**
 * BASE class for all game characters (Player, NPCs, Enemies).
 */
export class Character {
  /**
   * @param {number} x - The starting world X coordinate.
   * @param {number} y - The starting world Y coordinate.
   */
  constructor(x, y) {
    this.x = x; 
    this.y = y; 
    
    // Default dimensions (will be overridden by subclasses)
    this.width = GameConfig.TILE_SIZE;
    this.height = GameConfig.TILE_SIZE;
    this.speed = 100;
    this.tileType = 2;
  }

  update(deltaTime, zone) {

  }

  getSortY() {
    return this.y + this.height;
  }
}