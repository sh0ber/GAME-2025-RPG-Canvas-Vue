export class Pathfinder {
  static findPath(startIndex, endIndex, zone) {
    const { cols, rows, mapData } = zone;
    const size = cols * rows;

    const openList = [startIndex];
    const closedSet = new Uint8Array(size);
    const parent = new Int32Array(size).fill(-1);
    const gScore = new Float32Array(size).fill(Infinity);
    const fScore = new Float32Array(size).fill(Infinity);

    gScore[startIndex] = 0;
    fScore[startIndex] = this.heuristic(startIndex, endIndex, cols);

    while (openList.length > 0) {
      // 1. Sort openList for lowest F score (simplest priority queue)
      openList.sort((a, b) => fScore[a] - fScore[b]);
      const current = openList.shift();

      if (current === endIndex) return this.reconstructPath(parent, current);

      closedSet[current] = 1;

      // 2. Check 4 neighbors (North, South, East, West)
      const neighbors = [
        current - cols, current + cols, // N, S
        current - 1, current + 1       // W, E
      ];

      for (const neighbor of neighbors) {
        if (neighbor < 0 || neighbor >= size || closedSet[neighbor] || mapData[neighbor] === 0) continue;

        const tentativeG = gScore[current] + 1;
        if (tentativeG < gScore[neighbor]) {
          parent[neighbor] = current;
          gScore[neighbor] = tentativeG;
          fScore[neighbor] = gScore[neighbor] + this.heuristic(neighbor, endIndex, cols);
          if (!openList.includes(neighbor)) openList.push(neighbor);
        }
      }
    }
    return null; // No path found
  }

  static heuristic(i1, i2, cols) {
    const x1 = i1 % cols, y1 = (i1 / cols) | 0;
    const x2 = i2 % cols, y2 = (i2 / cols) | 0;
    return Math.abs(x1 - x2) + Math.abs(y1 - y2); // Manhattan distance
  }

  static reconstructPath(parent, current) {
    const path = [];
    while (current !== -1) {
      path.push(current);
      current = parent[current];
    }
    return path.reverse();
  }
}