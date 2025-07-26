// src/game/entities/Character.js (Base para Player, Bot, Dummy)
import { WEAPONS, CLASS_DEFAULT_WEAPONS, CELL_SIZE, PLAYER_SIZE, BOT_SIZE, DUMMY_SIZE, GRID_SIZE, OBSTACLE_SIZE, CLASS_ATTRIBUTES, DASH_DISTANCE, DASH_COOLDOWN, PICKUP_COOLDOWN } from '../constants/gameConstants';

export class Character {
    constructor(x, y, name, classKey, color, addCombatFeedback, isPlayer = false, type = 'character', id = null) {
        this.id = id || crypto.randomUUID();
        this.x = x;
        this.y = y;
        this.name = name;
        this.classKey = classKey; // Store the initial classKey
        this.color = color;
        this.addCombatFeedback = addCombatFeedback || (() => { /* no-op */ });
        this.isPlayer = isPlayer;
        this.type = type;

        const attributes = CLASS_ATTRIBUTES[classKey] || CLASS_ATTRIBUTES['espadachim'];
        this.maxHealth = attributes.maxHealth;
        this.speed = attributes.speed;
        this.health = this.maxHealth;

        this.direction = { x: 0, y: 1 };
        this.weapon = null;
        this.blockBar = 0;
        this.lastAttackTime = 0;
        this.isAttacking = false;
        this.isBlocking = false;
        this.isAlive = true;
        this.arrows = 0;

        this.comboStep = 0;
        this.lastAttackDirection = null;
        this.isCharging = false;
        this.chargeProgress = 0;
        this.isThrowing = false;
        this.throwCharge = 0;
        this.throwChargeDirection = 1;
        this.jumpDashCooldown = 0;
        this.dashDistance = DASH_DISTANCE;
        this.pickupCooldown = 0;
        this.isStunned = 0;

        this.inventory = [];
        this.activeWeaponIndex = 0;

        this.attachedWeapons = [];

        this.setupWeaponsForClass(classKey); // Call with the initial classKey
    }

    setupWeaponsForClass(requestedClassKey) {
        // Use the requestedClassKey for attributes and weapon lookup
        const attributes = CLASS_ATTRIBUTES[requestedClassKey] || CLASS_ATTRIBUTES['espadachim'];
        this.maxHealth = attributes.maxHealth;
        this.speed = attributes.speed;
        if (!this.isAlive) {
            this.health = this.maxHealth;
        }

        let actualClassKey = requestedClassKey;
        let defaultWeaponKeys = CLASS_DEFAULT_WEAPONS[requestedClassKey];

        // If the requested class key is invalid or has no default weapons, fall back to 'espadachim'
        if (!requestedClassKey || typeof requestedClassKey !== 'string' || !defaultWeaponKeys) {
            console.warn(`Character: Invalid or no default weapons found for class "${requestedClassKey}". Using "espadachim" for weapon setup.`);
            actualClassKey = 'espadachim'; // Use 'espadachim' for weapon lookup
            defaultWeaponKeys = CLASS_DEFAULT_WEAPONS['espadachim'];
        }

        // Now, set the character's classKey property to the *actual* class key used for weapons/attributes
        // This ensures that this.classKey always reflects what was successfully applied.
        this.classKey = actualClassKey;

        this.inventory = [...defaultWeaponKeys];
        this.activeWeaponIndex = 0;
        this.updateActiveWeapon();
    }

    updateActiveWeapon() {
        const currentWeaponKey = this.inventory[this.activeWeaponIndex];
        this.weapon = { ...WEAPONS[currentWeaponKey] };
        this.blockBar = this.weapon.blockValue || 0; // Reseta a barra de bloqueio
        this.arrows = (this.weapon.projectile === 'arrow') ? 10 : 0; // Munição inicial para arcos
        // Outros resets de estado relacionados à arma podem ir aqui
        this.comboStep = 0; // Reseta o combo ao trocar de arma
    }

    switchWeapon() {
        this.activeWeaponIndex = (this.activeWeaponIndex + 1) % this.inventory.length;
        this.updateActiveWeapon();
        this.addCombatFeedback(`Arma: ${this.weapon.name}`, this.x, this.y, 'positive');
    }

    dropActiveWeapon() {
        if (this.weapon.name === WEAPONS.bareHands.name) {
            this.addCombatFeedback('Não pode dropar mãos nuas!', this.x, this.y, 'warning');
            return null; // Não dropar nada
        }

        const droppedWeaponKey = this.inventory.splice(this.activeWeaponIndex, 1)[0];
        if (this.inventory.length === 0) {
            this.inventory.push('bareHands'); // Sempre ter mãos nuas como fallback
        }
        this.activeWeaponIndex = this.activeWeaponIndex % this.inventory.length;
        this.updateActiveWeapon();
        return droppedWeaponKey;
    }

    takeDamage(amount, attacker = null, attackDirection = null) {
        if (!this.isAlive) return;

        let finalDamage = amount;
        let feedbackType = 'damage';

        if (this.isBlocking && this.blockBar > 0) {
            let comboBlocked = false;
            if (attacker && attacker.weapon && attacker.weapon.combo && attackDirection !== null) {
                const expectedBlockDirection = this.weapon.combo[this.comboStep];
                // Lógica de bloqueio de combo aqui, se aplicável
            }

            const blockedAmount = Math.min(this.blockBar, amount);
            this.blockBar -= blockedAmount;
            finalDamage -= blockedAmount;
            feedbackType = 'block';
            this.addCombatFeedback(`Bloqueado!`, this.x, this.y, feedbackType);
        }

        if (finalDamage > 0) {
            this.health -= finalDamage;
            this.addCombatFeedback(`-${Math.floor(finalDamage)}`, this.x, this.y, 'damage');
        }

        if (this.health <= 0) {
            this.health = 0;
            this.isAlive = false;
            this.addCombatFeedback(`Morto!`, this.x, this.y, 'death');
            console.log(`${this.name} foi derrotado!`);
        }
    }

