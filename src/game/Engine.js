import { Renderer } from '@/game/Renderer.js';
import { Zone } from '@/game/Zone.js';
import { CameraManager } from '@/game/CameraManager.js';
import { InputManager } from '@/game/InputManager.js';
import { Player } from '@/game/Player.js';

// Singleton
class Engine {
  constructor() {
    this.isPaused = false;
    this.animationId = null;
    this.lastTime = 0;

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
      await this.loadZone('test');

      this.start(); 
    } catch (error) {
      console.error("Failed to initialize game", error);
    }
  }

  async loadZone(zoneName) {
    const zone = new Zone(zoneName);
    zone.spawnEntity(this.player);
    this.currentZone = zone;
    this.cameraManager.setMapBoundaries(zone.cols, zone.rows);
    this.cameraManager.setTarget(this.player);
  }

  start() {
    let last = performance.now();

    const loop = (now) => {
      const elapsed = (now - last) / 1000;
      const rawDt = Math.min(elapsed, 0.1);
      const dt = this.isPaused ? 0 : rawDt * (this.timeScale || 1);
      last = now;

      this.update(dt); // When paused, we still update, but with dt = 0
      this.draw();

      this.frameId = requestAnimationFrame(loop);
    };

    this.frameId = requestAnimationFrame(loop);
  }

  update(deltaTime) {
    this.currentZone.update(deltaTime);
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