// src/game/GameLogic.js
import { Player } from './entities/Player';
import { Bot } from './entities/Bot';
import { Projectile } from './entities/Projectile';
import { DroppedItem } from './entities/DroppedItem';
import { CELL_SIZE, PLAYER_SIZE, DUMMY_SIZE, BOT_SIZE, PROJECTILE_TRAVEL_TIME, SPAWN_POINTS, WEAPONS, DASH_DISTANCE, DASH_COOLDOWN, PICKUP_COOLDOWN, PICKUP_RANGE, CLASS_DEFAULT_WEAPONS } from './constants/gameConstants';

export class GameLogic {
    // Adicionado forceCombatFeedbackRender e forceDroppedItemsRender no construtor
    constructor(localPlayerRef, allPlayersRef, dummyRef, botsRef, droppedItemsRef, projectilesRef, attackVisualsRef, combatFeedbacksRef, updateThrowingBar, gameSync, obstaclesRef, keysRef, mouseRef, clickTargetRef, forceCombatFeedbackRender, forceDroppedItemsRender) {
        this.localPlayerRef = localPlayerRef;
        this.allPlayersRef = allPlayersRef;
        this.dummyRef = dummyRef;
        this.botsRef = botsRef;
        this.droppedItemsRef = droppedItemsRef;
        this.projectilesRef = projectilesRef;
        this.attackVisualsRef = attackVisualsRef;
        this.combatFeedbacksRef = combatFeedbacksRef;
        this.updateThrowingBar = updateThrowingBar;
        this.gameSync = gameSync;
        this.obstaclesRef = obstaclesRef;
        this.keysRef = keysRef;
        this.mouseRef = mouseRef;
        this.clickTargetRef = clickTargetRef;
        this.forceCombatFeedbackRender = forceCombatFeedbackRender;
        this.forceDroppedItemsRender = forceDroppedItemsRender; // Store the new callback

        this.addCombatFeedback = this.addCombatFeedbackToRef.bind(this);

        console.log("GameLogic: Inicializado.");
    }

    addCombatFeedbackToRef(text, x, y, type = 'normal') {
        const id = Date.now() + Math.random();
        let color = '#ffffff';
        let fontSize = 16;
        let offsetY = -30;

        switch (type) {
            case 'damage':
                color = '#f56565';
                fontSize = 20;
                offsetY = -40;
                break;
            case 'block':
                color = '#63b3ed';
                fontSize = 18;
                offsetY = -40;
                break;
            case 'parry':
                color = '#a0aec0';
                fontSize = 22;
                offsetY = -50;
                break;
            case 'positive':
                color = '#48bb78';
                fontSize = 16;
                break;
            case 'warning':
                color = '#ecc94b';
                fontSize = 16;
                break;
            case 'death':
                color = '#e53e3e';
                fontSize = 24;
                offsetY = -60;
                break;
            case 'combo':
                color = '#9f7aea';
                fontSize = 18;
                break;
            case 'neutral':
                color = '#cbd5e0';
                fontSize = 16;
                break;
            case 'hit':
                color = '#edf2f7';
                fontSize = 16;
                offsetY = -30;
                break;
            default:
                break;
        }

        this.combatFeedbacksRef.current.push({
            id,
            text,
            x,
            y,
            color,
            fontSize,
            life: 1.5,
            offsetY,
            velocityY: 0
        });

        if (this.forceCombatFeedbackRender) {
            this.forceCombatFeedbackRender();
        }
    }

