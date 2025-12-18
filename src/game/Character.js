export class Character {
  constructor(system, id) {
    this.system = system;
    this.id = id;
  }
  get x() { return this.system.x[this.id]; }
  get y() { return this.system.y[this.id]; }
  get hp() { return this.system.hp[this.id]; }
}