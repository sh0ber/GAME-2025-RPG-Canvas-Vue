import { Character } from '@/game/Character.js';

export class Enemy extends Character {
  constructor(x, y) {
    super(x, y);
    this.speed = 80;
    this.tileType = 3; 
  }

  update(deltaTime, zone) {
    super.update(deltaTime, zone);
  }
}