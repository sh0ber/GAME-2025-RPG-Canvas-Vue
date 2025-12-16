export class StatusEffect {
  constructor(name, duration) {
    this.name = name;
    this.duration = duration; // in milliseconds
  }
  onApply(actor) {}
  onTick(actor, deltaTime) { this.duration -= deltaTime; }
  onRemove(actor) {}
}

export class CharmEffect extends StatusEffect {
  constructor(duration) { super('Charm', duration); }
  
  onApply(actor) {
    actor.originalFaction = actor.faction;
    actor.faction = 'player'; // Temporary faction swap
    actor.target = null;      // Reset target to re-evaluate
  }

  onRemove(actor) {
    actor.faction = actor.originalFaction;
    actor.target = null;
  }
}