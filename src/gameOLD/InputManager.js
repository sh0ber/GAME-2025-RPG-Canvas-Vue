export class InputManager {
  constructor() {
    this.keys = {};
    window.addEventListener('keydown', this.onKeydown.bind(this));
    window.addEventListener('keyup', this.onKeyup.bind(this));
  }

  onKeydown(event) {
    this.keys[event.key] = true;
  }

  onKeyup(event) {
    this.keys[event.key] = false;
  }

  isKeyDown(key) {
    return !!this.keys[key];
  }
}