    // Novo método para anexar uma arma ao personagem
    attachWeapon(weaponKey) {
        // Adiciona a arma à lista de armas presas
        this.attachedWeapons.push(weaponKey);
        this.addCombatFeedback(`Arma presa!`, this.x, this.y, 'neutral');
        // Você pode adicionar um limite para quantas armas podem ser presas, se desejar.
    }

    // Modificado para lidar com armas presas ao morrer
    respawn(x, y, newClassKey) {
        // Antes de resetar, dropa as armas presas
        const droppedAttachedWeapons = [];
        while (this.attachedWeapons.length > 0) {
            const weaponToDrop = this.attachedWeapons.pop();
            droppedAttachedWeapons.push(weaponToDrop);
        }

        this.x = x;
        this.y = y;
        this.isAlive = true;
        this.isAttacking = false;
        this.isBlocking = false;
        this.lastAttackTime = 0;
        this.isCharging = false;
        this.chargeProgress = 0;
        this.isThrowing = false;
        this.throwCharge = 0;
        this.throwChargeDirection = 1;
        this.jumpDashCooldown = 0;
        this.pickupCooldown = 0;
        this.isStunned = 0;
        this.comboStep = 0;
        this.lastAttackDirection = null;

        this.setupWeaponsForClass(newClassKey);
        console.log(`${this.name} respawnou como ${newClassKey}.`);

        // Retorna as armas que devem ser dropadas para o GameLogic lidar
        return droppedAttachedWeapons;
    }

    move(dx, dy, obstacles, allPlayers) {
        if (!this.isAlive || this.isStunned > 0) return;

        // Usa 'this.type' para determinar o tamanho correto
        const charSize = this.type === 'player' ? PLAYER_SIZE : (this.type === 'bot' ? BOT_SIZE : DUMMY_SIZE);
        const charSizeGrid = charSize / CELL_SIZE;

        const moveAmountX = dx * this.speed;
        const moveAmountY = dy * this.speed;

        const newX = this.x + moveAmountX;
        const newY = this.y + moveAmountY;

        if (!this.checkCollision(newX, this.y, charSizeGrid, obstacles, allPlayers, this)) {
            this.x = newX;
        }
        if (!this.checkCollision(this.x, newY, charSizeGrid, obstacles, allPlayers, this)) {
            this.y = newY;
        }

        if (dx !== 0 || dy !== 0) {
            const angle = Math.atan2(dy, dx);
            this.direction.x = Math.cos(angle);
            this.direction.y = Math.sin(angle);
        }
    }

    checkCollision(targetX, targetY, charSizeGrid, obstacles, allPlayers, self) {
        if (targetX < 0 || targetX + charSizeGrid > GRID_SIZE ||
            targetY < 0 || targetY + charSizeGrid > GRID_SIZE) {
            return true;
        }

        for (const obs of obstacles) {
            if (targetX < obs.x + obs.width &&
                targetX + charSizeGrid > obs.x &&
                targetY < obs.y + obs.height &&
                targetY + charSizeGrid > obs.y) {
                return true;
            }
        }

        for (const [id, otherChar] of allPlayers.entries()) {
            if (otherChar.id === self.id || !otherChar.isAlive) continue;

            // Usa 'otherChar.type' para determinar o tamanho correto do outro personagem
            const otherCharSize = otherChar.type === 'player' ? PLAYER_SIZE : (otherChar.type === 'bot' ? BOT_SIZE : DUMMY_SIZE);
            const otherCharSizeGrid = otherCharSize / CELL_SIZE;

            if (targetX < otherChar.x + otherCharSizeGrid &&
                targetX + charSizeGrid > otherChar.x &&
                targetY < otherChar.y + otherCharSizeGrid &&
                targetY + charSizeGrid > otherChar.y) { // CORRIGIDO: Era charCharSizeGrid
                return true;
            }
        }

        return false;
    }

    takeProjectileHit(damage, owner, projectile) {
        if (!this.isAlive) return;

        this.takeDamage(damage, owner);
        this.addCombatFeedback('Acertou!', this.x, this.y, 'damage');

        // Se o projétil for uma arma arremessável (não flecha), anexa ao personagem
        if (projectile.isThrowableWeapon) {
            this.attachWeapon(projectile.weaponKey);
        }
    }

    startCharging() {
        if (this.weapon.chargeTime) {
            this.isCharging = true;
            this.chargeProgress = 0;
        }
    }

    releaseCharge() {
        this.isCharging = false;
        this.chargeProgress = 0;
    }

    startBlocking() {
        this.isBlocking = true;
    }

    stopBlocking() {
        this.isBlocking = false;
    }

    startThrowing() {
        if (this.weapon.isThrowable && this.weapon.throwRange > 0) {
            this.isThrowing = true;
            this.throwCharge = 0;
            this.throwChargeDirection = 1;
        }
    }

    releaseThrow() {
        this.isThrowing = false;
        this.throwCharge = 0;
        this.throwChargeDirection = 1;
    }

    doDash(targetX, targetY) {
        this.x = targetX;
        this.y = targetY;
        this.jumpDashCooldown = DASH_COOLDOWN;
        this.addCombatFeedback('DASH!', this.x, this.y, 'positive');
    }
}
