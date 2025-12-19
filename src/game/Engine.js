import { GameConfig } from '@/config/config.js';
import { Renderer } from '@/game/Renderer.js';
import { Zone } from '@/game/Zone.js';
import { CameraManager } from '@/game/CameraManager.js';
import { InputManager } from '@/game/InputManager.js';
import { CharacterManager } from '@/game/CharacterManager.js';

class Engine {
  constructor() {
    // State management
    this.isStopped = true;
    this.isPaused = false;
    this.timeScale = 1.0;
    this.frameId = null;
    this.frameCount = 0; // Incremented per frame for staggered AI/ticks
    // Just for readout
    this.fps = 0;
    this.lastFpsUpdate = 0;

    // Core managers
    this.renderer = null;
    this.cameraManager = null;
    this.inputManager = null;
    this.characterManager = null; // Heart of the DoD architecture
    this.currentZone = null;
  }

  /**
   * Main entry point to setup systems and begin the loop.
   */
  async initialize() {
    try {
      this.renderer = new Renderer();
      this.cameraManager = new CameraManager();
      this.inputManager = new InputManager();

      // Pre-allocate memory buffers once for life of the application
      // Not done on the Zone intentionally for speediness and preventing GC
      this.characterManager = new CharacterManager(10001); // Max characters on screen, buffer created now. Includes hero.

      // Initial map load
      await this.loadZone('test');

      this.isStopped = false;
      this.isPaused = false;
      this.start();
    } catch (error) {
      console.error("Critical: Engine failed to initialize", error);
    }
  }

  /**
   * Starts the requestAnimationFrame loop.
   */
  start() {
    let lastTime = performance.now();

    const loop = (currentTime) => {
      if (this.isStopped) return;

      // Calculate deltaTime in seconds, capped to prevent huge jumps
      const elapsed = (currentTime - lastTime) / 1000;
      const dt = this.isPaused ? 0 : Math.min(elapsed, 0.1) * this.timeScale;
      lastTime = currentTime;

      this.frameCount++;
      this.update(dt);
      this.draw();

      this.frameId = requestAnimationFrame(loop);
    };

    this.frameId = requestAnimationFrame(loop);
  }

  /**
   * Hard stop for the engine loop.
   */
  stop() {
    this.isStopped = true;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }

  /**
   * Resets character data (not memory) and loads new zone environment.
   */
  async loadZone(zoneName) {
    // Keep memory buffers but reset the activeCount to 0
    this.characterManager.reset();

    // Zone populates characterManager with new entity data
    this.currentZone = new Zone(zoneName, this.characterManager);

    this.cameraManager.setMapBoundaries(this.currentZone.cols, this.currentZone.rows);
    this.cameraManager.setTargetId(GameConfig.HERO_CHARACTER_ID); // Hero is conventionally ID 0
  }

  /**
   * Core logic phase.
   */
  update(deltaTime) {
    if (this.isPaused || !this.currentZone) return;

    // Calculate rolling FPS every 500ms
    const now = performance.now();
    if (now - this.lastFpsUpdate > 500) {
      this.fps = Math.round(1 / deltaTime);
      this.lastFpsUpdate = now;
    }

    // 1. Sync Spatial: Prepare spatial grid for optimized lookups
    this.currentZone.refreshSpatialGrid(this.characterManager);

    // 2. Resolve Intention: Set vx/vy for all IDs (Player & AI)
    this.characterManager.updateControllers(
      this.inputManager,
      this.currentZone,
      this.frameCount
    );

    // 3. Resolve Physics: Apply vx/vy to x/y with Zone collision
    this.characterManager.updateMovement(deltaTime, this.currentZone);

    // 4. Post-Update: Camera follows character
    this.cameraManager.update(this.characterManager);
  }

  /**
   * Core rendering phase.
   */
  draw() {
    if (!this.currentZone) return;
    // Render static world tiles
    this.renderer.drawBackground(this.cameraManager, this.currentZone);
    // Render dynamic entities from the DoD system
    this.renderer.drawGameplay(this.cameraManager, this.characterManager);

    this.drawDebugInfo();
  }

  drawDebugInfo() {
    const ctx = this.renderer.ctxGp;
    ctx.fillStyle = 'white';
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Use a slight shadow or background box for readability against game tiles
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 4;
    ctx.fillText(`FPS: ${this.fps}`, 10, 10);
    ctx.shadowBlur = 0; // Reset for performance
  }
}

// Export singleton instance
export const engine = new Engine();