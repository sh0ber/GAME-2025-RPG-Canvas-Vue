import { GameConfig } from '@/config/config.js';

const TILE_COLORS = {
  0: '#666666', // Wall
  1: '#086741', // Floor
  2: '#FFFF00', // Hero
  3: '#FF0000', // Enemy
  4: '#000099', // NPC
};

export function renderTile(ctx, tileType, x, y) {
  ctx.fillStyle = TILE_COLORS[tileType] || '#FF00FF'; // Magenta for unknown
  ctx.fillRect(x, y, GameConfig.TILE_SIZE, GameConfig.TILE_SIZE);
}

export class Renderer {
  constructor() {
    this.container = document.querySelector('#canvases');
    if (!this.container) throw new Error("Canvas container #canvases not found.");

    this.bgCanvas = this.createAndAppendCanvas('background-canvas', 0);
    this.gameplayCanvas = this.createAndAppendCanvas('gameplay-canvas', 1);

    this.ctxBg = this.bgCanvas.getContext('2d');
    this.ctxGp = this.gameplayCanvas.getContext('2d');

    this.imgBackground = null;
    this.imgGameplay = null;
  }

  createAndAppendCanvas(id, zIndex = 0) {
    const canvas = document.createElement('canvas');
    canvas.id = id;
    canvas.className = 'game-canvas';
    canvas.width = GameConfig.CANVAS_WIDTH;
    canvas.height = GameConfig.CANVAS_HEIGHT;
    canvas.style.zIndex = zIndex;
    this.container.appendChild(canvas);
    return canvas;
  };

  drawBackground(cameraManager, zone) {
    this.ctxBg.clearRect(0, 0, cameraManager.width, cameraManager.height);
    const TILE_SIZE = GameConfig.TILE_SIZE;
    const ctx = this.ctxBg;

    // Get the exact range of tiles within the viewport (including a small buffer)
    const { startCol, endCol, startRow, endRow } = cameraManager.getVisibleGridBoundaries();

    const cameraX = cameraManager.x;
    const cameraY = cameraManager.y;

    // Iterate efficiently over just the visible/near-visible tiles
    for (let row = startRow; row < endRow + 1; row++) {
      for (let col = startCol; col < endCol + 1; col++) {
        const tileType = zone.mapData[row * zone.cols + col]; 
        if (tileType !== null) { // Only draw valid tiles
          // Round screen coordinates to integers to prevent blurry rendering
          const screenX = Math.floor((col * TILE_SIZE) - cameraX);
          const screenY = Math.floor((row * TILE_SIZE) - cameraY);
          renderTile(ctx, tileType, screenX, screenY);
        }
      }
    }
  }

  drawCharacters(cameraManager, system) {
    const ctx = this.ctxGp;
    ctx.clearRect(0, 0, cameraManager.width, cameraManager.height);

    const camX = cameraManager.x;
    const camY = cameraManager.y;
    const camW = cameraManager.width;
    const camH = cameraManager.height;

    // Iterate through all active IDs in the system
    for (let i = 0; i < system.activeCount; i++) {
      const x = system.x[i];
      const y = system.y[i];
      const w = system.width[i];
      const h = system.height[i];

      // Viewport Culling: Only draw if within camera bounds
      if (x + w > camX && x < camX + camW && y + h > camY && y < camY + camH) {
        const screenX = Math.floor(x - camX);
        const screenY = Math.floor(y - camY);

        // Map faction ID back to your TILE_COLORS
        // 1: Hero, 2: Monster, 4: NPC
        const faction = system.factions[i];
        let tileType = 4; // Default NPC
        if (faction === 1) tileType = 2; // Hero
        if (faction === 2) tileType = 3; // Monster

        renderTile(ctx, tileType, screenX, screenY);
      }
    }
  }
}