    update(deltaTime, mouseAngle) {
        const player = this.localPlayerRef.current;
        if (!player || !player.isAlive) {
            this.updateThrowingBar(false, 0, 0, 0);
            return;
        }

        if (!this.keysRef || !this.keysRef.current || !this.mouseRef || !this.mouseRef.current || !this.clickTargetRef) {
            console.error("GameLogic.update: Referências de input estão indefinidas!");
            return;
        }

        const keys = this.keysRef.current;
        const mouse = this.mouseRef.current;
        const clickTarget = this.clickTargetRef.current;

        // --- Gerenciamento de Cooldowns ---
        player.attackCooldown = Math.max(0, player.attackCooldown - deltaTime);
        player.throwCooldown = Math.max(0, player.throwCooldown - deltaTime);
        player.jumpDashCooldown = Math.max(0, player.jumpDashCooldown - deltaTime);
        player.pickupCooldown = Math.max(0, player.pickupCooldown - deltaTime);
        player.isStunned = Math.max(0, player.isStunned - deltaTime);

        // --- Movimento do Jogador (Clique Direito) ---
        let isMovingWithWASD = false;
        if (keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD']) {
            isMovingWithWASD = true;
            this.clickTargetRef.current = null;
        }

        if (clickTarget && player.isAlive && player.isStunned <= 0 && !isMovingWithWASD) {
            const targetX = clickTarget.x;
            const targetY = clickTarget.y;

            const dist = Math.sqrt(
                Math.pow(targetX - player.x, 2) + Math.pow(targetY - player.y, 2)
            );

            if (dist > 0.1) {
                const angle = Math.atan2(targetY - player.y, targetX - player.x);
                const moveDx = Math.cos(angle);
                const moveDy = Math.sin(angle);

                player.move(moveDx * deltaTime, moveDy * deltaTime, this.obstaclesRef.current, this.allPlayersRef.current);

                player.direction.x = moveDx;
                player.direction.y = moveDy;

            } else {
                this.clickTargetRef.current = null;
            }
        }

        // --- Lógica de Bloqueio (KeyW) ---
        if (keys['KeyW'] && player.weapon.blockValue > 0 && player.blockBar > 0 && player.isStunned <= 0) {
            player.isBlocking = true;
            player.blockBar = Math.max(0, player.blockBar - player.weapon.blockCost * deltaTime);
            if (player.blockBar <= 0) {
                player.isBlocking = false;
                this.addCombatFeedback('BARRA QUEBRADA!', player.x, player.y, 'warning');
                player.isStunned = 1.0;
            }
        } else {
            player.isBlocking = false;
            if (player.blockBar < player.weapon.blockValue) {
                player.blockBar = Math.min(player.weapon.blockValue, player.blockBar + (player.weapon.blockValue / 5) * deltaTime);
            }
        }

        // --- Lógica de Ataque (KeyQ) ---
        if (keys['KeyQ'] && player.isAlive && player.isStunned <= 0 && player.attackCooldown <= 0) {
            if (player.weapon.projectile === 'arrow' && player.weapon.chargeTime) {
                player.isCharging = true;
                player.chargeProgress = Math.min(1, player.chargeProgress + deltaTime / player.weapon.chargeTime);
                this.updateThrowingBar(true, player.chargeProgress, player.x, player.y);
            } else {
                this.performMeleeAttack(player, mouseAngle);
                player.attackCooldown = player.weapon.attackCD;
                player.comboStep = (player.comboStep + 1) % player.weapon.combo.length;
                this.addCombatFeedback(`COMBO ${player.comboStep + 1}`, player.x, player.y - 1, 'combo');
                // NEW: Adiciona feedback de ataque mesmo que não acerte um alvo
                this.addCombatFeedback('ATAQUE!', player.x, player.y + 0.5, 'neutral');
            }
        } else if (!keys['KeyQ'] && player.isCharging) {
            this.updateThrowingBar(false, 0, 0, 0);
            if (player.chargeProgress >= 0.1 && player.arrows > 0 && player.throwCooldown <= 0) {
                this.performRangedAttack(player, mouseAngle, player.chargeProgress);
                player.throwCooldown = player.weapon.attackCD;
            } else if (player.arrows <= 0) {
                this.addCombatFeedback('SEM FLECHAS!', player.x, player.y - 1, 'warning');
            } else if (player.throwCooldown > 0) {
                this.addCombatFeedback('RECARREGANDO ARCO', player.x, player.y - 1, 'warning');
            }
            player.isCharging = false;
            player.chargeProgress = 0;
        } else if (!keys['KeyQ'] && !player.isCharging) {
            this.updateThrowingBar(false, 0, 0, 0);
        }

        // --- Lógica de Arremesso/Coleta (KeyE) ---
        let pickedUp = false;
        if (keys['KeyE'] && player.isAlive && player.pickupCooldown <= 0 && player.isStunned <= 0) {
            console.log("GameLogic: KeyE pressed, checking for pickups."); // NEW LOG
            for (let i = 0; i < this.droppedItemsRef.current.length; i++) {
                const item = this.droppedItemsRef.current[i];
                const distToItem = Math.sqrt(
                    Math.pow(player.x - item.x, 2) + Math.pow(player.y - item.y, 2)
                );
                console.log(`GameLogic: Checking item ${item.id} (${item.itemType}) at dist ${distToItem}. Pickup range: ${PICKUP_RANGE}`); // NEW LOG
                if (distToItem <= PICKUP_RANGE) {
                    if (item.itemType === 'arrow') {
                        if (player.weapon.projectile === 'arrow') {
                            console.log("GameLogic: Picking up arrow."); // NEW LOG
                            player.arrows += 5;
                            this.addCombatFeedback("+5 FLECHAS", player.x, player.y, 'positive');
                            player.pickupCooldown = PICKUP_COOLDOWN;
                            this.gameSync.removeDroppedItemFromFirestore(item.id);
                            pickedUp = true;
                            // NEW: Force re-render of dropped items after pickup
                            if (this.forceDroppedItemsRender) {
                                this.forceDroppedItemsRender();
                            }
                            break;
                        } else {
                            console.log("GameLogic: Cannot pick up arrow, not equipped with bow."); // NEW LOG
                        }
                    } else if (WEAPONS[item.itemType] && WEAPONS[item.itemType].isThrowable) {
                        // NEW: Permite pegar armas arremessáveis mesmo sem arma equipada (mãos nuas)
                        console.log(`GameLogic: Picking up throwable weapon ${item.itemType}.`); // NEW LOG
                        if (player.inventory.length < 3) {
                            player.inventory.push(item.itemType);
                            player.updateActiveWeapon();
                            this.addCombatFeedback(`PEGOU ${WEAPONS[item.itemType].name.toUpperCase()}`, player.x, player.y, 'positive');
                            player.pickupCooldown = PICKUP_COOLDOWN;
                            this.gameSync.removeDroppedItemFromFirestore(item.id);
                            pickedUp = true;
                            // NEW: Force re-render of dropped items after pickup
                            if (this.forceDroppedItemsRender) {
                                this.forceDroppedItemsRender();
                            }
                            break;
                        } else {
                            this.addCombatFeedback('INVENTÁRIO CHEIO!', player.x, player.y, 'warning');
                            console.log("GameLogic: Inventory full, cannot pick up weapon."); // NEW LOG
                        }
                    }
                }
            }
        }

        // Lógica de Arremesso (KeyE, se não pegou nada e tem arma arremessável)
        if (keys['KeyE'] && player.isAlive && player.isStunned <= 0 && !pickedUp && player.weapon.isThrowable && player.weapon.name !== WEAPONS.bowAndArrow.name && player.throwCooldown <= 0) {
            player.isThrowing = true;
            player.throwCharge = Math.min(1, player.throwCharge + deltaTime);
            this.updateThrowingBar(true, player.throwCharge, player.x, player.y);
            console.log("GameLogic: Player starting throw charge. Current weapon:", player.weapon.name); // Debug log
        } else if (!keys['KeyE'] && player.isThrowing) {
            this.updateThrowingBar(false, 0, 0, 0);
            if (player.throwCharge > 0.1 && player.throwCooldown <= 0) {
                this.performThrowAttack(player, mouseAngle, player.throwCharge);
                player.throwCooldown = player.weapon.attackCD * 1.5;
            } else if (player.throwCooldown > 0) {
                this.addCombatFeedback('RECARREGANDO ARREMESSAVEL', player.x, player.y - 1, 'warning');
            }
            player.isThrowing = false;
            player.throwCharge = 0;
            console.log("GameLogic: Player released throw. Current weapon after drop:", player.weapon.name); // Debug log
            // NEW: Force re-render of dropped items after throwing (since weapon is dropped)
            if (this.forceDroppedItemsRender) {
                this.forceDroppedItemsRender();
            }
        } else if (!keys['KeyE'] && !player.isThrowing) {
            this.updateThrowingBar(false, 0, 0, 0);
        }

        // --- Lógica de Dash (KeyR) ---
        if (keys['KeyR'] && player.isAlive && player.jumpDashCooldown <= 0 && player.isStunned <= 0) {
            const dashTargetX = player.x + player.direction.x * DASH_DISTANCE;
            const dashTargetY = player.y + player.direction.y * DASH_DISTANCE;

            const charSize = player.isPlayer ? PLAYER_SIZE / CELL_SIZE : BOT_SIZE / CELL_SIZE;
            if (!player.checkCollision(dashTargetX, dashTargetY, charSize, this.obstaclesRef.current, this.allPlayersRef.current, player)) {
                player.doDash(dashTargetX, dashTargetY);
            } else {
                this.addCombatFeedback('CAMINHO BLOQUEADO!', player.x, player.y, 'warning');
            }
        }

        // --- Lógica de Dropar Item (Mouse0) ---
        if (mouse.left && player.isAlive && player.pickupCooldown <= 0 && player.weapon.name !== WEAPONS.bareHands.name) {
            console.log("GameLogic: Attempting to drop weapon. Current weapon:", player.weapon.name); // Debug log
            const droppedWeaponKey = player.dropActiveWeapon();
            if (droppedWeaponKey) {
                const newDroppedItem = new DroppedItem(player.x, player.y, droppedWeaponKey);
                this.droppedItemsRef.current.push(newDroppedItem);
                this.gameSync.addDroppedItemToFirestore(newDroppedItem);
                this.addCombatFeedback('DROPOU ' + WEAPONS[droppedWeaponKey].name.toUpperCase(), player.x, player.y, 'positive');
                player.pickupCooldown = PICKUP_COOLDOWN;
                console.log("GameLogic: Weapon dropped. New active weapon:", player.weapon.name); // Debug log
                // NEW: Force re-render of dropped items after dropping
                if (this.forceDroppedItemsRender) {
                    this.forceDroppedItemsRender();
                }
            }
            mouse.left = false; // Reset mouse click state to prevent continuous dropping
        }


        // --- Atualização de Bots ---
        this.updateBots(deltaTime);

        // --- Atualização de Projéteis ---
        this.updateProjectiles(deltaTime);

        // --- Limpar Visuais de Ataque Antigos (no canvas) ---
        this.attackVisualsRef.current = this.attackVisualsRef.current.filter(v => v.life > 0);
        this.attackVisualsRef.current.forEach(v => {
            v.life -= deltaTime * 2; // Fade out mais rápido
        });

        // --- Atualizar e Limpar Feedbacks de Combate (no HUD) ---
        this.combatFeedbacksRef.current = this.combatFeedbacksRef.current.filter(f => f.life > 0);
        this.combatFeedbacksRef.current.forEach(f => {
            f.life -= deltaTime;
            f.offsetY -= 20 * deltaTime; // Move para cima
            f.opacity = Math.max(0, f.life / 1.5); // Reduz opacidade
        });
    }

