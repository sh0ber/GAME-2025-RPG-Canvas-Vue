import { ZoneConfig } from '@/config/zones.js';

export class Zone {
  constructor(name) {
    const zoneData = ZoneConfig[name] || { mapData: [] };
    this.name = name;
    this.mapData = zoneData.mapData;
    this.rows = zoneData.mapData.length;
    this.cols = this.rows > 0 ? zoneData.mapData[0].length : 0;
  }

  isInBounds(row, col, rowMax, colMax) {
    return row >= 0 && row < rowMax && col >= 0 && col < colMax;
  }

  getTileType(row, col) {
    if (!this.isInBounds(row, col, this.rows, this.cols)) return null;
    return this.mapData[row][col];
  }

  // You could add collision logic here later
  isSolid(row, col) {
    const tileType = this.getTileType(row, col);
    return tileType === 0;
  }
}