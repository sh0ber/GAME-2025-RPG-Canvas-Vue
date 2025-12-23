const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

const CELL_SIZE = 32;
const COLS = Math.floor(canvas.width / CELL_SIZE);
const ROWS = Math.floor(canvas.height / CELL_SIZE);
const NUM_MONSTERS = 1000;
const NUM_TARGETS = 2;
const MONSTER_SPEED = 150;
const TARGET_RADIUS = 12;

let lastTime = performance.now();

// 1. Generate Maze
const maze = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
for (let y=0; y<ROWS; y++)
  for (let x=0; x<COLS; x++)
    if(Math.random()<0.25) maze[y][x]=1;

// 2. Waypoints
const waypoints = [];
const waypointMap = {};
for(let y=0; y<ROWS; y++){
  for(let x=0; x<COLS; x++){
    if(maze[y][x]===1) continue;
    const neighbors = [[0,-1],[0,1],[-1,0],[1,0]].filter(([dy,dx])=>maze[y+dy]?.[x+dx]===0);
    if(neighbors.length!==2 || (neighbors[0][0]!==-neighbors[1][0] && neighbors[0][1]!==-neighbors[1][1])){
      waypointMap[`${y},${x}`] = waypoints.length;
      waypoints.push({ x:x*CELL_SIZE+CELL_SIZE/2, y:y*CELL_SIZE+CELL_SIZE/2, neighbors:[], id:waypoints.length });
    }
  }
}

waypoints.forEach(wp=>{
  const r=Math.floor(wp.y/CELL_SIZE), c=Math.floor(wp.x/CELL_SIZE);
  [[0,-1],[0,1],[-1,0],[1,0]].forEach(([dy,dx])=>{
    let ny=r+dy,nx=c+dx;
    while(ny>=0 && ny<ROWS && nx>=0 && nx<COLS && maze[ny][nx]===0){
      const key=`${ny},${nx}`;
      if(waypointMap[key]!==undefined){ wp.neighbors.push(waypointMap[key]); break; }
      ny+=dy; nx+=dx;
    }
  });
});

// 3. Next-step table BFS
const nextStepTable = Array.from({length:waypoints.length},()=>new Int16Array(waypoints.length).fill(-1));
waypoints.forEach((_,startIdx)=>{
  const visited=new Uint8Array(waypoints.length);
  const queue=[startIdx];
  visited[startIdx]=1;
  while(queue.length){
    const curr=queue.shift();
    waypoints[curr].neighbors.forEach(nb=>{
      if(!visited[nb]){
        visited[nb]=1;
        nextStepTable[nb][startIdx]=curr;
        queue.push(nb);
      }
    });
  }
});

// 4. Tile-based LOS
function canSeeTile(fromWp,toWp){
  let curr=fromWp;
  while(curr!==toWp){
    const next=nextStepTable[curr][toWp];
    if(next===-1||next===curr) return false;
    curr=next;
  }
  return true;
}

// 5. Enhanced getApexPoint (inner-corner before hard turn)
function getApexPoint(wpIdx, targetWpIdx){
  const path=[];
  let curr=wpIdx;
  while(curr!==targetWpIdx){
    const next=nextStepTable[curr][targetWpIdx];
    if(next===-1||next===curr) break;
    path.push(next);
    curr=next;
  }
  if(path.length===0) return {x: waypoints[wpIdx].x, y: waypoints[wpIdx].y};

  let lastDir=null;
  for(let i=0;i<path.length;i++){
    const prev=i===0?waypoints[wpIdx]:waypoints[path[i-1]];
    const wp=waypoints[path[i]];
    let dir={dx: wp.x-prev.x, dy: wp.y-prev.y};
    dir.dx=Math.sign(dir.dx);
    dir.dy=Math.sign(dir.dy);

    if(lastDir && (dir.dx!==lastDir.dx || dir.dy!==lastDir.dy)){
      // Hard turn detected
      let cornerX = wp.x;
      let cornerY = wp.y;
      if(!canSeeTile(wpIdx,path[i-1])){
        cornerX = prev.x + (dir.dx!==0 ? CELL_SIZE/2*dir.dx : 0);
        cornerY = prev.y + (dir.dy!==0 ? CELL_SIZE/2*dir.dy : 0);
      }

      // Clamp to free tile
      const tileX = Math.floor(cornerX/CELL_SIZE);
      const tileY = Math.floor(cornerY/CELL_SIZE);
      if(maze[tileY]?.[tileX]===1){
        // shift back to previous free tile
        return { x: prev.x, y: prev.y };
      }
      return { x: cornerX, y: cornerY };
    }
    lastDir=dir;
  }

  // Path straight and unobstructed
  const lastWp = waypoints[path[path.length-1]];
  const tileX = Math.floor(lastWp.x/CELL_SIZE);
  const tileY = Math.floor(lastWp.y/CELL_SIZE);
  if(maze[tileY]?.[tileX]===1){
    // shift back to previous free tile
    return waypoints[path[path.length-2]] || waypoints[wpIdx];
  }
  return {x:lastWp.x, y:lastWp.y};
}

