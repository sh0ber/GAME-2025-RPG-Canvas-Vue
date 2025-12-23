const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

let lastTime = performance.now();
const MONSTER_SPEED_SEC = 150;
const CELL_SIZE = 32;
const COLS = Math.floor(canvas.width / CELL_SIZE);
const ROWS = Math.floor(canvas.height / CELL_SIZE);
const NUM_MONSTERS = 1000;
const NUM_TARGETS = 2;
const APEX_SEARCH_LEN = 8;

// 1. GENERATE MAZE
const maze = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (Math.random() < 0.25) maze[y][x] = 1;
  }
}

// 2. WAYPOINTS & NEXT-STEP TABLE
const waypoints = [];
const waypointMap = {};
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (maze[y][x] === 1) continue;
    let n = [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(([dy, dx]) => maze[y + dy]?.[x + dx] === 0);
    if (n.length !== 2 || (n[0][0] !== -n[1][0] && n[0][1] !== -n[1][1])) {
      waypointMap[`${y},${x}`] = waypoints.length;
      waypoints.push({ y: y * CELL_SIZE + CELL_SIZE / 2, x: x * CELL_SIZE + CELL_SIZE / 2, neighbors: [], id: waypoints.length });
    }
  }
}

waypoints.forEach((wp) => {
  const r = Math.floor(wp.y / CELL_SIZE), c = Math.floor(wp.x / CELL_SIZE);
  [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dy, dx]) => {
    let ny = r + dy, nx = c + dx;
    while (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS && maze[ny][nx] === 0) {
      if (waypointMap[`${ny},${nx}`] !== undefined) { wp.neighbors.push(waypointMap[`${ny},${nx}`]); break; }
      ny += dy; nx += dx;
    }
  });
});

// BFS using Uint8Array for visited
const nextStepTable = Array.from({ length: waypoints.length }, () => new Int16Array(waypoints.length).fill(-1));
waypoints.forEach((_, startIdx) => {
  const visited = new Uint8Array(waypoints.length);
  const queue = [startIdx];
  visited[startIdx] = 1;
  while (queue.length) {
    const curr = queue.shift();
    waypoints[curr].neighbors.forEach(nb => {
      if (!visited[nb]) {
        visited[nb] = 1;
        nextStepTable[nb][startIdx] = curr;
        queue.push(nb);
      }
    });
  }
});

// 3. UTILITY: GET APEX
function getApexPoint(wpIdx, finalTargetWpIdx) {
  const wp = waypoints[wpIdx];
  const nextIdx = nextStepTable[wpIdx][finalTargetWpIdx];
  if (nextIdx === -1 || nextIdx === wpIdx) return { x: wp.x, y: wp.y };
  const next = waypoints[nextIdx];
  const offset = CELL_SIZE / 2 - 4;
  return {
    x: wp.x + (next.x > wp.x ? offset : next.x < wp.x ? -offset : 0),
    y: wp.y + (next.y > wp.y ? offset : next.y < wp.y ? -offset : 0)
  };
}

// 4. ENTITIES
// Spatial hash: monsters per tile
const tileHash = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => []));

const targets = Array.from({ length: NUM_TARGETS }, () => {
  const startWp = Math.floor(Math.random() * waypoints.length);
  return {
    x: waypoints[startWp].x, y: waypoints[startWp].y,
    currentWp: startWp, nextWp: startWp,
    color: `#${Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0')}`,
    update() {
      const goal = waypoints[this.nextWp];
      const dx = goal.x - this.x, dy = goal.y - this.y, dist = Math.sqrt(dx*dx+dy*dy);
      if (dist < 5) {
        this.currentWp = this.nextWp;
        const n = waypoints[this.currentWp].neighbors;
        if (n.length) this.nextWp = n[Math.floor(Math.random() * n.length)];
      } else {
        this.x += (dx / dist) * 1.8;
        this.y += (dy / dist) * 1.8;
      }
    }
  };
});

