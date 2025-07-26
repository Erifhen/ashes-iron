// src/game/utils/gameUtils.js

/**
 * Verifica colisão entre o cone de ataque de um atacante e um alvo.
 * @param {Object} attacker - O personagem atacante.
 * @param {Object} target - O personagem alvo ou dummy.
 * @param {number} range - O alcance do ataque em unidades de grid.
 * @returns {boolean} Verdadeiro se houver colisão, falso caso contrário.
 */
export function checkCollisionCone(attacker, target, range) {
    const distToTarget = Math.sqrt(Math.pow(target.x - attacker.x, 2) + Math.pow(target.y - attacker.y, 2));
    if (distToTarget <= range) {
        const angleToTarget = Math.atan2(target.y - attacker.y, target.x - attacker.x);
        let angleDiff = Math.abs(angleToTarget - attacker.direction);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        if (angleDiff < Math.PI / 4) { // Cone de 90 graus (45 para cada lado)
            return true;
        }
    }
    return false;
}

// Você pode adicionar mais funções utilitárias aqui conforme necessário, por exemplo, para pathfinding, geração de números aleatórios, etc.
