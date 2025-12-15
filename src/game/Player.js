import { Character } from '@/game/Character.js'; 
import { GameConfig } from '@/config/config.js';

export class Player extends Character { 
  /**
   * @param {number} x - Starting world X coordinate.
   * @param {number} y - Starting world Y coordinate.
   * @param {InputManager} inputManager - The engine's input system instance (Dependency Injection).
   */
  constructor(x, y, inputManager) {
    super(x, y); 

    this.speed = 150; 
    this.tileType = 2;

    this.input = inputManager; 
  }

  /**
   * Handles input, movement calculation, and collision checks for the player.
   * @param {number} deltaTime - Time elapsed since the last frame.
   * @param {Zone} zone - The current active zone object (passed by the Engine for collision context).
   */
  update(deltaTime, zone) {
    // Call parent update if any base character logic needed to run first
    super.update(deltaTime, zone); 
    
    let nextX = this.x;
    let nextY = this.y;

    // Calculate potential movement using the injected InputManager
    if (this.input.isKeyDown('ArrowUp') || this.input.isKeyDown('w')) {
      nextY -= this.speed * deltaTime;
    }
    if (this.input.isKeyDown('ArrowDown') || this.input.isKeyDown('s')) {
      nextY += this.speed * deltaTime;
    }
    if (this.input.isKeyDown('ArrowLeft') || this.input.isKeyDown('a')) {
      nextX -= this.speed * deltaTime;
    }
    if (this.input.isKeyDown('ArrowRight') || this.input.isKeyDown('d')) {
      nextX += this.speed * deltaTime;
    }

    // --- COLLISION AND BOUNDARY CHECKING START ---

    // Use the dynamically passed zone data for checks
    const mapCols = zone.cols;
    const mapRows = zone.rows;
    const TILE_SIZE = GameConfig.TILE_SIZE;

    // 1. Clamp against world boundaries (prevents walking off the edge)
    nextX = Math.max(0, Math.min(nextX, mapCols * TILE_SIZE - this.width));
    nextY = Math.max(0, Math.min(nextY, mapRows * TILE_SIZE - this.height));
    
    // 2. Add solid tile collision checks here using zone.isSolid()

    // Update the player's actual position only after all checks pass
    this.x = nextX;
    this.y = nextY;
    
    // --- COLLISION AND BOUNDARY CHECKING END ---
  }
}