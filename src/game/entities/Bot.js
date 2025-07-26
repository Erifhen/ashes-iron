import { Character } from './Character';
import { CLASS_DEFAULT_WEAPONS, BOT_SIZE, BOT_SPEED } from '../constants/gameConstants';
// CORREÇÃO: Removido import de checkCollisionCone, pois a lógica de colisão está em GameLogic

export class Bot extends Character {
    // CORREÇÃO: Construtor do Bot agora recebe addCombatFeedback como último argumento,
    // garantindo que a classKey seja gerada internamente e passada corretamente para Character.
    constructor(x, y, addCombatFeedback) {
        const randomClassKeys = Object.keys(CLASS_DEFAULT_WEAPONS);
        const randomClassKey = randomClassKeys[Math.floor(Math.random() * randomClassKeys.length)];
        const randomColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
        
        // Passa os argumentos corretos para o construtor da classe base (Character)
        super(
            x,
            y,
            `Bot ${Math.floor(Math.random() * 100)}`, // name
            80, // maxHealth (padrão para bot)
            BOT_SPEED, // speed (constante para bot)
            randomClassKey, // classKey
            randomColor, // color
            addCombatFeedback, // addCombatFeedback
            false, // isPlayer = false
            crypto.randomUUID() // id (gera um ID único para o bot)
        );
        this.type = 'bot';
        this.showHUD = true;
        this.target = null; // O alvo atual do bot (pode ser um jogador)
        this.path = []; // Caminho para seguir até o alvo
        this.pathfindingInterval = 1000; // Recalcula caminho a cada segundo
        this.lastPathfindingTime = 0;
    }

    // CORREÇÃO: Os métodos 'update' e 'attack' foram removidos.
    // A lógica de atualização e ataque do bot é agora gerenciada diretamente em GameLogic.js.
}
