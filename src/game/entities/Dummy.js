// src/game/entities/Dummy.js
export class Dummy {
    constructor(x, y, addCombatFeedback) {
        this.x = x;
        this.y = y;
        this.health = 100; // Dummy has high health, doesn't die
        this.addCombatFeedback = addCombatFeedback; // Callback para o GameEngine adicionar feedback visual
    }
    // Dummy doesn't move or take real damage
    takeDamage(amount, attacker) {
        // Dummy takes visual damage, but doesn't lose health
        this.addCombatFeedback(amount.toFixed(1), this.x, this.y, 'damage');
    }
}