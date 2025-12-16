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

      this.loadZone('test2');
      this.isRunning = true;
      this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
    } catch (error) {
      console.error("Failed to initialize game", error);
    }
  }

  loadZone(zoneName) {
    this.currentZone = new Zone(zoneName); 

    // PLAYER Setup
    const startX = 128; 
    const startY = 128;
    this.player.x = startX; // Reset player position
    this.player.y = startY;
    this.currentZone.addEntity(this.player);

    // TEMPORARY:  Enemy setup
    for (let i = 0; i < 7; i++) {
      const enemy = new Enemy(200 + i * 50, 200);
      this.currentZone.addEntity(enemy);
    }  

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

  gameLoop(timestamp) {
    if (!this.isRunning) return;

    let deltaTime = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // >>>>> ADDED FIX: Cap deltaTime to prevent massive jumps <<<<<
    const maxDelta = 0.1; // Cap at 100ms
    if (deltaTime > maxDelta) {
      deltaTime = maxDelta;
    }
    // >>>>> FIX ENDS HERE <<<<<

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