    performMeleeAttack(player, mouseAngle) {
        const attackRange = player.weapon.range;
        const attackDamage = player.weapon.damage;
        const knockback = player.weapon.knockback || 0;

        // Adiciona um novo tipo de 'attackVisual' para o retângulo de ataque
        this.attackVisualsRef.current.push({
            x: player.x,
            y: player.y,
            angle: mouseAngle, // Armazena o ângulo para desenhar o retângulo corretamente
            range: attackRange, // Passa o alcance para o visual
            type: 'melee',
            life: 0.2 // Tempo de vida curto para o visual
        });

        const allTargets = Array.from(this.allPlayersRef.current.values()).filter(p => p.id !== player.id && p.isAlive);
        if (this.dummyRef.current && this.dummyRef.current.isAlive) {
            allTargets.push(this.dummyRef.current);
        }
        this.botsRef.current.forEach(bot => {
            if (bot.isAlive) {
                allTargets.push(bot);
            }
        });

        let hitSomething = false; // Flag para verificar se o ataque acertou algo
        allTargets.forEach(target => {
            // Usa as coordenadas X e Y do personagem para calcular a distância e direção
            const playerCenterX = player.x + (player.isPlayer ? PLAYER_SIZE : BOT_SIZE) / (2 * CELL_SIZE);
            const playerCenterY = player.y + (player.isPlayer ? PLAYER_SIZE : BOT_SIZE) / (2 * CELL_SIZE);
            const targetCenterX = target.x + (target.isPlayer ? PLAYER_SIZE : BOT_SIZE) / (2 * CELL_SIZE);
            const targetCenterY = target.y + (target.isPlayer ? PLAYER_SIZE : BOT_SIZE) / (2 * CELL_SIZE);

            const dist = Math.sqrt(
                Math.pow(targetCenterX - playerCenterX, 2) +
                Math.pow(targetCenterY - playerCenterY, 2)
            );

            // Calcula a diferença angular entre a direção do ataque e a direção para o alvo
            const angleToTarget = Math.atan2(targetCenterY - playerCenterY, targetCenterX - playerCenterX);
            let angleDiff = Math.abs(mouseAngle - angleToTarget);
            // Normaliza o ângulo para estar entre -PI e PI
            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

            // Define um "arco" de 60 graus (PI/3 radianos) à frente do jogador como área de acerto
            const attackArc = Math.PI / 3; // 60 graus de cone de ataque

            // Verifica se o alvo está dentro do alcance e do cone de ataque
            if (dist <= attackRange && angleDiff <= attackArc / 2) { // dist já está em unidades de grid
                hitSomething = true; // Ataque acertou
                const attackDir = this.getAttackDirection(player, target);
                let damageToApply = attackDamage;

                // Lógica de Bloqueio e Parry (simplificada, adicione complexidade aqui)
                if (target.isBlocking) {
                    const blockedAmount = Math.min(target.blockBar, damageToApply);
                    damageToApply -= blockedAmount;
                    target.blockBar -= blockedAmount;
                    this.addCombatFeedback(`Bloqueou!`, target.x, target.y, 'block'); // Feedback para o alvo
                } else {
                    this.addCombatFeedback(`-${Math.floor(damageToApply)}`, target.x, target.y, 'damage'); // Feedback para o alvo
                }

                target.takeDamage(damageToApply, player, attackDir);

                const knockbackAngle = Math.atan2(target.y - player.y, target.x - player.x);
                target.x += Math.cos(knockbackAngle) * (knockback / CELL_SIZE);
                target.y += Math.sin(knockbackAngle) * (knockback / CELL_SIZE);
            }
        });

        // Adiciona feedback para o jogador atacante se ele acertou algo
        if (hitSomething) {
            this.addCombatFeedback('ACERTOU!', player.x, player.y + 1, 'hit'); // Feedback para o atacante
        }
    }

