# AI Coding Instructions for dxmmo

A Vue 3 + Vite 2D MMO game engine using canvas-based rendering with tile-based maps.

## Architecture Overview

**Core Components** (in `src/game/`):
- **Engine**: Singleton orchestrating the game loop. Coordinates all managers and maintains `gameObjects` array for update/draw cycles.
- **Renderer**: Creates two canvas layers (background, gameplay). Handles tile rendering at viewport boundaries with clamped draw ranges.
- **CameraManager**: Follows target (player), constrains camera to map bounds, computes `getVisibleGridBoundaries()` for viewport culling.
- **Zone**: Loads zone tile data from `ZoneConfig`. Provides `isSolid(row, col)` collision checks (tile type 0 = solid).
- **Player**: Extends game object. Updates position based on `InputManager` state; collision checks against map boundaries and solid tiles.
- **InputManager**: Tracks key state with `isKeyDown(key)`. Supports arrow keys and WASD.

**Data Flow**: 
1. `engine.initialize()` → creates managers, loads zone via `Zone` + player spawn
2. Game loop: `update(deltaTime)` → `draw()`
3. Player movement: InputManager → Player.update() → CameraManager follows → Renderer culls visible tiles

## Key Conventions

### Coordinate System
- **World coords**: Tile-based, pixels (0,0 at top-left)
- **Tile data**: 2D array indexed as `mapData[row][col]` where row=Y, col=X
- **Tile values**: 0=solid/wall (blue), 1=floor (green), 99=player (red)

### Configuration Centralization
All constants in `src/config/config.js` (TILE_SIZE=32, CANVAS_WIDTH=1280, CANVAS_HEIGHT=768).
Zone data in `src/config/zones.js` as `ZoneConfig` export with helper `generateMapData(width, height, fillValue, borderValue)`.

### Game Objects
Implement `update(deltaTime)` and `draw(ctx, img, cameraManager)` methods. Engine calls `gameObjects.sort()` by Y before rendering (isometric-style depth sorting via `getSortY()`).

### Clamping & Boundaries
- Camera: clamped to map extents in `CameraManager.update()`
- Player: boundary clamped in `Player.update()` before position commit
- Renderer: tiles clamped in `drawBackground()` to prevent out-of-bounds access

## Development Workflow

```bash
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # Production build
npm run preview  # Preview production build
```

## Critical Integration Points

- **Player-Engine**: Player accesses `engine.currentZone` and `engine.inputManager` for state
- **Canvas Init**: Requires `#canvases` div in HTML; Renderer appends background and gameplay canvases
- **Zone Loading**: `engine.loadZone(zoneName)` resets `gameObjects`, must have entry in `ZoneConfig`
- **Camera Targeting**: `cameraManager.setTarget(player)` in `Engine.loadZone()` after player creation

## Common Tasks

**Add new tile behavior**: Extend collision logic in `Zone.isSolid()` or `Player.update()` collision section.
**Add game object**: Implement update/draw, add to `gameObjects` array in `Engine.loadZone()`.
**New zone**: Add to `ZoneConfig` with `mapData` and image paths, call `engine.loadZone('zoneName')`.
**Adjust movement speed**: Modify `Player.speed` (pixels/sec) or input keys in `Player.update()`.
