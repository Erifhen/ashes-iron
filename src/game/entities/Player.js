import { Character } from './Character';
import { PLAYER_SPEED } from '../constants/gameConstants'; // Importa PLAYER_SPEED

export class Player extends Character {
    // CORREÇÃO: Construtor ajustado para corresponder a Character e GameEngine
    constructor(x, y, nickname, classKey, color, addCombatFeedback, id) {
        // Passa speed e maxHealth como constantes ou de um config
        super(x, y, nickname, 100, PLAYER_SPEED, classKey, color, addCombatFeedback, true, id); // Player tem 100 de vida padrão, PLAYER_SPEED
        this.type = 'player';
        this.isCharging = false;
        this.chargeProgress = 0; // 0 a 1
    }

    // CORREÇÃO: O método 'update' foi removido. A lógica de atualização do jogador
    // é agora gerenciada diretamente em GameLogic.js.
}