    performRangedAttack(player, mouseAngle, chargeProgress) {
        if (player.arrows <= 0) {
            this.addCombatFeedback("SEM FLECHAS!", player.x, player.y, 'warning');
            return;
        }

        const projectileDamage = player.weapon.damage * (1 + chargeProgress * 0.5);
        const startX = player.x + player.direction.x * (PLAYER_SIZE / CELL_SIZE / 2);
        const startY = player.y + player.direction.y * (PLAYER_SIZE / CELL_SIZE / 2);

        const newProjectile = new Projectile(
            startX,
            startY,
            mouseAngle,
            player.weapon.throwRange,
            projectileDamage,
            player.weapon.projectile, // 'arrow'
            player,
            Date.now() + Math.random()
        );
        this.projectilesRef.current.push(newProjectile);

        player.arrows--;
        this.addCombatFeedback(`-${1} FLECHA`, player.x, player.y, 'negative');
    }

    performThrowAttack(player, mouseAngle, throwCharge) {
        if (!player.weapon.isThrowable || player.weapon.name === WEAPONS.bowAndArrow.name) {
            this.addCombatFeedback("NÃO PODE ARREMESSAR!", player.x, player.y, 'warning');
            return;
        }

        console.log("GameLogic: Before dropping weapon for throw. Player weapon:", player.weapon.name); // Debug log
        const thrownWeaponKey = player.dropActiveWeapon();
        console.log("GameLogic: After dropping weapon for throw. Dropped key:", thrownWeaponKey, "New active weapon:", player.weapon.name); // Debug log

        if (!thrownWeaponKey || thrownWeaponKey === 'bareHands') {
            this.addCombatFeedback("NÃO PODE ARREMESSAR MÃOS NUAS!", player.x, player.y, 'warning');
            return;
        }

        const projectileDamage = player.weapon.damage * (1 + throwCharge * 0.5);
        const throwDistance = player.weapon.throwRange * throwCharge;

        const startX = player.x + player.direction.x * (PLAYER_SIZE / CELL_SIZE / 2);
        const startY = player.y + player.direction.y * (PLAYER_SIZE / CELL_SIZE / 2);

        const newProjectile = new Projectile(
            startX,
            startY,
            mouseAngle,
            throwDistance,
            projectileDamage,
            thrownWeaponKey, // O tipo de projétil é a chave da arma
            player,
            Date.now() + Math.random()
        );
        this.projectilesRef.current.push(newProjectile);

        this.addCombatFeedback(`ARREMESSOU ${WEAPONS[thrownWeaponKey].name.toUpperCase()}`, player.x, player.y, 'positive');
    }

