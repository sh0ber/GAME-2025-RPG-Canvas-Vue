import { Renderer } from '@/game/Renderer.js';
import { Zone } from '@/game/Zone.js';
import { CameraManager } from '@/game/CameraManager.js';
import { InputManager } from '@/game/InputManager.js';
import { Hero } from '@/game/Hero.js';

// Singleton
class Engine {
  constructor() {
    this.isStopped = true;
    this.isPaused = false;
    this.timeScale = 1.0;
    this.frameId = null;

    this.renderer = null;
    this.cameraManager = null;
    this.inputManager = null;

    this.currentZone = null;
    this.hero = null;
  }

  async initialize() {
    try {
      this.renderer = new Renderer();
      this.cameraManager = new CameraManager();
      this.inputManager = new InputManager();
      this.hero = new Hero(0, 0, this.inputManager);

      await this.loadZone('test');

      this.isStopped = false; // "The Engine Switch"
      this.isPaused = false;  // "The Gameplay Switch"
      this.start();
    } catch (error) {
      console.error("Failed to initialize game", error);
    }
  }

  start() {
    let last = performance.now();

    const loop = (now) => {
      if (this.isStopped) return;
      const elapsed = (now - last) / 1000;
      const rawDt = Math.min(elapsed, 0.1);
      const dt = this.isPaused ? 0 : rawDt * this.timeScale;
      last = now;

      this.update(dt); // When paused, we still update, but with dt = 0
      this.draw();

      this.frameId = requestAnimationFrame(loop);
    };

    this.frameId = requestAnimationFrame(loop);
  }

  stop() {
    this.isStopped = true; // Prevents the loop from ever calling itself again
    if (this.frameId) {
      cancelAnimationFrame(this.frameId); // Kills the "pending" frame request immediately
      this.frameId = null;
    }
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  async loadZone(zoneName) {
    const zone = new Zone(zoneName);
    zone.spawnEntity(this.hero);
    this.currentZone = zone;
    this.cameraManager.setMapBoundaries(zone.cols, zone.rows);
    this.cameraManager.setTarget(this.hero);
  }

  update(deltaTime) {
    this.currentZone.update(deltaTime);
    this.cameraManager.update();
  }

  draw() {
    this.currentZone.npcs.sort((a, b) => a.bottomY - b.bottomY);
    this.renderer.drawBackground(this.cameraManager, this.currentZone);
    this.renderer.drawCharacters(this.cameraManager, this.currentZone.npcs);
  }
}

// Singleton
export const engine = new Engine();