export function flatten2D() {
  const mapData = new Uint8Array(this.rows * this.cols);
  for (let r = 0; r < this.rows; r++) {
    for (let c = 0; c < this.cols; c++) {
      // formula: row * width + col
      this.mapData[r * this.cols + c] = data.mapData[r][c];
    }
  }
}