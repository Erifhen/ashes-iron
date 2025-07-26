// src/components/PlayerHUD.js
import React from 'react';
import { CELL_SIZE, PLAYER_SIZE, WEAPONS } from '../game/constants/gameConstants';

function PlayerHUD({ character, cameraX, cameraY, throwingBarData, combatFeedbacks }) {
  // Não renderiza a HUD se o personagem não estiver vivo
  if (!character || !character.isAlive) {
    return null;
  }

  // Calcula a posição da HUD em relação ao canvas (coordenadas de tela)
  const barWidth = CELL_SIZE * 0.7; // Largura da barra
  const barHeight = 8; // Altura da barra

  // hudX e hudY representam o centro do personagem na tela
  const hudX = (character.x * CELL_SIZE + CELL_SIZE / 2) - cameraX;
  const hudY = (character.y * CELL_SIZE + CELL_SIZE / 2) - cameraY;

  // Offset vertical para posicionar a HUD acima da cabeça do personagem.
  // hudY (centro) - (PLAYER_SIZE / 2) (topo do corpo) - 40 (pixels acima do topo)
  const hudTopPosition = hudY - (PLAYER_SIZE / 2) - 40;

  // Garante que os valores de saúde e bloqueio são válidos para cálculo de porcentagem
  const healthPercentage = Math.max(0, (character.health / character.maxHealth) || 0);
  const blockPercentage = Math.max(0, (character.weapon?.blockValue && character.blockBar / character.weapon.blockValue) || 0); // Correção para blockValue 0 ou undefined

  let healthColor;
  if (healthPercentage > 0.6) healthColor = '#48bb78'; // Green
  else if (healthPercentage > 0.3) healthColor = '#ecc94b'; // Yellow
  else healthColor = '#f56565'; // Red

  // Posição para a barra de arremesso/carga
  const throwBarYOffset = -60; // Posição acima da HUD principal

  return (
    <div
      className="absolute"
      style={{
        // Posiciona o centro da HUD no centro do personagem no canvas
        left: `${hudX - barWidth / 2}px`, // Centraliza horizontalmente a barra
        top: `${hudTopPosition}px`,       // Posiciona verticalmente acima do personagem
        pointerEvents: 'none', // Garante que a HUD não bloqueie cliques no jogo
        textAlign: 'center',
        width: `${barWidth}px`,
        zIndex: 10, // Z-index para garantir que a HUD esteja acima do canvas
      }}
    >
      {/* Nome do Personagem */}
      <div className="text-white text-sm font-bold mb-1" style={{ position: 'relative', top: '-10px' }}>
        {character.name}
      </div>

      {/* NEW: Nome da Arma Equipada (Ajuste de estilo para evitar barra aleatória) */}
      {character.isPlayer && character.weaponName && (
        <div className="text-gray-300 text-xs" style={{ position: 'relative', top: '-10px' }}> {/* Removido mt-1, ajustado top */}
          Arma: {character.weaponName}
        </div>
      )}

      {/* Barra de Vida */}
      <div className="bg-gray-700 rounded-sm" style={{ width: `${barWidth}px`, height: `${barHeight}px`, marginBottom: '3px' }}>
        <div className="h-full rounded-sm" style={{ width: `${healthPercentage * 100}%`, backgroundColor: healthColor }}></div>
      </div>

      {/* Barra de Bloqueio */}
      {character.weapon && character.weapon.blockValue > 0 && (
        <div className="bg-gray-700 rounded-sm" style={{ width: `${barWidth}px`, height: `${barHeight}px` }}>
          <div className="h-full rounded-sm bg-blue-400" style={{ width: `${blockPercentage * 100}%` }}></div>
        </div>
      )}

      {/* Contador de Flechas (apenas para o jogador com arco) */}
      {character.isPlayer && character.weapon && character.weapon.name === WEAPONS.bowAndArrow.name && character.arrows !== undefined && (
        <div className="text-gray-400 text-xs mt-1" style={{ position: 'relative', top: '10px' }}>
          Flechas: {character.arrows}
        </div>
      )}

      {/* Barra de Força de Arremesso/Carga de Arco */}
      {throwingBarData && throwingBarData.show && (
        <div
          className="bg-gray-700 rounded-sm absolute"
          style={{
            width: `${barWidth}px`,
            height: `${barHeight}px`,
            left: '0', // Centraliza em relação ao container pai
            top: `${throwBarYOffset}px`,
            transform: 'translateX(0%)', // Garante alinhamento
            border: '1px solid white' // Adiciona uma borda para destaque
          }}
        >
          <div
            className="h-full rounded-sm bg-yellow-500"
            style={{ width: `${throwingBarData.progress * 100}%` }}
          ></div>
        </div>
      )}

      {/* Feedbacks de Combate Flutuantes */}
      {combatFeedbacks && combatFeedbacks.map((feedback) => (
        <div
          key={feedback.id}
          className="absolute text-shadow"
          style={{
            fontSize: `${feedback.fontSize}px`,
            color: feedback.color,
            // Ajuste para centralizar o texto horizontalmente e aplicar o deslocamento vertical
            left: `${(feedback.x * CELL_SIZE + CELL_SIZE / 2) - cameraX}px`,
            top: `${(feedback.y * CELL_SIZE + CELL_SIZE / 2) - cameraY}px`,
            transform: `translateX(-50%) translateY(${feedback.offsetY}px)`, // Usa offsetY para flutuar
            opacity: feedback.opacity,
            transition: 'opacity 0.1s ease-out, transform 0.1s ease-out', // Transição suave
            whiteSpace: 'nowrap',
            fontWeight: 'bold',
            zIndex: 11 // Acima de outras HUDs
          }}
        >
          {feedback.text}
        </div>
      ))}
    </div>
  );
}

export default PlayerHUD;
