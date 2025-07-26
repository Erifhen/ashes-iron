// src/game/constants/gameConstants.js

export const GRID_SIZE = 20; // 20x20 Grid
export const CELL_SIZE = 80; // Pixels per grid cell (720 / 9 = 80)
export const PLAYER_SIZE = CELL_SIZE * 0.8; // Visual player size
export const DUMMY_SIZE = CELL_SIZE * 0.8; // Visual dummy size
export const BOT_SIZE = CELL_SIZE * 0.8; // Visual bot size
export const OBSTACLE_SIZE = CELL_SIZE; // Visual obstacle size

// Weapon definitions (internal keys are in English, 'name' property for display)
export const WEAPONS = {
    'bareHands': { name: 'Mãos Nuas', range: 1.5, attackCD: 1, damage: 0.5, blockValue: 5, blockCost: 2, combo: ['direta', 'esquerda', 'uppercut'], hands: 'Uma mão', throwRange: 0, isThrowable: false, projectile: null, attackSpeed: 1 },
    'sword': { name: 'Espada', range: 2.7, attackCD: 1.2, damage: 1, blockValue: 4, blockCost: 1.5, combo: ['diagonal', 'horizontal', 'estocada', 'horizontal', 'vertical'], hands: 'Duas mãos', throwRange: 6, isThrowable: true, projectile: 'sword_projectile', attackSpeed: 1 },
    'shield': { name: 'Escudo', range: 2, attackCD: 1.5, damage: 0.7, blockValue: 6, blockCost: 1.5, combo: ['estocada', 'horizontal'], hands: 'Uma mão', throwRange: 7, isThrowable: true, projectile: 'shield_projectile', attackSpeed: 1 },
    'lance': { name: 'Lança', range: 3, attackCD: 1, damage: 0.8, blockValue: 4, blockCost: 1.5, combo: ['estocada', 'diagonal', 'horizontal'], hands: 'Uma mão', throwRange: 8, isThrowable: true, projectile: 'lance_projectile', attackSpeed: 1 },
    'dagger': { name: 'Adaga', range: 2, attackCD: 0.7, damage: 1, blockValue: 5, blockCost: 1.5, combo: ['horizontal', 'estocada', 'horizontal', 'diagonal'], hands: 'Uma mão', throwRange: 7.5, isThrowable: true, projectile: 'dagger_projectile', attackSpeed: 1 },
    'bowAndArrow': { name: 'Arco e Flecha', range: 1.5, attackCD: 2, damage: 1, blockValue: 5, blockCost: 2, combo: ['vertical', 'horizontal'], hands: 'Duas mãos', throwRange: 18, isThrowable: false, projectile: 'arrow', attackSpeed: 1, chargeTime: 1.0 }, // Ranged mode, throwRange é a distância máxima da flecha
    'knife': { name: 'Faca', range: 1.6, attackCD: 1.1, damage: 0.8, blockValue: 4, blockCost: 1.2, combo: ['estocada', 'horizontal', 'vertical'], hands: 'Uma mão', throwRange: 7.5, isThrowable: true, projectile: 'knife_projectile', attackSpeed: 1 }
};

// Mapeamento de classes para suas armas padrão (usando chaves em inglês para consistência com WEAPONS)
export const CLASS_DEFAULT_WEAPONS = {
    'espadachim': ['sword', 'knife'], // Espadachim
    'hoplita': ['lance', 'shield'], // Hoplita
    'emboscador': ['dagger', 'dagger'], // Emboscador
    'cacador': ['bowAndArrow', 'knife'] // Caçador
};

// ATRIBUTOS DE CADA CLASSE (Vida Máxima e Velocidade)
export const CLASS_ATTRIBUTES = {
    'espadachim': { maxHealth: 4, speed: 3 },
    'hoplita': { maxHealth: 5, speed: 2 },
    'emboscador': { maxHealth: 3, speed: 3.5 },
    'cacador': { maxHealth: 2, speed: 3 }
};


// Projectile speed factors and travel time
export const PROJECTILE_TRAVEL_TIME = 0.5; // Tempo fixo para projéteis atingirem a distância máxima (em segundos)

export const PLAYER_SPEED = 5; // Será sobrescrito pelos atributos da classe
export const BOT_SPEED = 5; // Será sobrescrito pelos atributos da classe

// Pontos de spawn para jogadores multiplayer
export const SPAWN_POINTS = [
    { x: 2, y: 2 },
    { x: 18, y: 18 },
    { x: 2, y: 18 },
    { x: 18, y: 2 },
    { x: 10, y: 5 },
    { x: 5, y: 10 },
    { x: 15, y: 10 },
    { x: 10, y: 15 },
    // Adicione mais pontos se você espera mais jogadores na mesma sala
];

// Outras constantes de jogo
export const PICKUP_RANGE = 1.5; // Distância máxima para pegar itens
export const ATTACK_VISUAL_DURATION = 0.2; // Duração da visualização de ataque em segundos
export const COMBAT_FEEDBACK_LIFETIME = 1.0; // Duração do feedback de combate na tela
export const DASH_DISTANCE = 3; // Distância do dash em unidades de grid
export const DASH_COOLDOWN = 2; // Cooldown do dash em segundos
export const PICKUP_COOLDOWN = 0.5; // Cooldown para pegar itens em segundos
