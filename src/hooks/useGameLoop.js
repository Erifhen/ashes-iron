// src/hooks/useGameLoop.js
import { useEffect, useRef } from 'react';

/**
 * Hook para gerenciar o loop de animação do jogo.
 * @param {function} updateCallback - Função a ser chamada em cada frame para atualizar o estado do jogo.
 * @param {function} drawCallback - Função a ser chamada em cada frame para desenhar o jogo.
 * @param {boolean} isPaused - Se o loop deve ser pausado.
 */
export const useGameLoop = (updateCallback, drawCallback, isPaused = false) => {
  const animationFrameId = useRef(null);
  const lastTime = useRef(0);

  const gameLoop = (currentTime) => {
    if (isPaused) {
      animationFrameId.current = null;
      return;
    }

    const deltaTime = (currentTime - lastTime.current) / 1000; // em segundos
    lastTime.current = currentTime;

    updateCallback(deltaTime);
    drawCallback();

    animationFrameId.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    if (!isPaused) {
      lastTime.current = performance.now(); // Reseta o tempo ao iniciar/despausar
      animationFrameId.current = requestAnimationFrame(gameLoop);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPaused, updateCallback, drawCallback]); // Dependências do hook
};
