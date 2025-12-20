const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const rows = 21, cols = 21, size = 525 / 21;

let grid = Array(rows).fill().map(() => Array(cols).fill(1));

// 1. GENERATE DUNGEON
function generate() {
    for (let i = 0; i < 6; i++) {
        let w = Math.floor(Math.random() * 3) + 3, h = Math.floor(Math.random() * 3) + 3;
        let r = Math.floor(Math.random() * (rows - h - 1)) + 1, c = Math.floor(Math.random() * (cols - w - 1)) + 1;
        for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) grid[y][x] = 0;
    }
    const walk = (r, c) => {
        grid[r][c] = 0;
        [[0,2],[0,-2],[2,0],[-2,0]].sort(() => Math.random() - 0.5).forEach(([dr, dc]) => {
            let nr = r + dr, nc = c + dc;
            if (nr > 0 && nr < rows-1 && nc > 0 && nc < cols-1 && grid[nr][nc] === 1) {
                grid[r + dr/2][c + dc/2] = 0; walk(nr, nc);
            }
        });
    };
    walk(1, 1);
    grid[19][19] = 0; 
}
generate();

const start = { r: 1, c: 1 }, target = { r: 19, c: 19 };
let path = []; // This will hold the final shortest route

// 2. BFS ALGORITHM (Finds shortest path)
function findShortestPath() {
    let queue = [start];
    let visited = new Set(["1,1"]);
    let parent = {}; // To trace back the path

    while (queue.length > 0) {
        let curr = queue.shift();
        if (curr.r === target.r && curr.c === target.c) {
            // Reconstruct path from target back to start
            let temp = curr;
            while(temp) {
                path.unshift(temp);
                temp = parent[`${temp.r},${temp.c}`];
            }
            return;
        }

        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
            let nr = curr.r + dr, nc = curr.c + dc;
            let key = `${nr},${nc}`;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 0 && !visited.has(key)) {
                visited.add(key);
                parent[key] = curr;
                queue.push({r: nr, c: nc});
            }
        });
    }
}

findShortestPath();

let step = 0;
function draw() {
    ctx.clearRect(0, 0, 525, 525);
    ctx.fillStyle = "#333";
    for(let r=0; r<rows; r++) {
        for(let c=0; c<cols; c++) {
            if(grid[r][c]) ctx.fillRect(c*size, r*size, size, size);
        }
    }

    // Target (Blue)
    ctx.fillStyle = "#00f0ff"; ctx.beginPath();
    ctx.arc(target.c*size+size/2, target.r*size+size/2, size/3, 0, 7); ctx.fill();

    // Player (Red)
    if (step < path.length) {
        let p = path[step];
        ctx.fillStyle = "#ff3333"; ctx.beginPath();
        ctx.arc(p.c*size+size/2, p.r*size+size/2, size/2.5, 0, 7); ctx.fill();
        step++;
        setTimeout(draw, 50);
    } else {
        console.log("Path found!");
    }
}

draw();