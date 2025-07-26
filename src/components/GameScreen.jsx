// src/components/GameScreen.js
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../game/GameEngine';
import { CELL_SIZE, PLAYER_SIZE, CLASS_DEFAULT_WEAPONS, WEAPONS } from '../game/constants/gameConstants';
import PlayerHUD from './PlayerHUD';

// Componente GameScreen
function GameScreen({ roomId, userId, playerConfig, onBackToMenu, isTutorialMode, tutorialClass, onUpdateTutorialClass, db, auth }) {
    const canvasRef = useRef(null);
    const gameEngineRef = useRef(null);
    const [playerState, setPlayerState] = useState(null);
    const [bots, setBots] = useState([]);

    const combatFeedbacksRef = useRef([]);
    const [combatFeedbackUpdateTrigger, setCombatFeedbackUpdateTrigger] = useState(0);

    // NEW: Ref for dropped items (GameEngine will directly manipulate this)
    const droppedItemsRef = useRef([]);
    // NEW: State to trigger re-render when droppedItemsRef.current changes
    const [droppedItemsUpdateTrigger, setDroppedItemsUpdateTrigger] = useState(0);


    const [throwingBarData, setThrowingBarData] = useState({ show: false, progress: 0, x: 0, y: 0 });

    const [showRespawnModal, setShowRespawnModal] = useState(false);
    const [respawnClass, setRespawnClass] = useState('espadachim');

    // Callback para atualizar a barra de arremesso
    const updateThrowingBar = useCallback((show, progress, x, y) => {
        setThrowingBarData({ show, progress, x, y });
    }, []);

    // Callback to force re-render of combat feedbacks
    const forceCombatFeedbackRender = useCallback(() => {
        setCombatFeedbackUpdateTrigger(prev => prev + 1);
    }, []);

    // NEW: Callback to force re-render of dropped items
    const forceDroppedItemsRender = useCallback(() => {
        setDroppedItemsUpdateTrigger(prev => prev + 1);
    }, []);

    // Efeito principal para inicializar e limpar o GameEngine
    useEffect(() => {
        console.log('GameScreen: useEffect running');
        const canvas = canvasRef.current;
        if (!canvas) {
            console.log('GameScreen: Canvas ref is null, returning');
            return;
        }

        const shouldInitializeGameEngine = isTutorialMode || (!isTutorialMode && roomId && userId && db && auth);

        if (!shouldInitializeGameEngine) {
            console.log('GameScreen: Aguardando condições para criar GameEngine (modo online: roomId, userId, db, auth; modo tutorial: isTutorialMode true).');
            return;
        }

        if (!gameEngineRef.current) {
            // Pass combatFeedbacksRef, updateThrowingBar, forceCombatFeedbackRender, and NEW: droppedItemsRef, forceDroppedItemsRender
            gameEngineRef.current = new GameEngine(
                canvas, roomId, userId, playerConfig,
                combatFeedbacksRef, updateThrowingBar, forceCombatFeedbackRender,
                droppedItemsRef, forceDroppedItemsRender, // NEW: Pass dropped items ref and its force render callback
                db, auth
            );
            console.log('GameScreen: GameEngine instance created.');
        }

        const engine = gameEngineRef.current;

        const updateUIState = () => {
            if (engine && engine.localPlayer.current) {
                setPlayerState({
                    id: engine.localPlayerId,
                    name: engine.localPlayer.current.name,
                    health: engine.localPlayer.current.health,
                    maxHealth: engine.localPlayer.current.maxHealth,
                    blockBar: engine.localPlayer.current.blockBar,
                    blockValue: engine.localPlayer.current.weapon && typeof engine.localPlayer.current.weapon.blockValue === 'number'
                        ? engine.localPlayer.current.weapon.blockValue
                        : 0,
                    x: engine.localPlayer.current.x,
                    y: engine.localPlayer.current.y,
                    arrows: engine.localPlayer.current.arrows,
                    weaponName: engine.localPlayer.current.weapon && engine.localPlayer.current.weapon.name
                        ? engine.localPlayer.current.weapon.name
                        : 'N/A',
                    isPlayer: engine.localPlayer.current.isPlayer,
                    isAlive: engine.localPlayer.current.isAlive,
                    cameraX: engine.cameraX,
                    cameraY: engine.cameraY,
                    direction: engine.localPlayer.current.direction,
                    color: engine.localPlayer.current.color,
                });

                setBots(engine.bots.current.map(bot => ({
                    id: bot.id,
                    name: bot.name,
                    health: bot.health,
                    maxHealth: bot.maxHealth,
                    blockBar: bot.blockBar,
                    blockValue: bot.weapon && typeof bot.weapon.blockValue === 'number'
                        ? bot.weapon.blockValue
                        : 0,
                    x: bot.x,
                    y: bot.y,
                    showHUD: bot.showHUD,
                    isAlive: bot.isAlive,
                    cameraX: engine.cameraX,
                    cameraY: engine.cameraY,
                    direction: bot.direction,
                    color: bot.color,
                })));

                if (engine.localPlayer.current.health <= 0 && !showRespawnModal) {
                    setShowRespawnModal(true);
                }
            }
        };

        engine.onGameStateUpdate = updateUIState;

        if (isTutorialMode) {
            engine.updatePlayerClass(tutorialClass);
        }

        engine.initGame();
        console.log('GameScreen: GameEngine initialized and initGame called');

        if (engine.handleKeyDown) document.addEventListener('keydown', engine.handleKeyDown);
        if (engine.handleKeyUp) document.addEventListener('keyup', engine.handleKeyUp);
        if (engine.handleMouseMove) canvas.addEventListener('mousemove', engine.handleMouseMove);
        if (engine.handleMouseDown) canvas.addEventListener('mousedown', (e) => engine.handleMouseDown(e, engine.cameraX, engine.cameraY, CELL_SIZE)); // Pass camera position
        if (engine.handleMouseUp) canvas.addEventListener('mouseup', engine.handleMouseUp);
        if (engine.handleContextMenu) canvas.addEventListener('contextmenu', engine.handleContextMenu);
        console.log('GameScreen: Event listeners attached');

        return () => {
            console.log('GameScreen: Cleanup running');
            if (engine) {
                if (engine.handleKeyDown) document.removeEventListener('keydown', engine.handleKeyDown);
                if (engine.handleKeyUp) document.removeEventListener('keyup', engine.handleKeyUp);
                if (engine.handleMouseMove) canvas.removeEventListener('mousemove', engine.handleMouseMove);
                if (engine.handleMouseDown) canvas.removeEventListener('mousedown', (e) => engine.handleMouseDown(e, engine.cameraX, engine.cameraY, CELL_SIZE));
                if (engine.handleMouseUp) canvas.removeEventListener('mouseup', engine.handleMouseUp);
                if (engine.handleContextMenu) canvas.removeEventListener('contextmenu', engine.handleContextMenu);
                engine.stopGame();
                console.log('GameScreen: Event listeners removed and game stopped');
            }
            gameEngineRef.current = null;
        };
    }, [roomId, userId, playerConfig, updateThrowingBar, isTutorialMode, tutorialClass, onUpdateTutorialClass, showRespawnModal, db, auth, forceCombatFeedbackRender, forceDroppedItemsRender]);

    const handleClassChange = (e) => {
        const newClassKey = e.target.value;
        if (onUpdateTutorialClass) {
            onUpdateTutorialClass(newClassKey);
        }
        if (gameEngineRef.current) {
            gameEngineRef.current.updatePlayerClass(newClassKey);
        }
    };

    const handleRespawn = () => {
        if (gameEngineRef.current) {
            gameEngineRef.current.respawnPlayer(respawnClass);
            setShowRespawnModal(false);
        }
    };

    return (
        <div className="game-ui-container">
            <canvas id="gameCanvas" ref={canvasRef}></canvas>

            {/* HUD do Jogador Local */}
            {playerState && (
                <PlayerHUD
                    character={playerState}
                    cameraX={playerState.cameraX}
                    cameraY={playerState.cameraY}
                    isLocalPlayer={true}
                    throwingBarData={throwingBarData}
                    combatFeedbacks={combatFeedbacksRef.current} // Pass the current value of the ref
                />
            )}

            {/* HUD de Outros Jogadores (Remotos) */}
            {playerState && gameEngineRef.current && Array.from(gameEngineRef.current.allPlayers.current.values())
                .filter(p => p.id !== playerState.id)
                .map(otherPlayer => (
                    otherPlayer.isAlive && (
                        <PlayerHUD
                            key={otherPlayer.id}
                            character={otherPlayer}
                            cameraX={playerState.cameraX}
                            cameraY={playerState.cameraY}
                            isLocalPlayer={false}
                        />
                    )
                ))}

            {/* HUD de Bots */}
            {bots.map(bot => (
                bot.showHUD && (
                    <PlayerHUD
                        key={bot.id}
                        character={bot}
                        cameraX={playerState ? playerState.cameraX : 0}
                        cameraY={playerState ? playerState.cameraY : 0}
                        isLocalPlayer={false}
                    />
                )
            ))}

            <button
                id="spawnBotBtn"
                className="btn absolute bottom-4 left-1/2 -translate-x-1/2"
                onClick={() => gameEngineRef.current && gameEngineRef.current.spawnBot()}
            >
                Spawnar Bot
            </button>
            <button
                id="backToMenuBtn"
                className="btn absolute top-4 left-4"
                onClick={onBackToMenu}
            >
                Voltar ao Menu Principal
            </button>

            {isTutorialMode && (
                <div className="class-selection-bar">
                    <label htmlFor="tutorial-class-select" className="block text-sm font-medium text-gray-300 mb-1">Classe:</label>
                    <select
                        id="tutorial-class-select"
                        className="p-2 rounded bg-gray-600 text-white border border-gray-500 focus:outline-none focus:border-blue-500"
                        value={tutorialClass}
                        onChange={handleClassChange}
                    >
                        {Object.keys(CLASS_DEFAULT_WEAPONS).map(classKey => (
                            <option key={classKey} value={classKey}>
                                {classKey.charAt(0).toUpperCase() + classKey.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {showRespawnModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 className="text-3xl font-extrabold mb-5 text-red-400">Você Morreu!</h2>
                        <p className="mb-6 text-lg">Escolha sua próxima classe:</p>
                        <select
                            className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                            value={respawnClass}
                            onChange={(e) => setRespawnClass(e.target.value)}
                        >
                            {Object.keys(CLASS_DEFAULT_WEAPONS).map(classKey => (
                                <option key={classKey} value={classKey}>
                                    {classKey.charAt(0).toUpperCase() + classKey.slice(1)}
                                </option>
                            ))}
                        </select>
                        <div className="modal-buttons">
                            <button
                                onClick={handleRespawn}
                                className="btn"
                                >
                                Respawnar
                            </button>
                            <button
                                onClick={onBackToMenu}
                                className="btn"
                            >
                                Sair da Sala
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GameScreen;
