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
    this.speed = 100;
    this.tileType = 2;

    this.faction = 'player';

    this.input = inputManager;
  }

  update(deltaTime, zone) {
    super.update(deltaTime, zone); 
    
    let dirX = 0;
    let dirY = 0;

    if (this.input.isKeyDown('ArrowUp') || this.input.isKeyDown('w')) dirY -= 1;
    if (this.input.isKeyDown('ArrowDown') || this.input.isKeyDown('s')) dirY += 1;
    if (this.input.isKeyDown('ArrowLeft') || this.input.isKeyDown('a')) dirX -= 1;
    if (this.input.isKeyDown('ArrowRight') || this.input.isKeyDown('d')) dirX += 1;

    this.tryMove(dirX, dirY, deltaTime, zone);
  }
}