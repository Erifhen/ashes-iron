// src/game/GameInput.js
import { CELL_SIZE, PICKUP_RANGE, WEAPONS, DASH_DISTANCE, DASH_COOLDOWN } from './constants/gameConstants'; // Importa DASH_DISTANCE e DASH_COOLDOWN

export class GameInput { // Garante que a classe é exportada
    constructor(localPlayerRef, keysRef, mouseRef, mouseAngleRef, clickTargetRef, addCombatFeedback, droppedItemsRef, projectilesRef) {
        this.localPlayerRef = localPlayerRef;
        this.keysRef = keysRef;
        this.mouseRef = mouseRef;
        this.mouseAngleRef = mouseAngleRef;
        this.clickTargetRef = clickTargetRef;
        this.addCombatFeedback = addCombatFeedback;
        this.droppedItemsRef = droppedItemsRef;
        this.projectilesRef = projectilesRef;

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);

        console.log("GameInput: Inicializado.");
    }

    handleKeyDown(e) {
        if (!this.keysRef.current) return;
        this.keysRef.current[e.code] = true;
        if (e.code === 'Space') e.preventDefault();

        const player = this.localPlayerRef.current;
        if (!player || !player.isAlive || player.isStunned > 0) return;

        switch (e.code) {
            case 'KeyQ': // Atacar
                // A lógica de ataque principal (cooldown, tipo de arma) será em GameLogic
                // Aqui, apenas sinalizamos que o ataque foi iniciado/mantido
                if (player.weapon.type === 'ranged' && player.arrows <= 0) {
                    this.addCombatFeedback('SEM FLECHAS', player.x, player.y - 1, 'warning');
                }
                break;
            case 'KeyW': // Bloquear
                player.startBlocking();
                break;
            case 'KeyE': // Arremessar ou Pegar Item
                if (!player.isThrowing) {
                    let pickedUp = false;
                    for (let i = 0; i < this.droppedItemsRef.current.length; i++) {
                        const item = this.droppedItemsRef.current[i];
                        const distance = Math.sqrt(
                            Math.pow(player.x - item.x, 2) + Math.pow(player.y - item.y, 2)
                        );
                        if (distance <= PICKUP_RANGE && player.pickupCooldown <= 0) {
                            pickedUp = true;
                            break;
                        }
                    }
                    if (!pickedUp && player.weapon.isThrowable && player.weapon.name !== WEAPONS.bowAndArrow.name) {
                        player.startThrowing();
                    } else if (!pickedUp && player.weapon.name === WEAPONS.bowAndArrow.name && player.arrows > 0) {
                        player.startThrowing();
                    } else if (!pickedUp && player.weapon.name === WEAPONS.bowAndArrow.name && player.arrows <= 0) {
                        this.addCombatFeedback('SEM FLECHAS PARA ARREMESSAR', player.x, player.y - 1, 'warning');
                    } else if (!pickedUp && !player.weapon.isThrowable) {
                        this.addCombatFeedback('NADA PARA ARREMESSAR', player.x, player.y - 1, 'warning');
                    }
                }
                break;
            case 'KeyR': // Dash - Lógica adicionada aqui!
                if (player.jumpDashCooldown <= 0) {
                    // Calcula a direção do dash com base na direção atual do player.
                    // A direção do player é atualizada pelo mouseMove.
                    const dashDirectionX = player.direction.x;
                    const dashDirectionY = player.direction.y;

                    // Calcula o ponto de destino do dash
                    const targetX = player.x + dashDirectionX * DASH_DISTANCE;
                    const targetY = player.y + dashDirectionY * DASH_DISTANCE;

                    // Chama o método doDash do player
                    player.doDash(targetX, targetY);
                } else {
                    // Feedback visual se o dash estiver em cooldown
                    this.addCombatFeedback('DASH EM COOLDOWN!', player.x, player.y - 1, 'warning');
                }
                break;
            case 'Space': // Trocar arma (se houver mais de uma)
                if (player.inventory.length > 1) {
                    player.switchWeapon();
                } else {
                    this.addCombatFeedback('Apenas uma arma!', player.x, player.y, 'warning');
                }
                break;
            default:
                break;
        }
    }

    handleKeyUp(e) {
        if (!this.keysRef.current) return;
        this.keysRef.current[e.code] = false;

        const player = this.localPlayerRef.current;
        if (!player || !player.isAlive) return;

        switch (e.code) {
            case 'KeyW': // Parar de Bloquear
                player.stopBlocking();
                break;
            case 'KeyQ': // Soltar ataque carregado (se for arco)
                if (player.isCharging) {
                    player.releaseCharge();
                }
                break;
            case 'KeyE': // Soltar arremesso carregado
                if (player.isThrowing) {
                    player.releaseThrow();
                }
                break;
            default:
                break;
        }
    }

    handleMouseMove(e, canvas, cameraX, cameraY, CELL_SIZE_CONST) {
        if (!this.mouseRef.current || typeof this.mouseRef.current !== 'object') {
            console.error("GameInput handleMouseMove: mouseRef.current não é um objeto ou é nulo:", this.mouseRef.current);
            this.mouseRef.current = { x: 0, y: 0, left: false, right: false };
            return;
        }
        if (!this.localPlayerRef.current) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        this.mouseRef.current.x = (e.clientX - rect.left) * scaleX + cameraX;
        this.mouseRef.current.y = (e.clientY - rect.top) * scaleY + cameraY;

        const playerCenterX = this.localPlayerRef.current.x * CELL_SIZE_CONST + CELL_SIZE_CONST / 2;
        const playerCenterY = this.localPlayerRef.current.y * CELL_SIZE_CONST + CELL_SIZE_CONST / 2;

        const dx = this.mouseRef.current.x - playerCenterX;
        const dy = this.mouseRef.current.y - playerCenterY;
        this.mouseAngleRef.current = Math.atan2(dy, dx);

        this.localPlayerRef.current.direction.x = Math.cos(this.mouseAngleRef.current);
        this.localPlayerRef.current.direction.y = Math.sin(this.mouseAngleRef.current);
    }

    handleMouseDown(e) {
        if (!this.mouseRef.current || typeof this.mouseRef.current !== 'object') {
            console.error("GameInput handleMouseDown: mouseRef.current não é um objeto ou é nulo:", this.mouseRef.current);
            this.mouseRef.current = { x: 0, y: 0, left: false, right: false };
            return;
        }
        if (!this.localPlayerRef.current || !this.localPlayerRef.current.isAlive || this.localPlayerRef.current.isStunned > 0) return;

        if (e.button === 0) { // Botão esquerdo do mouse: Dropar item
            this.mouseRef.current.left = true;
            // A lógica de dropar e adicionar ao droppedItemsRef será em GameLogic.js
            // Aqui apenas sinalizamos a intenção de dropar
        } else if (e.button === 2) { // Botão direito do mouse: Andar até o ponto
            this.mouseRef.current.right = true;
            this.clickTargetRef.current = {
                x: this.mouseRef.current.x / CELL_SIZE,
                y: this.mouseRef.current.y / CELL_SIZE
            };
        }
    }

    handleMouseUp(e) {
        if (!this.mouseRef.current || typeof this.mouseRef.current !== 'object') {
            console.error("GameInput handleMouseUp: mouseRef.current não é um objeto ou é nulo:", this.mouseRef.current);
            this.mouseRef.current = { x: 0, y: 0, left: false, right: false };
            return;
        }
        if (e.button === 0) this.mouseRef.current.left = false;
        if (e.button === 2) this.mouseRef.current.right = false;
    }

    handleContextMenu(e) {
        e.preventDefault();
    }
}