const monsters = Array.from({ length: NUM_MONSTERS }, () => {
  const startWp = Math.floor(Math.random() * waypoints.length);
  const offsetX = Math.random() * CELL_SIZE - CELL_SIZE/2;
  const offsetY = Math.random() * CELL_SIZE - CELL_SIZE/2;
  return {
    x: waypoints[startWp].x + offsetX,
    y: waypoints[startWp].y + offsetY,
    vx: 0, vy: 0,
    currentWp: startWp,
    target: targets[Math.floor(Math.random() * targets.length)],
    update(dt) {
      // Determine apex or direct target
      let tx, ty;
      const targetWp = this.target.currentWp;
      const myWp = this.currentWp;
      const dx = this.target.x - this.x, dy = this.target.y - this.y;
      if (hasLineOfSight(this.x, this.y, this.target.x, this.target.y)) {
        tx = this.target.x; ty = this.target.y;
      } else {
        // Apex search
        const path = [];
        let curr = myWp;
        for (let i = 0; i < APEX_SEARCH_LEN; i++) {
          const next = nextStepTable[curr][targetWp];
          if (next === -1 || next === curr) break;
          path.push(next); curr = next;
        }
        let bestPoint = { x: waypoints[myWp].x, y: waypoints[myWp].y };
        for (let i = path.length-1; i >= 0; i--) {
          const apex = getApexPoint(path[i], targetWp);
          if (hasLineOfSight(this.x, this.y, apex.x, apex.y)) {
            bestPoint = apex; break;
          }
        }
        tx = bestPoint.x; ty = bestPoint.y;
      }

      // Move with original steering formula
      const dist = Math.sqrt((tx-this.x)**2 + (ty-this.y)**2) || 1;
      const targetVx = (tx-this.x)/dist * MONSTER_SPEED_SEC;
      const targetVy = (ty-this.y)/dist * MONSTER_SPEED_SEC;

      // Boid separation (same tile)
      let sepX = 0, sepY = 0;
      const txIdx = Math.floor(this.x/CELL_SIZE), tyIdx = Math.floor(this.y/CELL_SIZE);
      const neighbors = tileHash[tyIdx]?.[txIdx] || [];
      neighbors.forEach(other => {
        if (other === this) return;
        const sdx = this.x - other.x, sdy = this.y - other.y, d2 = sdx*sdx + sdy*sdy;
        if (d2>0 && d2<256) { sepX += sdx/d2; sepY += sdy/d2; }
      });

      this.vx += (targetVx + sepX*400 - this.vx)*12*dt;
      this.vy += (targetVy + sepY*400 - this.vy)*12*dt;
      this.x += this.vx*dt;
      this.y += this.vy*dt;

      const myNode = waypointMap[`${Math.floor(this.y/CELL_SIZE)},${Math.floor(this.x/CELL_SIZE)}`];
      if (myNode !== undefined) this.currentWp = myNode;
    }
  };
});

// 5. LINE-OF-SIGHT FUNCTION (per monster)
function hasLineOfSight(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, dist = Math.sqrt(dx*dx+dy*dy);
  const steps = Math.ceil(dist / 8);
  for (let i=1;i<=steps;i++) {
    const t = i/steps, px = x1+dx*t, py = y1+dy*t;
    for (let [ox,oy] of [[0,0],[2,2],[-2,-2]]) {
      if (maze[Math.floor((py+oy)/CELL_SIZE)]?.[Math.floor((px+ox)/CELL_SIZE)]===1) return false;
    }
  }
  return true;
}

// 6. MAIN LOOP
function loop(now) {
  const dt = Math.min((now-lastTime)/1000, 0.1);
  lastTime = now;

  ctx.fillStyle = 'rgba(17,17,17,0.3)';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = '#222';
  for (let y=0;y<ROWS;y++)
    for (let x=0;x<COLS;x++)
      if (maze[y][x]) ctx.fillRect(x*CELL_SIZE, y*CELL_SIZE, CELL_SIZE-1, CELL_SIZE-1);

  // Clear spatial hash
  for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) tileHash[y][x] = [];

  targets.forEach(t => { t.update(); ctx.fillStyle = t.color; ctx.fillRect(t.x-8, t.y-8, 16,16); });
  monsters.forEach(m => {
    const dtFrame = 0.016; // approx 60fps
    m.update(dtFrame);
    const tx = Math.floor(m.x/CELL_SIZE), ty = Math.floor(m.y/CELL_SIZE);
    if (tileHash[ty] && tileHash[ty][tx]) tileHash[ty][tx].push(m);
    ctx.fillStyle = m.target.color;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 4,0,Math.PI*2); ctx.fill();
  });

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);