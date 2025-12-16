import { Renderer } from '@/game/Renderer.js';
import { Zone } from '@/game/Zone.js';
import { CameraManager } from '@/game/CameraManager.js';
import { InputManager } from '@/game/InputManager.js';
import { AIManager } from '@/game/AIManager.js';
import { Player } from '@/game/Player.js';
import { Enemy } from '@/game/Enemy.js';

// Singleton
class Engine {
  constructor() {
    this.isRunning = false;
    this.animationId = null;
    this.lastTime = 0;

    this.renderer = null;
    this.cameraManager = null;
    this.inputManager = null;
    this.aiManager = null;

    this.currentZone = null;
    this.player = null;
  }

  async initialize() {
    try {
      this.renderer = new Renderer();
      this.cameraManager = new CameraManager();
      this.inputManager = new InputManager();
      this.aiManager = new AIManager();
      this.player = new Player(0, 0, this.inputManager);

      this.loadZone('test');
      this.isRunning = true;
      this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
    } catch (error) {
      console.error("Failed to initialize game", error);
    }
  }

  loadZone(zoneName) {
    const zone = new Zone(zoneName);
    zone.spawnEntity(this.player);
    this.currentZone = zone;
    this.cameraManager.setMapBoundaries(zone.cols, zone.rows);
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

  gameLoop(timestamp) {
    if (!this.isRunning) return;

    // Prevent the first-frame "speed jump"
    if (!this.lastTime) {
      this.lastTime = timestamp;
      requestAnimationFrame(this.gameLoop.bind(this));
      return;
    }

    let deltaTime = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Cap deltaTime to prevent tunneling during lag spikes
    if (deltaTime > 0.1) deltaTime = 0.1;

    this.update(deltaTime);
    this.draw();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  update(deltaTime) {
    this.currentZone.update(deltaTime);
    this.aiManager.processAI(deltaTime, this.currentZone, this.player);
    this.cameraManager.update();
  }

  draw() {
    this.currentZone.gameObjects.sort((a, b) => a.bottomY - b.bottomY);
    this.renderer.drawBackground(this.cameraManager, this.currentZone);
    this.renderer.drawGameplay(this.cameraManager, this.currentZone.gameObjects);
  }
}

// Singleton
export const engine = new Engine();