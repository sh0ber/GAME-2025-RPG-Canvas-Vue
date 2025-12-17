export class StatusEffect {
  constructor(name, duration) {
    this.name = name;
    this.duration = duration; // in milliseconds
  }
  onApply(npc) {}
  onTick(npc, deltaTime) { this.duration -= deltaTime; }
  onRemove(npc) {}
}

export class CharmEffect extends StatusEffect {
  constructor(duration) { super('Charm', duration); }
  
  onApply(npc) {
    npc.originalFaction = npc.faction;
    npc.faction = 'player'; // Temporary faction swap
    npc.target = null;      // Reset target to re-evaluate
  }

  onRemove(npc) {
    npc.faction = npc.originalFaction;
    npc.target = null;
  }
}