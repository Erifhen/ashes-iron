import React, { useState, useEffect } from 'react';
import MainMenu from './components/MainMenu';
import GameScreen from './components/GameScreen';
import RoomLobby from './components/RoomLobby';

import { initializeApp, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { SPAWN_POINTS, CLASS_DEFAULT_WEAPONS } from './game/constants/gameConstants';

const firebaseConfig = {
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'ashes-eaf7b',
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'fallback-api-key',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? 'fallback-app-id'
};

let app;
let db;
let auth;

try {
    app = getApp();
} catch (e) {
    app = initializeApp(firebaseConfig);
}

db = getFirestore(app);
auth = getAuth(app);
console.log("Firebase inicializado com sucesso via .env.");

function App() {
    const [currentScreen, setCurrentScreen] = useState('mainMenu');
    const [playerConfig, setPlayerConfig] = useState(null);
    const [roomId, setRoomId] = useState(null);
    const [userId, setUserId] = useState(null);
    const [tutorialClass, setTutorialClass] = useState('espadachim');

    useEffect(() => {
        const setupAuth = async () => {
            try {
                if (auth) {
                    const unsubscribe = onAuthStateChanged(auth, async (user) => {
                        if (user) {
                            setUserId(user.uid);
                            console.log("Firebase Auth pronto. User ID:", user.uid);
                        } else {
                            try {
                                await signInAnonymously(auth);
                                console.log("Signed in anonymously.");
                            } catch (error) {
                                console.error("Erro na autenticação Firebase:", error);
                            }
                        }
                    });
                    return () => unsubscribe();
                } else {
                    console.warn("Firebase Auth não inicializado.");
                }
            } catch (error) {
                console.error("Erro na configuração da autenticação:", error);
            }
        };

        setupAuth();
    }, []);

    const handleSelectTutorialMode = () => {
        const config = {
            nickname: 'Player',
            color: '#0000FF',
            classKey: tutorialClass,
            x: SPAWN_POINTS[0].x,
            y: SPAWN_POINTS[0].y
        };
        setPlayerConfig(config);
        console.log("Config tutorial:", config);
        setCurrentScreen('tutorial');
        setRoomId(null);
    };

    const handleUpdateTutorialClass = (newClass) => {
        setTutorialClass(newClass);
        setPlayerConfig(prevConfig => {
            const updatedConfig = {
                ...prevConfig,
                classKey: newClass
            };
            console.log("Tutorial class atualizado:", updatedConfig);
            return updatedConfig;
        });
    };

    const handleJoinRoomGame = (roomIdFromLobby, nickname, color, classKey) => {
        setRoomId(roomIdFromLobby);
        const config = {
            nickname,
            color,
            classKey,
            x: SPAWN_POINTS[0].x,
            y: SPAWN_POINTS[0].y
        };
        setPlayerConfig(config);
        console.log("Config online:", config);
        setCurrentScreen('game');
    };

    const handleBackToMenu = () => {
        setCurrentScreen('mainMenu');
        setPlayerConfig(null);
        setRoomId(null);
        setTutorialClass('espadachim');
    };

    const handleGoToRoomLobby = () => {
        setCurrentScreen('roomLobby');
    };

    const handleSelectCampaignMode = () => {
        console.log("Modo campanha selecionado (futuro).");
    };

    let content;
    switch (currentScreen) {
        case 'mainMenu':
            content = <MainMenu
                onSelectTutorial={handleSelectTutorialMode}
                onGoToRoomLobby={handleGoToRoomLobby}
                onSelectCampaign={handleSelectCampaignMode}
            />;
            break;
        case 'tutorial':
            content = <GameScreen
                playerConfig={playerConfig}
                onBackToMenu={handleBackToMenu}
                isTutorialMode={true}
                tutorialClass={tutorialClass}
                onUpdateTutorialClass={handleUpdateTutorialClass}
                roomId={null}
                userId={null}
                db={null}
                auth={null}
            />;
            break;
        case 'roomLobby':
            content = <RoomLobby onJoinGame={handleJoinRoomGame} onBackToMenu={handleBackToMenu} userId={userId} db={db} auth={auth} />;
            break;
        case 'game':
            if (userId && roomId && playerConfig && db && auth) {
                content = <GameScreen playerConfig={playerConfig} onBackToMenu={handleBackToMenu} roomId={roomId} userId={userId} db={db} auth={auth} />;
            } else {
                content = <div className="text-red-500">Carregando jogo online... (Aguardando User ID, Room ID ou Firebase)</div>;
            }
            break;
        default:
            content = <MainMenu onSelectTutorial={handleSelectTutorialMode} onGoToRoomLobby={handleGoToRoomLobby} onSelectCampaign={handleSelectCampaignMode} />;
    }

    return (
        <div className="game-container">
            {content}
        </div>
    );
}

export default App;