    updateBots(deltaTime) {
        this.botsRef.current.forEach(bot => {
            if (!bot.isAlive) {
                // Se o bot morreu, dropa as armas presas
                const droppedWeapons = bot.respawn(bot.x, bot.y, bot.classKey);
                droppedWeapons.forEach(weaponKey => {
                    const newDroppedItem = new DroppedItem(bot.x, bot.y, weaponKey);
                    this.droppedItemsRef.current.push(newDroppedItem);
                    this.gameSync.addDroppedItemToFirestore(newDroppedItem);
                });
                // NEW: Force re-render of dropped items after bot respawn (if it drops items)
                if (this.forceDroppedItemsRender) {
                    this.forceDroppedItemsRender();
                }
                return;
            }

            const target = this.localPlayerRef.current;
            if (target && target.isAlive) {
                const dist = Math.sqrt(
                    Math.pow((target.x * CELL_SIZE + CELL_SIZE / 2) - (bot.x * CELL_SIZE + CELL_SIZE / 2), 2) +
                    Math.pow((target.y * CELL_SIZE + CELL_SIZE / 2) - (bot.y * CELL_SIZE + CELL_SIZE / 2), 2)
                );

                bot.attackCooldown = Math.max(0, bot.attackCooldown - deltaTime);

                if (dist > bot.weapon.range * CELL_SIZE) {
                    const angle = Math.atan2(target.y - bot.y, target.x - bot.x);
                    bot.direction.x = Math.cos(angle);
                    bot.direction.y = Math.sin(angle);
                    bot.move(bot.direction.x * deltaTime, bot.direction.y * deltaTime, this.obstaclesRef.current, this.allPlayersRef.current);
                } else {
                    if (bot.attackCooldown <= 0) {
                        if (bot.weapon.type === 'melee') {
                            this.performMeleeAttack(bot, Math.atan2(target.y - bot.y, target.x - bot.x));
                        } else if (bot.weapon.projectile === 'arrow') {
                            this.performRangedAttack(bot, Math.atan2(target.y - bot.y, target.x - bot.x), 1);
                        } else if (bot.weapon.isThrowable) {
                            this.performThrowAttack(bot, Math.atan2(target.y - bot.y, target.x - bot.x), 1);
                        }
                        bot.attackCooldown = bot.weapon.attackCD;
                    }
                }
            }
        });
    }

