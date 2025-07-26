// src/game/GameEngineDraw.js
// Este arquivo é responsável por toda a lógica de desenho no canvas.

import { CELL_SIZE, PLAYER_SIZE, DUMMY_SIZE, BOT_SIZE, OBSTACLE_SIZE, WEAPONS } from './constants/gameConstants';

export class GameEngineDraw {
    constructor(ctx, canvas) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.resizeCanvas(); // Chama resize inicial
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // Limpa o canvas
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#222'; // Cor de fundo do jogo
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Desenha a grade do mapa
    drawGrid(GRID_SIZE) {
        this.ctx.strokeStyle = '#4a5568';
        for (let i = 0; i <= GRID_SIZE; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * CELL_SIZE, 0);
            this.ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * CELL_SIZE);
            this.ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
            this.ctx.stroke();
        }
    }

    // Desenha os obstáculos
    drawObstacles(obstacles) {
        this.ctx.fillStyle = '#5a67d8';
        obstacles.forEach(obs => {
            this.ctx.fillRect(obs.x * CELL_SIZE, obs.y * CELL_SIZE, OBSTACLE_SIZE, OBSTACLE_SIZE);
        });
    }

    // Desenha os itens dropados
    drawDroppedItems(droppedItems, localPlayer) {
        // NEW: Ensure droppedItems is an array before iterating
        if (!Array.isArray(droppedItems)) {
            console.warn("GameEngineDraw: droppedItems is not an array.", droppedItems);
            return;
        }

        droppedItems.forEach(item => {
            // Desenha o retângulo base do item
            this.ctx.fillStyle = '#a0aec0'; // Cor base do item
            this.ctx.fillRect(item.x * CELL_SIZE + CELL_SIZE * 0.2, item.y * CELL_SIZE + CELL_SIZE * 0.2, CELL_SIZE * 0.6, CELL_SIZE * 0.6);

            // Adiciona o nome do item
            const itemName = WEAPONS[item.itemType]?.name || item.itemType; // Pega o nome da arma ou o tipo se não for uma arma conhecida
            this.ctx.save();
            this.ctx.font = 'bold 12px Inter';
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#e2e8f0'; // Cor do texto
            this.ctx.fillText(itemName.toUpperCase(), item.x * CELL_SIZE + CELL_SIZE / 2, item.y * CELL_SIZE + CELL_SIZE - 5);
            this.ctx.restore();


            // Lógica de "PEGAR" e borda verde apenas para o jogador local
            if (localPlayer && localPlayer.isAlive) {
                const distanceToPlayer = Math.sqrt(Math.pow(localPlayer.x - item.x, 2) + Math.pow(localPlayer.y - item.y, 2));
                if (distanceToPlayer <= 0.8) { // Ajustado para ser mais sensível à proximidade
                    this.ctx.save();
                    this.ctx.font = 'bold 14px Inter';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'bottom';
                    this.ctx.fillStyle = '#48bb78'; // Cor verde para "PEGAR"
                    this.ctx.fillText('PEGAR (E)', item.x * CELL_SIZE + CELL_SIZE / 2, item.y * CELL_SIZE - 5);
                    this.ctx.restore();

                    this.ctx.strokeStyle = '#48bb78';
                    this.ctx.lineWidth = 3;
                    this.ctx.strokeRect(item.x * CELL_SIZE + CELL_SIZE * 0.2, item.y * CELL_SIZE + CELL_SIZE * 0.2, CELL_SIZE * 0.6, CELL_SIZE * 0.6);
                    this.ctx.lineWidth = 1;
                }
            }
        });
    }

    // Desenha o dummy
    drawDummy(dummy) {
        if (dummy && dummy.isAlive) {
            this.ctx.fillStyle = '#718096';
            this.ctx.fillRect(dummy.x * CELL_SIZE + (CELL_SIZE - DUMMY_SIZE) / 2, dummy.y * CELL_SIZE + (CELL_SIZE - DUMMY_SIZE) / 2, DUMMY_SIZE, DUMMY_SIZE);
        }
    }

    // Desenha o bot (agora aceita um único bot, a iteração é no GameEngine)
    drawBot(bot) {
        if (bot && bot.isAlive) {
            this.ctx.fillStyle = bot.color;
            this.ctx.fillRect(bot.x * CELL_SIZE + (CELL_SIZE - BOT_SIZE) / 2, bot.y * CELL_SIZE + (CELL_SIZE - BOT_SIZE) / 2, BOT_SIZE, BOT_SIZE);
        }
    }

    // Desenha um jogador (pode ser local ou remoto)
    drawPlayer(player) {
        if (!player.isAlive) return;

        // Debug log for player color
        // console.log(`GameEngineDraw: Drawing player ${player.name} (${player.id}) with color: ${player.color}`); // Keep this for debugging if color issue persists

        this.ctx.fillStyle = player.color;
        this.ctx.fillRect(player.x * CELL_SIZE + (CELL_SIZE - PLAYER_SIZE) / 2, player.y * CELL_SIZE + (CELL_SIZE - PLAYER_SIZE) / 2, PLAYER_SIZE, PLAYER_SIZE);

        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(player.x * CELL_SIZE + CELL_SIZE / 2, player.y * CELL_SIZE + CELL_SIZE / 2);
        this.ctx.lineTo(player.x * CELL_SIZE + CELL_SIZE / 2 + player.direction.x * PLAYER_SIZE / 2,
                         player.y * CELL_SIZE + CELL_SIZE / 2 + player.direction.y * PLAYER_SIZE / 2);
        this.ctx.stroke();
        this.ctx.lineWidth = 1;

        // Desenha armas/flechas presas
        if (player.attachedWeapons && player.attachedWeapons.length > 0) {
            this.drawAttachedWeapons(player);
        }
    }

    // Novo: Desenha armas (incluindo flechas) presas no personagem
    drawAttachedWeapons(player) {
        const itemSize = CELL_SIZE * 0.2; // Tamanho base para itens presos
        const playerCenterPxX = player.x * CELL_SIZE + CELL_SIZE / 2;
        const playerCenterPxY = player.y * CELL_SIZE + CELL_SIZE / 2;
        const maxOffset = PLAYER_SIZE * 0.3; // Offset máximo do centro do jogador

        player.attachedWeapons.forEach((weaponKey, index) => {
            this.ctx.save();

            // Posição pseudo-aleatória ao redor do personagem para cada item
            const angle = (index * (Math.PI / 3)) + (player.id.charCodeAt(0) * 0.1); // Usar index e ID para posições mais consistentes
            const offsetX = Math.cos(angle) * maxOffset;
            const offsetY = Math.sin(angle) * maxOffset;

            this.ctx.translate(playerCenterPxX + offsetX, playerCenterPxY + offsetY);
            this.ctx.rotate(angle + Math.PI / 2); // Gira o item para ficar mais "preso"

            const isArrow = weaponKey === 'arrow';
            this.ctx.fillStyle = isArrow ? '#a0aec0' : '#d69e2e'; // Cinza para flecha, laranja para arma

            // Desenha um retângulo simples para representar a arma/flecha
            this.ctx.fillRect(-itemSize / 2, -itemSize / 2, isArrow ? itemSize * 1.5 : itemSize * 2, itemSize);

            this.ctx.restore();
        });
    }

    // Desenha os visuais de ataque (retângulos de área de golpe)
    drawAttackVisuals(attackVisuals) {
        attackVisuals.forEach(visual => {
            this.ctx.save();
            // Move o ponto de origem para o centro do personagem atacante
            this.ctx.translate(visual.x * CELL_SIZE + CELL_SIZE / 2, visual.y * CELL_SIZE + CELL_SIZE / 2);
            // Gira para a direção do ataque
            this.ctx.rotate(visual.angle);

            // Define a cor com base no 'life' do visual para um efeito de fade out
            this.ctx.fillStyle = `rgba(128, 128, 128, ${visual.life * 2})`; // Cinza, com opacidade que diminui (multiplicado por 2 para um fade mais rápido/visível)

            // Desenha um retângulo que se estende da origem na direção do ataque
            // Começa um pouco à frente do corpo do jogador e se estende pelo alcance da arma
            const rectWidth = visual.range * CELL_SIZE; // Largura é o alcance da arma
            const rectHeight = PLAYER_SIZE * 0.6; // Altura pode ser 60% do tamanho do jogador
            const rectOffset = PLAYER_SIZE * 0.2; // Começa um pouco à frente do corpo do jogador

            this.ctx.fillRect(rectOffset, -rectHeight / 2, rectWidth, rectHeight);

            this.ctx.restore();
        });
    }

    // Desenha os projéteis
    drawProjectiles(projectiles) {
        projectiles.forEach(p => {
            this.ctx.fillStyle = p.isArrow ? '#a0aec0' : '#d69e2e'; // Cinza para flecha, laranja para arma arremessável
            this.ctx.beginPath();
            this.ctx.arc(p.x * CELL_SIZE + CELL_SIZE / 2, p.y * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE * 0.1, 0, Math.PI * 2); // Raio pequeno
            this.ctx.fill();
        });
    }
}
