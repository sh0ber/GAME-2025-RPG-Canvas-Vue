export const flattenMapData = (map2D) => {
  const rows = map2D.length;
  const cols = rows > 0 ? map2D[0].length : 0;
  const mapData = new Uint8Array(rows * cols);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      mapData[r * cols + c] = map2D[r][c];
    }
  }
  return { mapData, rows, cols };
};