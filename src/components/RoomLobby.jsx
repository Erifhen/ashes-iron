import React, { useState, useEffect, useCallback } from 'react';
// Importa as funções do Firebase SDK
import { initializeApp, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, onSnapshot, runTransaction, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { CLASS_DEFAULT_WEAPONS } from '../game/constants/gameConstants';

// Variáveis globais fornecidas pelo ambiente Canvas
// Garante que estas variáveis são definidas, mesmo que o ambiente Canvas não as injete localmente.
const __app_id = typeof window !== 'undefined' && typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
const __firebase_config = typeof window !== 'undefined' && typeof window.__firebase_config !== 'undefined' ? window.__firebase_config : '{}';
const __initial_auth_token = typeof window !== 'undefined' && typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;


let firebaseConfig = {};
try {
    if (__firebase_config) { // Verifica se a string não está vazia
        firebaseConfig = JSON.parse(__firebase_config);
    }
} catch (e) {
    console.error("Erro ao parsear __firebase_config:", e);
    firebaseConfig = {}; // Fallback para um objeto vazio se o parsing falhar
}

// Adiciona um projectId de fallback se não for fornecido, para permitir a inicialização do Firebase
// Usando os dados do seu projeto Firebase real
if (!firebaseConfig.projectId) {
    console.warn("Firebase projectId não fornecido em __firebase_config. Usando seu projectId real de fallback. Funcionalidades de nuvem podem não funcionar se as regras de segurança não estiverem configuradas.");
    firebaseConfig.projectId = "ashes-eaf7b"; // SEU PROJECT ID REAL
    if (!firebaseConfig.apiKey) firebaseConfig.apiKey = "AIzaSyBz0ZVVFq51EsRMjqUMYr3tHjv8kBwmIDg"; // SUA API KEY REAL
    if (!firebaseConfig.appId) firebaseConfig.appId = "1:115060946573:web:your-app-id-hash"; // Exemplo de APP ID, se não tiver o seu exato, pode ser um placeholder para inicializar.
}


// Inicializa Firebase (garante que seja feito apenas uma vez por módulo)
let app;
let db;
let auth;

try {
    app = getApp(); // Tenta obter uma instância do app Firebase já inicializada
} catch (e) {
    app = initializeApp(firebaseConfig); // Se não houver, inicializa uma nova
}

db = getFirestore(app);
auth = getAuth(app);
console.log("Firebase inicializado com sucesso no RoomLobby.");


function RoomLobby({ onJoinGame, onBackToMenu }) {
    const [nickname, setNickname] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [selectedColor, setSelectedColor] = useState('#FF0000'); // Cor padrão: Vermelho
    const [selectedClass, setSelectedClass] = useState('espadachim'); // Classe padrão: Espadachim (CORRIGIDO: 'espada' para 'espadachim')
    const [currentRoomId, setCurrentRoomId] = useState(null);
    const [playersInRoom, setPlayersInRoom] = useState([]);
    const [isHost, setIsHost] = useState(false);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [currentHostId, setCurrentHostId] = useState(null); // NOVO ESTADO: Para armazenar o ID do host

    const playerColors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF']; // Cores disponíveis

    // Função para sair da sala (declarada com useCallback para ser estável e usada em outros handlers)
    const handleLeaveRoom = useCallback(async () => {
        if (!currentRoomId || !userId) return;

        const roomRef = doc(db, `artifacts/${__app_id}/public/data/rooms`, currentRoomId);
        const roomIdToLeave = currentRoomId; // Captura o ID da sala antes de resetar o estado local

        try {
            await runTransaction(db, async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                if (roomDoc.exists()) {
                    const roomData = roomDoc.data();
                    const updatedPlayers = roomData.players.filter(p => p.id !== userId);

                    if (updatedPlayers.length === 0) {
                        // Se não houver mais jogadores, exclui a sala
                        transaction.delete(roomRef);
                    } else {
                        transaction.update(roomRef, { players: updatedPlayers });
                        // Se o host sair, transfere a host para o próximo jogador ou exclui a sala
                        if (roomData.hostId === userId) {
                            const newHostId = updatedPlayers[0] ? updatedPlayers[0].id : null;
                            if (newHostId) {
                                transaction.update(roomRef, { hostId: newHostId });
                            }
                        }
                    }
                }
            });
            setCurrentRoomId(null);
            setPlayersInRoom([]);
            setIsHost(false);
            setCurrentHostId(null); // Limpa o host ID ao sair
            setErrorMessage('');
            onBackToMenu(); // Volta para o menu principal
            console.log(`Usuário ${userId} saiu da sala ${roomIdToLeave}`);
        } catch (e) {
            console.error("Erro ao sair da sala:", e);
            setErrorMessage("Erro ao sair da sala.");
        }
    }, [currentRoomId, userId, onBackToMenu]); // Dependências para useCallback

    useEffect(() => {
        // Autenticação Firebase
        const setupAuth = async () => {
            try {
                let currentFirebaseUser = auth.currentUser;

                if (__initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                } else if (!currentFirebaseUser) { // Se não houver usuário logado (e não há token Canvas)
                    // Tenta persistir o usuário anônimo no localStorage para testes em múltiplas abas
                    let storedUserId = localStorage.getItem('ashes_game_userId');
                    if (storedUserId) {
                        // Se já existe um userId salvo, o Firebase automaticamente tentará retomar a sessão
                        // associada a ele ao chamar signInAnonymously novamente, se a persistência estiver ativa.
                        await signInAnonymously(auth);
                    } else {
                        // Se não há userId salvo, faz o primeiro login anônimo e salva o UID
                        const userCredential = await signInAnonymously(auth);
                        localStorage.setItem('ashes_game_userId', userCredential.user.uid);
                    }
                }

                // O listener onAuthStateChanged é o mais confiável para obter o UID atual
                const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
                    if (user) {
                        setUserId(user.uid);
                        setIsAuthReady(true);
                        console.log("RoomLobby: Firebase Auth Ready. User ID:", user.uid);
                    } else {
                        console.log("RoomLobby: No user signed in.");
                        // Se o usuário deslogar, limpe o localStorage para evitar problemas
                        localStorage.removeItem('ashes_game_userId');
                        setUserId(null); // Garante que o userId seja null se não houver usuário
                        setIsAuthReady(false); // Marca como não pronto se não houver usuário
                    }
                });

                return () => unsubscribeAuth(); // Limpa o listener ao desmontar
            } catch (error) {
                console.error("RoomLobby: Erro na autenticação Firebase:", error);
                setErrorMessage("Erro de autenticação. Tente novamente.");
            }
        };

        // Garante que setupAuth seja chamado apenas uma vez
        if (auth && !isAuthReady && !userId) { // Adiciona !userId para evitar chamadas redundantes se o userId já estiver definido
            setupAuth();
        }
    }, [isAuthReady, userId]); // Adicionei userId às dependências para re-executar se userId mudar inesperadamente

    useEffect(() => {
        if (!currentRoomId || !isAuthReady || !userId) return; // Adicionado !userId para garantir que o listener só inicie com um userId válido

        const roomDocRef = doc(db, `artifacts/${__app_id}/public/data/rooms`, currentRoomId);
        const unsubscribeRoom = onSnapshot(roomDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const roomData = docSnap.data();
                setPlayersInRoom(roomData.players || []);
                setIsHost(roomData.hostId === userId); // Verifica se o host é o userId atual
                setCurrentHostId(roomData.hostId); // ATUALIZA O NOVO ESTADO COM O ID DO HOST

                if (roomData.gameStarted) {
                    // CORRIGIDO: Passa os dados do jogador atual do Firestore para onJoinGame
                    const currentPlayerData = (roomData.players || []).find(p => p.id === userId);
                    if (currentPlayerData) {
                        onJoinGame(currentRoomId, currentPlayerData.nickname, currentPlayerData.color, currentPlayerData.classKey); // CORRIGIDO: Usando .classKey e .color
                    } else {
                        console.error("RoomLobby: Current player data not found in roomData.players array when game started. Falling back to local state.");
                        // Fallback para o estado local se os dados do jogador não forem encontrados (não deve acontecer idealmente)
                        onJoinGame(currentRoomId, nickname, selectedColor, selectedClass);
                    }
                }
            } else {
                // Sala não existe mais, limpa o estado
                setErrorMessage('Sala não encontrada ou foi excluída.');
                setCurrentRoomId(null);
                setPlayersInRoom([]);
                setIsHost(false);
                setCurrentHostId(null); // Limpa o host ID
            }
        }, (error) => {
            console.error("Erro ao observar sala:", error);
            setErrorMessage("Erro ao carregar dados da sala.");
        });

        return () => {
            unsubscribeRoom();
        };
    }, [currentRoomId, userId, isAuthReady, nickname, selectedColor, selectedClass, onJoinGame]);

    const generateRoomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const handleCreateRoom = async () => {
        if (!userId || !isAuthReady) {
            setErrorMessage("Autenticando... Tente novamente em breve.");
            return;
        }
        if (!nickname.trim()) {
            setErrorMessage("Por favor, digite um Nickname.");
            return;
        }

        // Se já estiver em uma sala, saia dela primeiro
        if (currentRoomId) {
            await handleLeaveRoom(); // Usa a função useCallback
        }

        const newRoomId = generateRoomCode();
        const roomRef = doc(db, `artifacts/${__app_id}/public/data/rooms`, newRoomId);

        try {
            await runTransaction(db, async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                if (roomDoc.exists()) {
                    throw new Error("Código de sala já existe. Tentando novamente...");
                }

                transaction.set(roomRef, {
                    hostId: userId,
                    gameStarted: false,
                    players: [{ id: userId, nickname, color: selectedColor, classKey: selectedClass, health: 100, x: 0, y: 0 }], // CORRIGIDO: 'class' para 'classKey'
                    createdAt: Date.now(),
                    obstacles: [] // Placeholder for random obstacles
                });
            });

            setCurrentRoomId(newRoomId);
            setIsHost(true);
            setCurrentHostId(userId); // Define o host ID ao criar a sala
            setErrorMessage('');
            console.log("Sala criada com sucesso:", newRoomId);
        } catch (e) {
            console.error("Erro ao criar sala:", e);
            setErrorMessage(e.message || "Erro ao criar sala. Tente novamente.");
            // If room code exists, retry creating
            if (e.message.includes("Código de sala já existe")) {
                setTimeout(handleCreateRoom, 100); // Retry after a short delay
            }
        }
    };

    const handleJoinRoom = async () => {
        if (!userId || !isAuthReady) {
            setErrorMessage("Autenticando... Tente novamente em breve.");
            return;
        }
        if (!nickname.trim()) {
            setErrorMessage("Por favor, digite um Nickname.");
            return;
        }
        if (!roomCode.trim()) {
            setErrorMessage("Por favor, digite o Código da Sala.");
            return;
        }

        // Se já estiver em uma sala, saia dela primeiro
        if (currentRoomId) {
            await handleLeaveRoom(); // Usa a função useCallback
        }

        const roomRef = doc(db, `artifacts/${__app_id}/public/data/rooms`, roomCode.toUpperCase());

        try {
            await runTransaction(db, async (transaction) => {
                const roomDoc = await transaction.get(roomRef);
                if (!roomDoc.exists()) {
                    throw new Error("Sala não encontrada.");
                }
                const roomData = roomDoc.data();
                if (roomData.gameStarted) {
                    throw new Error("O jogo já começou nesta sala.");
                }

                const existingPlayers = roomData.players || [];
                const playerIndex = existingPlayers.findIndex(p => p.id === userId);

                if (playerIndex > -1) {
                    // Player já na sala, apenas atualiza suas informações
                    existingPlayers[playerIndex] = { ...existingPlayers[playerIndex], nickname, color: selectedColor, classKey: selectedClass }; // CORRIGIDO: 'class' para 'classKey'
                } else {
                    // Adiciona novo jogador
                    existingPlayers.push({ id: userId, nickname, color: selectedColor, classKey: selectedClass, health: 100, x: 0, y: 0 }); // CORRIGIDO: 'class' para 'classKey'
                }
                transaction.update(roomRef, { players: existingPlayers });
            });

            setCurrentRoomId(roomCode.toUpperCase());
            // isHost e currentHostId serão atualizados pelo onSnapshot
            setErrorMessage('');
            console.log("Entrou na sala com sucesso:", roomCode.toUpperCase());
        } catch (e) {
            console.error("Erro ao entrar na sala:", e);
            setErrorMessage(e.message || "Erro ao entrar na sala. Verifique o código.");
        }
    };

    const handleStartGame = async () => {
        if (!currentRoomId || !isHost) return;

        const roomRef = doc(db, `artifacts/${__app_id}/public/data/rooms`, currentRoomId);
        try {
            await updateDoc(roomRef, { gameStarted: true });
            // onJoinGame será chamado pelo listener do onSnapshot
        } catch (e) {
            console.error("Erro ao iniciar jogo:", e);
            setErrorMessage("Erro ao iniciar o jogo.");
        }
    };

    if (!isAuthReady) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-800 text-white">
                <p>Carregando autenticação...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-800 text-white p-4">
            <h1 className="text-4xl font-bold mb-8">Sala de Treinamento</h1>

            {currentRoomId ? (
                <div className="bg-gray-700 p-6 rounded-lg shadow-lg w-full max-w-md">
                    <h2 className="text-2xl font-semibold mb-4 text-center">Sala: {currentRoomId}</h2>
                    <p className="text-center mb-4">{isHost ? 'Você é o Host' : 'Aguardando o Host iniciar o jogo...'}</p>

                    <div className="mb-4">
                        <h3 className="text-xl font-medium mb-2">Jogadores na Sala:</h3>
                        <ul className="list-disc list-inside">
                            {playersInRoom.map(player => (
                                <li key={player.id} className="flex items-center mb-1">
                                    <span className="inline-block w-4 h-4 rounded-full mr-2" style={{ backgroundColor: player.color }}></span>
                                    {player.nickname} ({player.classKey}) {player.id === userId && '(Você)'} {player.id === currentHostId && '(Host)'} {/* CORRIGIDO AQUI: player.class para player.classKey */}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {isHost && (
                        <button onClick={handleStartGame} className="btn w-full mb-4 bg-green-600 hover:bg-green-700">
                            Iniciar Partida
                        </button>
                    )}
                    <button onClick={handleLeaveRoom} className="btn w-full bg-red-600 hover:bg-red-700">
                        Sair da Sala
                    </button>
                </div>
            ) : (
                <div className="bg-gray-700 p-6 rounded-lg shadow-lg w-full max-w-md">
                    <div className="mb-4">
                        <label htmlFor="nickname" className="block text-sm font-medium text-gray-300 mb-1">Nickname:</label>
                        <input
                            type="text"
                            id="nickname"
                            className="w-full p-2 rounded bg-gray-600 text-white border border-gray-500 focus:outline-none focus:border-blue-500"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Seu Nickname"
                            maxLength={15}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Cor do Quadrado:</label>
                        <div className="flex gap-2">
                            {playerColors.map(color => (
                                <div
                                    key={color}
                                    className={`w-8 h-8 rounded-full cursor-pointer border-2 ${selectedColor === color ? 'border-blue-500' : 'border-transparent'}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setSelectedColor(color)}
                                ></div>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-1">Classe:</label>
                        <select
                            className="w-full p-2 rounded bg-gray-600 text-white border border-gray-500 focus:outline-none focus:border-blue-500"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                        >
                            {Object.keys(CLASS_DEFAULT_WEAPONS).map(classKey => (
                                <option key={classKey} value={classKey}>{classKey.charAt(0).toUpperCase() + classKey.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    <button onClick={handleCreateRoom} className="btn w-full mb-4 bg-blue-600 hover:bg-blue-700">
                        Criar Sala
                    </button>

                    <div className="mb-4">
                        <label htmlFor="roomCode" className="block text-sm font-medium text-gray-300 mb-1">Código da Sala:</label>
                        <input
                            type="text"
                            id="roomCode"
                            className="w-full p-2 rounded bg-gray-600 text-white border border-gray-500 focus:outline-none focus:border-blue-500 uppercase"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            placeholder="Digite o código da sala"
                            maxLength={6}
                        />
                    </div>
                    <button onClick={handleJoinRoom} className="btn w-full bg-indigo-600 hover:bg-indigo-700">
                        Entrar na Sala
                    </button>

                    {errorMessage && (
                        <p className="text-red-400 text-center mt-4">{errorMessage}</p>
                    )}
                </div>
            )}
            <button onClick={onBackToMenu} className="btn absolute bottom-4 left-1/2 -translate-x-1/2" style={{ zIndex: 20 }}>
                Voltar ao Menu Principal
            </button>
        </div>
    );
}

export default RoomLobby;
