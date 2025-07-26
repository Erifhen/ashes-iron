// src/game/entities/Projectile.js
import { PROJECTILE_TRAVEL_TIME, CELL_SIZE, WEAPONS } from '../constants/gameConstants'; // Importa WEAPONS

export class Projectile {
    constructor(x, y, direction, maxDistance, damage, weaponKey, owner, id) {
        this.x = x;
        this.y = y;
        this.direction = direction; // Agora é um ângulo (radianos)
        this.maxDistance = maxDistance;
        this.damage = damage;
        this.weaponKey = weaponKey; // e.g., 'flecha', 'knife', 'sword'
        this.owner = owner; // O personagem que atirou/arremessou (instância completa)
        this.id = id; // ID único para rastreamento (especialmente para flechas presas)

        this.distanceTraveled = 0;
        this.speed = maxDistance / PROJECTILE_TRAVEL_TIME; // Velocidade em unidades de grid por segundo
        this.life = PROJECTILE_TRAVEL_TIME; // Tempo de vida do projétil
        this.size = CELL_SIZE * 0.1; // Tamanho do projétil para colisão (aproximado)

        this.hasHit = false; // Flag para indicar se o projétil atingiu um alvo
        this.isArrow = (weaponKey === 'arrow'); // Flag para identificar flechas (alterado de 'flecha' para 'arrow' para consistência com WEAPONS)
        this.isThrowableWeapon = WEAPONS[weaponKey] && WEAPONS[weaponKey].isThrowable && weaponKey !== 'arrow'; // Flag para identificar armas arremessáveis (não flechas)

        // Referências para GameEngine para colisões (serão passadas no update do GameEngine)
        // Estas propriedades não são usadas diretamente dentro do update do Projectile,
        // mas são preenchidas pelo GameLogic antes de chamar o update do Projectile.
        this.droppedItems = []; 
        this.obstacles = [];
        this.players = []; // Inclui player, dummy, bots
    }

    update(deltaTime) {
        if (this.life <= 0 || this.hasHit) return; // Não atualiza se já atingiu ou expirou

        const moveAmount = this.speed * deltaTime;
        const newX = this.x + Math.cos(this.direction) * moveAmount;
        const newY = this.y + Math.sin(this.direction) * moveAmount;

        this.distanceTraveled += moveAmount;
        this.life -= deltaTime;

        // Verifica colisão com obstáculos
        for (const obs of this.obstacles) {
            const obsCenterX = obs.x + obs.width / 2;
            const obsCenterY = obs.y + obs.height / 2;
            const projectileCenterX = newX + this.size / (2 * CELL_SIZE); // Convertendo tamanho do projétil para unidades de grid
            const projectileCenterY = newY + this.size / (2 * CELL_SIZE);

            // Colisão de AABB (Axis-Aligned Bounding Box) para projétil e obstáculo
            if (projectileCenterX < obs.x + obs.width &&
                projectileCenterX + this.size / CELL_SIZE > obs.x &&
                projectileCenterY < obs.y + obs.height &&
                projectileCenterY + this.size / CELL_SIZE > obs.y) {
                
                this.life = 0; // Projétil é destruído ao atingir obstáculo
                this.hasHit = true; // Considera como "atingido" para não ser recuperado como perdido
                return;
            }
        }

        // Verifica colisão com jogadores/bots/dummy
        for (const target of this.players) {
            // Não atinge o próprio dono
            if (target.id === this.owner.id || !target.isAlive) continue; 
            
            const targetSize = target.isPlayer ? PLAYER_SIZE : BOT_SIZE; // Tamanho em pixels
            const targetSizeGrid = targetSize / CELL_SIZE; // Tamanho em unidades de grid

            const targetCenterX = target.x + targetSizeGrid / 2;
            const targetCenterY = target.y + targetSizeGrid / 2;
            const projectileCenterX = newX + this.size / (2 * CELL_SIZE);
            const projectileCenterY = newY + this.size / (2 * CELL_SIZE);

            const distance = Math.sqrt(
                Math.pow(projectileCenterX - targetCenterX, 2) + 
                Math.pow(projectileCenterY - targetCenterY, 2)
            );
            
            // Colisão baseada na soma dos raios (aproximação circular)
            const collisionThreshold = (targetSize / 2 + this.size / 2) / CELL_SIZE; // Soma dos raios em unidades de grid

            if (distance < collisionThreshold) {
                // Chama o método takeProjectileHit para lidar com o dano
                target.takeProjectileHit(this.damage, this.owner, this);
                
                // Se for uma arma arremessável (não flecha), anexa ao alvo
                if (this.isThrowableWeapon) {
                    target.attachWeapon(this.weaponKey);
                }
                
                this.life = 0; // Projétil é destruído ao atingir um personagem
                this.hasHit = true; // Marca como atingido
                return;
            }
        }

        this.x = newX;
        this.y = newY;
    }
}