    updateProjectiles(deltaTime) {
        this.projectilesRef.current = this.projectilesRef.current.filter(p => p.life > 0);

        this.projectilesRef.current.forEach(projectile => {
            projectile.obstacles = this.obstaclesRef.current;
            projectile.players = Array.from(this.allPlayersRef.current.values()).filter(c => c.isAlive);
            if (this.dummyRef.current && this.dummyRef.current.isAlive) {
                projectile.players.push(this.dummyRef.current);
            }
            this.botsRef.current.forEach(bot => {
                if (bot.isAlive) {
                    projectile.players.push(bot);
                }
            });

            projectile.update(deltaTime);

            // Se o projétil atingiu um obstáculo ou expirou sem atingir um personagem E é arremessável, dropa o item.
            // Projéteis que atingiram (hasHit = true) um personagem já foram "anexados" e não devem ser dropados aqui.
            if (projectile.life <= 0 && !projectile.hasHit) {
                if (WEAPONS[projectile.weaponKey] && WEAPONS[projectile.weaponKey].isThrowable) {
                    const newDroppedItem = new DroppedItem(projectile.x, projectile.y, projectile.weaponKey);
                    this.droppedItemsRef.current.push(newDroppedItem);
                    this.gameSync.addDroppedItemToFirestore(newDroppedItem);
                    // NEW: Force re-render of dropped items after projectile expires and drops item
                    if (this.forceDroppedItemsRender) {
                        this.forceDroppedItemsRender();
                    }
                }
            }
        });
    }

