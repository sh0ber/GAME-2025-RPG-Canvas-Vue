const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

const CELL_SIZE = 32;
const COLS = Math.floor(canvas.width / CELL_SIZE);
const ROWS = Math.floor(canvas.height / CELL_SIZE);
const NUM_MONSTERS = 1000;
const NUM_TARGETS = 5;
const MONSTER_SPEED = 2.5;

// 1. GENERATE MAZE
const maze = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (Math.random() < 0.25) maze[y][x] = 1;
  }
}

// 2. EXTRACT WAYPOINTS (Intersections and Corners)
const waypoints = [];
const waypointMap = {};
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (maze[y][x] === 1) continue;
    let n = [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(([dy, dx]) => maze[y + dy]?.[x + dx] === 0);
    // Is it a junction or dead end?
    if (n.length !== 2 || (n[0][0] !== -n[1][0] && n[0][1] !== -n[1][1])) {
      waypointMap[`${y},${x}`] = waypoints.length;
      waypoints.push({ y: y * CELL_SIZE + CELL_SIZE / 2, x: x * CELL_SIZE + CELL_SIZE / 2, neighbors: [], id: waypoints.length });
    }
  }
}

// Connect Waypoints (Linear scan for line-of-sight connections)
waypoints.forEach((wp, i) => {
  const r = Math.floor(wp.y / CELL_SIZE);
  const c = Math.floor(wp.x / CELL_SIZE);
  [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dy, dx]) => {
    let ny = r + dy, nx = c + dx;
    while (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS && maze[ny][nx] === 0) {
      if (waypointMap[`${ny},${nx}`] !== undefined) {
        wp.neighbors.push(waypointMap[`${ny},${nx}`]);
        break;
      }
      ny += dy; nx += dx;
    }
  });
});

// 3. PRECOMPUTE ALL-PAIRS NEXT-STEP TABLE
const nextStepTable = Array.from({ length: waypoints.length }, () => new Int16Array(waypoints.length).fill(-1));
waypoints.forEach((_, startIdx) => {
  const queue = [startIdx];
  const visited = new Set([startIdx]);
  while (queue.length > 0) {
    const curr = queue.shift();
    waypoints[curr].neighbors.forEach(nb => {
      if (!visited.has(nb)) {
        visited.add(nb);
        nextStepTable[nb][startIdx] = curr;
        queue.push(nb);
      }
    });
  }
});

function getPath(startWp, endWp) {
  const path = [startWp];
  let curr = startWp;
  // Limit to 10 steps to keep it fast
  for (let i = 0; i < 10; i++) {
    let next = nextStepTable[curr][endWp];
    if (next === -1 || next === curr) break;
    path.push(next);
    curr = next;
  }
  return path;
}

function hasLineOfSight(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(dist / 8);

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const px = x1 + dx * t;
    const py = y1 + dy * t;

    // Check center and slightly to the sides for "body thickness"
    const points = [[0, 0], [2, 2], [-2, -2]];
    for (let [ox, oy] of points) {
      const gx = Math.floor((px + ox) / CELL_SIZE);
      const gy = Math.floor((py + oy) / CELL_SIZE);
      if (maze[gy]?.[gx] === 1) return false;
    }
  }
  return true;
}

// 4. ENTITIES
const targets = Array.from({ length: NUM_TARGETS }, () => {
  const startWp = Math.floor(Math.random() * waypoints.length);
  return {
    x: waypoints[startWp].x,
    y: waypoints[startWp].y,
    currentWp: startWp,
    nextWp: startWp,
    color: `#${Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '4')}`,
    update() {
      const goal = waypoints[this.nextWp];
      const dx = goal.x - this.x;
      const dy = goal.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        this.currentWp = this.nextWp;
        const n = waypoints[this.currentWp].neighbors;
        if (n.length) this.nextWp = n[Math.floor(Math.random() * n.length)];
      } else {
        // Move targets slightly slower (2.0) so monsters (2.5) can actually catch them
        this.x += (dx / dist) * 2.0;
        this.y += (dy / dist) * 2.0;
      }
    }
  };
});

const monsters = Array.from({ length: NUM_MONSTERS }, () => {
  const startWp = Math.floor(Math.random() * waypoints.length);
  const target = targets[Math.floor(Math.random() * targets.length)];
  return {
    x: waypoints[startWp].x,
    y: waypoints[startWp].y,
    currentWp: startWp,
    target,
    color: target.color,
    finished: false,
    update() {
      if (this.finished) return;

      // 1. Direct line of sight to target (No waypoints needed)
      if (hasLineOfSight(this.x, this.y, this.target.x, this.target.y)) {
        const dx = this.target.x - this.x, dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) { this.finished = true; return; }
        this.x += (dx / dist) * MONSTER_SPEED;
        this.y += (dy / dist) * MONSTER_SPEED;

        // While moving, constantly update currentWp to the closest node 
        // so we have a valid starting point if we lose LoS.
        this.currentWp = waypointMap[`${Math.floor(this.y / CELL_SIZE)},${Math.floor(this.x / CELL_SIZE)}`] || this.currentWp;
        return;
      }

      // 2. Get the path sequence from the table
      const path = getPath(this.currentWp, this.target.currentWp);

      // 3. Coordinate-based "Short-Circuit"
      // Look at the path and find the furthest waypoint you can see from your CURRENT X/Y
      let bestWpIdx = -1;
      for (let i = path.length - 1; i >= 0; i--) {
        const wp = waypoints[path[i]];
        if (hasLineOfSight(this.x, this.y, wp.x, wp.y)) {
          bestWpIdx = path[i];
          break;
        }
      }

      // 4. Move toward the visible coordinate, NOT the currentWp
      const finalGoalIdx = bestWpIdx !== -1 ? bestWpIdx : nextStepTable[this.currentWp][this.target.currentWp];

      if (finalGoalIdx !== -1) {
        const goal = waypoints[finalGoalIdx];
        const dx = goal.x - this.x;
        const dy = goal.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Apply movement
        this.x += (dx / dist) * MONSTER_SPEED;
        this.y += (dy / dist) * MONSTER_SPEED;

        // Update currentWp to whatever node we are physically passing
        const myNode = waypointMap[`${Math.floor(this.y / CELL_SIZE)},${Math.floor(this.x / CELL_SIZE)}`];
        if (myNode !== undefined) this.currentWp = myNode;
      }
    }
  };
});

// 5. RENDER
function loop() {
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw Walls
  ctx.fillStyle = '#222';
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++)
    if (maze[y][x]) ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);

  // Update & Draw Targets
  targets.forEach(t => {
    t.update();
    ctx.fillStyle = t.color;
    ctx.fillRect(t.x - 8, t.y - 8, 16, 16);
  });

  // Update & Draw Monsters
  monsters.filter(m => !m.finished).forEach(m => {
    m.update();
    ctx.beginPath();
    ctx.arc(m.x, m.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = m.color;
    ctx.fill();
  });

  requestAnimationFrame(loop);
}
loop();