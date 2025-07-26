// src/game/GameEngine.js
import { Player } from './entities/Player';
import { Dummy } from './entities/Dummy';
import { Bot } from './entities/Bot';
import { DroppedItem } from './entities/DroppedItem';
import { Projectile } from './entities/Projectile';
import { WEAPONS, CLASS_DEFAULT_WEAPONS, GRID_SIZE, CELL_SIZE, PLAYER_SIZE, DUMMY_SIZE, BOT_SIZE, OBSTACLE_SIZE, SPAWN_POINTS, DASH_DISTANCE, DASH_COOLDOWN, PICKUP_COOLDOWN } from './constants/gameConstants';
import { GameEngineDraw } from './GameEngineDraw';

import { GameSync } from './GameSync';
import { GameInput } from './GameInput';
import { GameLogic } from './GameLogic';

const NUM_OBSTACLES = 15;

export class GameEngine {
    // Adicionado forceCombatFeedbackRender e NEW: droppedItemsRef, forceDroppedItemsRender ao construtor
    constructor(canvas, roomId, localPlayerId, playerConfig, combatFeedbacksRef, updateThrowingBar, forceCombatFeedbackRender, droppedItemsRef, forceDroppedItemsRenderForItems, db, auth) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.roomId = roomId;
        this.localPlayerId = localPlayerId;
        this.playerConfig = playerConfig;
        this.combatFeedbacksRef = combatFeedbacksRef;
        this.updateThrowingBar = updateThrowingBar;
        this.forceCombatFeedbackRender = forceCombatFeedbackRender;
        this.droppedItemsRef = droppedItemsRef; // NEW: Referência ao ref do array de itens dropados
        this.forceDroppedItemsRender = forceDroppedItemsRenderForItems; // NEW: Callback para forçar re-renderização de itens dropados
        this.db = db;
        this.auth = auth;

        this.gameActive = false;

        this.localPlayer = { current: null };
        this.allPlayers = { current: new Map() };
        this.dummy = { current: null };
        this.bots = { current: [] };
        // this.droppedItems = { current: [] }; // Agora gerenciado via droppedItemsRef passado do GameScreen
        this.attackVisuals = { current: [] };
        this.projectiles = { current: [] };
        this.obstacles = { current: [] };

        this.cameraX = 0;
        this.cameraY = 0;

        this.keys = { current: {} };
        this.mouse = { current: { x: 0, y: 0, left: false, right: false } };
        this.mouseAngle = { current: 0 };
        this.clickTarget = { current: null };

        this.lastTime = 0;
        this.animationFrameId = null;

        this.gameDraw = new GameEngineDraw(this.ctx, this.canvas);

        this.gameSync = new GameSync(
            this.roomId,
            this.localPlayerId,
            this.allPlayers,
            this.localPlayer,
            this.forceCombatFeedbackRender, // Passa o callback para GameSync
            this.droppedItemsRef, // NEW: Passa o ref de itens dropados
            this.forceDroppedItemsRender, // NEW: Passa o callback para GameSync
            this.db,
            this.auth
        );

        this.gameInput = new GameInput(
            this.localPlayer,
            this.keys,
            this.mouse,
            this.mouseAngle,
            this.clickTarget,
            this.forceCombatFeedbackRender, // Passa o callback para GameInput
            this.droppedItemsRef, // NEW: Passa o ref de itens dropados
            this.projectiles
        );

        // Passa as referências de input e os callbacks para GameLogic
        this.gameLogic = new GameLogic(
            this.localPlayer,
            this.allPlayers,
            this.dummy,
            this.bots,
            this.droppedItemsRef, // Passa a referência do ref diretamente
            this.projectiles,
            this.attackVisuals,
            this.combatFeedbacksRef, // Passa a referência do ref diretamente
            this.updateThrowingBar,
            this.gameSync,
            this.obstacles,
            this.keys,
            this.mouse,
            this.clickTarget,
            this.forceCombatFeedbackRender,
            this.forceDroppedItemsRender // NEW: Passa o callback para GameLogic
        );

        // Bind de métodos para garantir o 'this' correto
        this.gameLoop = this.gameLoop.bind(this);
        this.handleKeyDown = this.gameInput.handleKeyDown;
        this.handleKeyUp = this.gameInput.handleKeyUp;
        this.handleMouseMove = (e) => this.gameInput.handleMouseMove(e, this.canvas, this.cameraX, this.cameraY, CELL_SIZE);
        this.handleMouseDown = (e) => this.gameInput.handleMouseDown(e, this.cameraX, this.cameraY, CELL_SIZE); // NEW: Pass cameraX, cameraY, CELL_SIZE
        this.handleMouseUp = this.gameInput.handleMouseUp;
        this.handleContextMenu = this.gameInput.handleContextMenu;