    updateDroppedItems() { /* Mantido por compatibilidade, mas lógica principal de coleta no update */ }

    spawnBot() {
        let botX, botY;
        let validSpawn = false;
        let attempts = 0;
        const maxSpawnAttempts = 50;

        while (!validSpawn && attempts < maxSpawnAttempts) {
            const randomSpawnPoint = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
            botX = randomSpawnPoint.x;
            botY = randomSpawnPoint.y;

            validSpawn = true;
            for (const obs of this.obstaclesRef.current) {
                if (botX < obs.x + obs.width &&
                    botX + BOT_SIZE / CELL_SIZE > obs.x &&
                    botY < obs.y + obs.height &&
                    botY + BOT_SIZE / CELL_SIZE > obs.y) {
                    validSpawn = false;
                    break;
                }
            }
            if (validSpawn) {
                const allCharacters = Array.from(this.allPlayersRef.current.values()).filter(c => c.isAlive);
                if (this.dummyRef.current && this.dummyRef.current.isAlive) {
                    allCharacters.push(this.dummy.current);
                }
                this.botsRef.current.forEach(bot => {
                    if (bot.isAlive) {
                        allCharacters.push(bot);
                    }
                });

                const newBotRect = { x: botX, y: botY, width: BOT_SIZE / CELL_SIZE, height: BOT_SIZE / CELL_SIZE };

                for (const char of allCharacters) {
                    const charRect = {
                        x: char.x,
                        y: char.y,
                        width: (char.isPlayer ? PLAYER_SIZE : BOT_SIZE) / CELL_SIZE,
                        height: (char.isPlayer ? PLAYER_SIZE : BOT_SIZE) / CELL_SIZE
                    };
                    if (this.checkRectCollision(newBotRect, charRect)) {
                        validSpawn = false;
                        break;
                    }
                }
            }
            attempts++;
        }

        if (validSpawn) {
            const botClassKeys = Object.keys(CLASS_DEFAULT_WEAPONS).filter(key => key !== 'bareHands');
            const randomClassKey = botClassKeys[Math.floor(Math.random() * botClassKeys.length)];
            const newBot = new Bot(botX, botY, randomClassKey, this.addCombatFeedback);
            this.botsRef.current.push(newBot);
            console.log("Bot spawned at:", newBot.x, newBot.y);
        } else {
            console.warn("Não foi possível encontrar um ponto de spawn válido para o bot após várias tentativas.");
        }
    }

    checkRectCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y;
    }

    getAttackDirection(attacker, target) {
        const dx = target.x - attacker.x;
        const dy = target.y - attacker.y;
        const angle = Math.atan2(dy, dx);

        if (angle >= -Math.PI / 4 && angle < Math.PI / 4) return 'direta';
        if (angle >= Math.PI / 4 && angle < 3 * Math.PI / 4) return 'uppercut';
        if (angle >= 3 * Math.PI / 4 || angle < -3 * Math.PI / 4) return 'esquerda';
        return 'estocada';
    }
}