// 6. Targets
const targets = Array.from({length:NUM_TARGETS},()=>{
  const startWp=Math.floor(Math.random()*waypoints.length);
  return {
    x:waypoints[startWp].x, y:waypoints[startWp].y,
    currentWp:startWp, nextWp:startWp,
    color:`#${Math.floor(Math.random()*0xFFFFFF).toString(16).padStart(6,'0')}`,
    update(){
      const goal = waypoints[this.nextWp];
      const dx=goal.x-this.x, dy=goal.y-this.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<5){
        this.currentWp=this.nextWp;
        const n=waypoints[this.currentWp].neighbors;
        if(n.length) this.nextWp=n[Math.floor(Math.random()*n.length)];
      } else {
        this.x+=dx/dist*1.8; this.y+=dy/dist*1.8;
      }
    }
  };
});

// 7. Monsters
const monsters = Array.from({length:NUM_MONSTERS},()=>{
  const startWp=Math.floor(Math.random()*waypoints.length);
  return {
    x:waypoints[startWp].x, y:waypoints[startWp].y,
    currentWp:startWp,
    target:targets[Math.floor(Math.random()*targets.length)],
    vx:0, vy:0,
    update(dt){
      const myWp=this.currentWp;
      const targetWp=this.target.currentWp;

      // Path to target
      const path=[];
      let curr=myWp;
      while(curr!==targetWp){
        const next=nextStepTable[curr][targetWp];
        if(next===-1||next===curr) break;
        path.push(next);
        curr=next;
      }

      // Apex = inner-corner before hard turn
      const apex=getApexPoint(myWp,targetWp);
      let tx=apex.x, ty=apex.y;

      // Target ring
      const dxToTarget=this.x-this.target.x;
      const dyToTarget=this.y-this.target.y;
      const distToTarget=Math.sqrt(dxToTarget*dxToTarget+dyToTarget*dyToTarget)||1;
      if(distToTarget<TARGET_RADIUS){
        tx=this.target.x+dxToTarget/distToTarget*TARGET_RADIUS;
        ty=this.target.y+dyToTarget/distToTarget*TARGET_RADIUS;
      }

      // Steering
      const dx=tx-this.x, dy=ty-this.y;
      const dist=Math.sqrt(dx*dx+dy*dy)||1;
      const targetVx=(dx/dist)*MONSTER_SPEED;
      const targetVy=(dy/dist)*MONSTER_SPEED;
      const accel=12*dt;
      this.vx+=(targetVx-this.vx)*accel;
      this.vy+=(targetVy-this.vy)*accel;

      // Axis-separated wall sliding
      let nextX=this.x+this.vx*dt;
      let nextY=this.y;
      let tileX=Math.floor(nextX/CELL_SIZE);
      let tileY=Math.floor(nextY/CELL_SIZE);
      if(maze[tileY]?.[tileX]===0) this.x=nextX; else this.vx=0;

      nextX=this.x;
      nextY=this.y+this.vy*dt;
      tileX=Math.floor(nextX/CELL_SIZE);
      tileY=Math.floor(nextY/CELL_SIZE);
      if(maze[tileY]?.[tileX]===0) this.y=nextY; else this.vy=0;

      // Update current waypoint
      const nodeKey=`${Math.floor(this.y/CELL_SIZE)},${Math.floor(this.x/CELL_SIZE)}`;
      if(waypointMap[nodeKey]!==undefined) this.currentWp=waypointMap[nodeKey];
    }
  };
});

// 8. Loop
function loop(now){
  const dt=Math.min((now-lastTime)/1000,0.1);
  lastTime=now;

  ctx.fillStyle='rgba(17,17,17,0.3)';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle='#222';
  for(let y=0;y<ROWS;y++)
    for(let x=0;x<COLS;x++)
      if(maze[y][x]) ctx.fillRect(x*CELL_SIZE,y*CELL_SIZE,CELL_SIZE-1,CELL_SIZE-1);

  targets.forEach(t=>{
    t.update();
    ctx.fillStyle=t.color;
    ctx.fillRect(t.x-8,t.y-8,16,16);
  });

  monsters.forEach(m=>{
    m.update(dt);
    ctx.fillStyle=m.target.color;
    ctx.beginPath();
    ctx.arc(m.x,m.y,4,0,Math.PI*2);
    ctx.fill();
  });

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);