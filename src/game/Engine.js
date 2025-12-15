import { Renderer } from '@/game/Renderer.js';
import { Zone } from '@/game/Zone.js';
import { CameraManager } from '@/game/CameraManager.js';
import { InputManager } from '@/game/InputManager.js';
import { Player } from '@/game/Player.js';

// Singleton
class Engine {
  constructor() {
    this.isRunning = false;
    this.animationId = null;
    this.lastTime = 0;

    this.gameObjects = [];

    this.renderer = null;
    this.cameraManager = null;
    this.inputManager = null;
    this.currentZone = null;
    this.player = null;
  }

  async initialize() {
    try {
      this.renderer = new Renderer();
      this.cameraManager = new CameraManager();
      this.inputManager = new InputManager();
      this.player = new Player(0, 0, this.inputManager);

      this.loadZone('test2');
      this.isRunning = true;
      this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
    } catch (error) {
      console.error("Failed to initialize game", error);
    }
  }

  loadZone(zoneName) {
    this.currentZone = new Zone(zoneName);

    // TEMPORARY:  Player setup
    const startX = 128; 
    const startY = 128;
    this.player.x = startX; // Reset player position
    this.player.y = startY;

    this.gameObjects = []; 
    this.gameObjects.push(this.player);
    // TODO:  Load rest of zone objects...

    this.cameraManager.setMapBoundaries(this.currentZone.cols, this.currentZone.rows);
    this.cameraManager.setTarget(this.player);
  }

  gameLoop(timestamp) {
    if (!this.isRunning) return;
    const deltaTime = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    this.update(deltaTime);
    this.draw();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  update(deltaTime) {
    this.gameObjects.forEach(obj => obj.update(deltaTime, this.currentZone));
    this.cameraManager.update();
  }

  draw() {
    this.gameObjects.sort((a, b) => a.getSortY() - b.getSortY());
    this.renderer.drawBackground(this.cameraManager, this.currentZone); 
    this.renderer.drawGameplay(this.cameraManager, this.gameObjects);
  }
}

// Singleton
export const engine = new Engine();