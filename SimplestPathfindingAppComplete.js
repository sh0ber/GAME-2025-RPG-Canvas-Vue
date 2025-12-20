/**
 * Configuration & Constants
 */
const TS = 32; // Tile Size
const GS = 9;  // Grid Size
const PIXEL_SPEED = 2;
const REPATH_INTERVAL = 10;

const grid = [
  [0, 0, 0, 0, 1, 0, 0, 0, 0], [0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0], [0, 0, 1, 0, 1, 0, 0, 0, 0],
  [0, 0, 1, 0, 1, 0, 0, 0, 0], [0, 0, 1, 0, 1, 0, 0, 0, 0],
  [0, 0, 1, 0, 1, 0, 0, 0, 0], [0, 0, 1, 0, 1, 0, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0, 0, 0]
];

/**
 * Pathfinding Engine (A* + String Pulling)
 */
class Pathfinder {
  static isWall(tx, ty) {
    return grid[ty]?.[tx] === 1;
  }

  static canSee(p1, p2) {
    const steps = 15;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const tx = Math.floor((p1.x + (p2.x - p1.x) * t) / TS);
      const ty = Math.floor((p1.y + (p2.y - p1.y) * t) / TS);
      if (this.isWall(tx, ty)) return false;
    }
    return true;
  }

  static getNextWaypoint(startPx, targetTile) {
    const startTile = { x: Math.floor(startPx.x / TS), y: Math.floor(startPx.y / TS) };
    const open = [{ ...startTile, g: 0, f: 0, p: null }];
    const closed = new Set();

    while (open.length > 0) {
      const cur = open.sort((a, b) => a.f - b.f).shift();
      
      if (cur.x === targetTile.x && cur.y === targetTile.y) {
        let path = [];
        let temp = cur;
        while (temp) {
          path.push({ x: temp.x * TS + TS / 2, y: temp.y * TS + TS / 2 });
          temp = temp.p;
        }
        path.reverse();

        // String Pulling: shortcut to the furthest visible node
        for (let i = path.length - 1; i >= 0; i--) {
          if (this.canSee(startPx, path[i])) return path[i];
        }
        return path[1] || path[0];
      }

      closed.add(`${cur.x},${cur.y}`);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cur.x + dx, ny = cur.y + dy;

          if (nx < 0 || nx >= GS || ny < 0 || ny >= GS || this.isWall(nx, ny) || closed.has(`${nx},${ny}`)) continue;
          // Prevent corner cutting
          if (dx !== 0 && dy !== 0 && (this.isWall(cur.x, ny) || this.isWall(nx, cur.y))) continue;

          const g = cur.g + Math.hypot(dx, dy);
          open.push({ x: nx, y: ny, g, f: g + Math.hypot(targetTile.x - nx, targetTile.y - ny), p: cur });
        }
      }
    }
    return null;
  }
}

/**
 * Player Entity
 */
class Player {
  constructor(x, y) {
    this.pos = { x, y };
    this.waypoint = null;
    this.finished = false;
  }

  update(frameCount, targetTile, targetPx) {
    if (this.finished) return;

    // Repath occasionally or if waypoint is missing
    if (frameCount % REPATH_INTERVAL === 0 || !this.waypoint) {
      this.waypoint = Pathfinder.getNextWaypoint(this.pos, targetTile);
    }

    if (this.waypoint) {
      const dx = this.waypoint.x - this.pos.x;
      const dy = this.waypoint.y - this.pos.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist > 1) {
        this.pos.x += (dx / dist) * PIXEL_SPEED;
        this.pos.y += (dy / dist) * PIXEL_SPEED;
      }
    }

    if (Math.hypot(targetPx.x - this.pos.x, targetPx.y - this.pos.y) < 8) {
      this.finished = true;
    }
  }

  draw(ctx) {
    ctx.fillStyle = this.finished ? "red" : "rgba(255, 0, 0, 0.8)";
    ctx.fillRect(this.pos.x - 6, this.pos.y - 6, 12, 12);
  }
}

/**
 * Main Controller
 */
const canvas = document.getElementById('pf');
const ctx = canvas.getContext('2d');
const players = [];
let frameCount = 0;

// Initialize players
for (let x = 0; x < 4; x++) {
  for (let y = 0; y < GS; y++) {
    players.push(new Player(x * TS + TS / 2, y * TS + TS / 2));
  }
}

function animate(time) {
  frameCount++;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const targetTile = { x: 8, y: Math.round(Math.sin(time * 0.002) * 3 + 4) };
  const targetPx = { x: targetTile.x * TS + TS / 2, y: targetTile.y * TS + TS / 2 };

  // Draw Grid
  grid.forEach((row, y) => row.forEach((val, x) => {
    ctx.fillStyle = val ? "#333" : "#eee";
    ctx.strokeStyle = "#ccc";
    ctx.fillRect(x * TS, y * TS, TS, TS);
    ctx.strokeRect(x * TS, y * TS, TS, TS);
  }));

  // Update & Draw Players
  players.forEach(p => {
    p.update(frameCount, targetTile, targetPx);
    p.draw(ctx);
  });

  // Draw Target
  ctx.fillStyle = "green";
  ctx.fillRect(targetPx.x - 8, targetPx.y - 8, 16, 16);

  requestAnimationFrame(animate);
}

animate(0);