        console.log("GameEngine: Inicializado com módulos.");
    }

    generateRandomObstacles(numObstacles) {
        const generatedObstacles = [];
        const maxAttempts = 100;

        for (let i = 0; i < numObstacles; i++) {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < maxAttempts) {
                const x = Math.floor(Math.random() * GRID_SIZE);
                const y = Math.floor(Math.random() * GRID_SIZE);
                const newObstacle = { x, y, width: 1, height: 1 };

                let collision = false;

                for (const existingObs of generatedObstacles) {
                    if (
                        x < existingObs.x + existingObs.width &&
                        x + newObstacle.width > existingObs.x &&
                        y < existingObs.y + newObstacle.height &&
                        y + newObstacle.height > existingObs.y
                    ) {
                        collision = true;
                        break;
                    }
                }

                if (!collision) {
                    for (const spawnPoint of SPAWN_POINTS) {
                        if (
                            spawnPoint.x >= x && spawnPoint.x < x + newObstacle.width &&
                            spawnPoint.y >= y && spawnPoint.y < y + newObstacle.height
                        ) {
                            collision = true;
                            break;
                        }
                    }
                }

                if (!collision) {
                    generatedObstacles.push(newObstacle);
                    placed = true;
                }
                attempts++;
            }
            if (!placed) {
                console.warn(`GameEngine: Não foi possível posicionar o obstáculo ${i + 1} após ${maxAttempts} tentativas.`);
            }
        }
        return generatedObstacles;
    }

    async initGame() {
        console.log("GameEngine: Initializing game for room:", this.roomId, "player:", this.localPlayerId);

        this.obstacles.current = this.generateRandomObstacles(NUM_OBSTACLES);
        console.log("GameEngine: Obstáculos gerados:", this.obstacles.current);

        console.log("GameEngine: PlayerConfig received for local player:", this.playerConfig); // NEW LOG

        this.localPlayer.current = new Player(
            this.playerConfig.x,
            this.playerConfig.y,
            this.playerConfig.nickname,
            this.playerConfig.classKey,
            this.playerConfig.color,
            // O Character agora usa o addCombatFeedback do GameLogic, que por sua vez usa o forceCombatFeedbackRender
            (text, x, y, type) => this.gameLogic.addCombatFeedbackToRef(text, x, y, type), // Passa a função do GameLogic
            this.localPlayerId
        );
        this.allPlayers.current.set(this.localPlayerId, this.localPlayer.current);

        let dummyPlaced = false;
        let attempts = 0;
        const maxDummyAttempts = 50;
        while (!dummyPlaced && attempts < maxDummyAttempts) {
            const dummyX = Math.floor(Math.random() * GRID_SIZE);
            const dummyY = Math.floor(Math.random() * GRID_SIZE);
            const dummyRect = { x: dummyX, y: dummyY, width: DUMMY_SIZE / CELL_SIZE, height: DUMMY_SIZE / CELL_SIZE };

            let collision = false;
            for (const obs of this.obstacles.current) {
                if (
                    dummyX < obs.x + obs.width &&
                    dummyX + dummyRect.width > obs.x &&
                    dummyY < obs.y + obs.height &&
                    dummyY + dummyRect.height > obs.y
                ) {
                    collision = true;
                    break;
                }
            }
            if (!collision && this.localPlayer.current) {
                const playerRect = { x: this.localPlayer.current.x, y: this.localPlayer.current.y, width: PLAYER_SIZE / CELL_SIZE, height: PLAYER_SIZE / CELL_SIZE };
                if (
                    dummyX < playerRect.x + playerRect.width &&
                    dummyX + dummyRect.width > playerRect.x &&
                    dummyY < playerRect.y + playerRect.height &&
                    dummyY + dummyRect.height > playerRect.y
                ) {
                    collision = true;
                    break;
                }
            }

            if (!collision) {
                // Passa a função addCombatFeedback do GameLogic para o Dummy
                this.dummy.current = new Dummy(dummyX, dummyY, (text, x, y, type) => this.gameLogic.addCombatFeedbackToRef(text, x, y, type));
                dummyPlaced = true;
            }
            attempts++;
        }
        if (!dummyPlaced) {
            console.warn("GameEngine: Não foi possível posicionar o Dummy após várias tentativas. Posicionando em fallback.");
            this.dummy.current = new Dummy(GRID_SIZE / 2, GRID_SIZE / 2 - 2, (text, x, y, type) => this.gameLogic.addCombatFeedbackToRef(text, x, y, type));
        }

        this.bots.current = [];
        // this.droppedItems.current = []; // Agora gerenciado via droppedItemsRef
        this.attackVisuals.current = [];
        this.projectiles.current = [];
        this.clickTarget.current = null;

        this.gameSync.initSync();

        this.gameActive = true;
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.gameLoop);

        if (this.onGameStateUpdate) {
            this.onGameStateUpdate();
        }
    }

    stopGame() {
        this.gameActive = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.gameSync.stopSync();
        this.localPlayer.current = null;
        this.allPlayers.current.clear();
        this.dummy.current = null;
        this.bots.current = [];
        this.droppedItemsRef.current = []; // Limpa o ref de itens dropados
        this.projectiles.current = [];
        this.attackVisuals.current = [];
        this.clickTarget.current = null;
        this.obstacles.current = [];
        console.log("GameEngine: Jogo parado e listeners limpos.");
    }

    gameLoop(currentTime) {
        if (!this.gameActive) return;

        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Passa mouseAngle para GameLogic
        this.gameLogic.update(deltaTime, this.mouseAngle.current);

        this.draw();

        this.gameSync.updateLocalPlayerStateInFirestore();

        if (this.onGameStateUpdate) {
            this.onGameStateUpdate();
        }

        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }

    draw() {
        this.gameDraw.clearCanvas();

        const mapWidth = GRID_SIZE * CELL_SIZE;
        const mapHeight = GRID_SIZE * CELL_SIZE;

        if (this.localPlayer.current) {
            this.cameraX = this.localPlayer.current.x * CELL_SIZE + CELL_SIZE / 2 - this.canvas.width / 2;
            this.cameraY = this.localPlayer.current.y * CELL_SIZE + CELL_SIZE / 2 - this.canvas.height / 2;
        }

        if (this.canvas.width >= mapWidth) {
            this.cameraX = -(this.canvas.width - mapWidth) / 2;
        } else {
            this.cameraX = Math.max(0, Math.min(mapWidth - this.canvas.width, this.cameraX));
        }

        if (this.canvas.height >= mapHeight) {
            this.cameraY = -(this.canvas.height - mapHeight) / 2;
        } else {
            this.cameraY = Math.max(0, Math.min(mapHeight - this.canvas.height, this.cameraY));
        }

        this.ctx.save();
        this.ctx.translate(-this.cameraX, -this.cameraY);

        this.gameDraw.drawGrid(GRID_SIZE);
        // NEW: Pass the droppedItemsRef.current to GameEngineDraw
        this.gameDraw.drawObstacles(this.obstacles.current);
        this.gameDraw.drawDroppedItems(this.droppedItemsRef.current, this.localPlayer.current); // Use the ref's current value

        this.allPlayers.current.forEach(player => {
            if (player.isAlive) {
                this.gameDraw.drawPlayer(player);
            }
        });

        if (this.dummy.current && this.dummy.current.isAlive) {
            this.gameDraw.drawDummy(this.dummy.current);
        }
        this.bots.current.forEach(bot => this.gameDraw.drawBot(bot));

        this.gameDraw.drawAttackVisuals(this.attackVisuals.current);
        this.gameDraw.drawProjectiles(this.projectiles.current);

        this.ctx.restore();
    }

    updatePlayerClass(newClassKey) {
        if (this.localPlayer.current) {
            this.localPlayer.current.setupWeaponsForClass(newClassKey);
            this.gameSync.updateLocalPlayerStateInFirestore();
            if (this.onGameStateUpdate) {
                this.onGameStateUpdate();
            }
        }
    }

    respawnPlayer(newClassKey) {
        if (this.localPlayer.current) {
            this.localPlayer.current.respawn(this.playerConfig.x, this.playerConfig.y, newClassKey);
            this.gameSync.updateLocalPlayerStateInFirestore();
            if (this.onGameStateUpdate) {
                this.onGameStateUpdate();
            }
        }
    }

    spawnBot() {
        this.gameLogic.spawnBot();
    }
}

