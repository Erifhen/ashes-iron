import { doc, setDoc, updateDoc, onSnapshot, deleteField, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { Player } from './entities/Player'; // Importa a classe Player
import { DroppedItem } from './entities/DroppedItem'; // Importa a classe DroppedItem
import { WEAPONS } from './constants/gameConstants'; // Importa WEAPONS para reconstruir o objeto arma

// Variável global para o ID do aplicativo
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export class GameSync {
    constructor(roomId, localPlayerId, allPlayersRef, localPlayerRef, addCombatFeedback, droppedItemsRef, db, auth) {
        this.roomId = roomId;
        this.localPlayerId = localPlayerId;
        this.allPlayersRef = allPlayersRef; // Referência ao Map de todos os jogadores
        this.localPlayerRef = localPlayerRef; // Referência ao jogador local
        this.addCombatFeedback = addCombatFeedback;
        this.droppedItemsRef = droppedItemsRef; // Referência ao array de itens dropados
        this.db = db; // Instância do Firestore
        this.auth = auth; // Instância do Auth
        this.unsubscribe = null; // Para guardar a função de unsubscribe do Firestore

        // Determina se o modo online está ativo
        this.isOnlineMode = !!roomId && !!localPlayerId && !!db && !!auth;

        if (this.isOnlineMode) {
            console.log("GameSync: Modo online ativado.");
        } else {
            console.log("GameSync: Modo offline (tutorial) ou parâmetros ausentes. Sincronização Firebase desativada.");
        }
    }

    initSync() {
        if (!this.isOnlineMode) {
            console.log("GameSync: Não inicializando sincronização Firebase em modo offline.");
            return;
        }

        const roomDocPath = `artifacts/${appId}/public/data/rooms/${this.roomId}`;
        const roomRef = doc(this.db, roomDocPath);

        // Adiciona o jogador local ao Firestore quando a sincronização inicia
        // Isso garante que o jogador aparece na sala para outros
        this.updateLocalPlayerStateInFirestore();

        // Sincroniza o estado da sala em tempo real
        this.unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                const roomData = docSnap.data();
                const playersData = roomData.players || {};
                const droppedItemsData = roomData.droppedItems || [];

                // Atualiza o mapa de todos os jogadores
                const newAllPlayersMap = new Map();
                for (const playerId in playersData) {
                    const playerData = playersData[playerId];
                    // Recria a instância do Player a partir dos dados do Firestore
                    const playerInstance = new Player(
                        playerData.x,
                        playerData.y,
                        playerData.name,
                        playerData.maxHealth,
                        playerData.speed,
                        playerData.classKey,
                        playerData.color,
                        this.addCombatFeedback,
                        playerData.isPlayer,
                        playerId // Passa o ID para a instância do Player
                    );
                    // Atualiza outros estados do playerInstance
                    playerInstance.health = playerData.health;
                    playerInstance.blockBar = playerData.blockBar;
                    playerInstance.arrows = playerData.arrows;
                    playerInstance.isAlive = playerData.isAlive;
                    playerInstance.direction = playerData.direction;
                    // Recria o objeto weapon completo a partir do nome
                    playerInstance.weapon = { ...WEAPONS[playerData.weaponName] };

                    newAllPlayersMap.set(playerId, playerInstance);
                }
                this.allPlayersRef.current = newAllPlayersMap; // Atualiza a ref

                // Atualiza o array de itens dropados
                this.droppedItemsRef.current = droppedItemsData.map(itemData =>
                    new DroppedItem(itemData.x, itemData.y, itemData.itemType, itemData.id)
                );

                // Se o jogador local não estiver mais na lista de jogadores (ex: foi desconectado por outro cliente),
                // você pode querer lidar com isso aqui (ex: voltar ao menu principal).
                if (this.localPlayerRef.current && !newAllPlayersMap.has(this.localPlayerId)) {
                    console.warn("Seu jogador foi removido da sala. Voltando ao menu principal.");
                    // Uma forma de fazer isso é chamando um callback passado pelo GameEngine
                    // ou fazendo com que o GameScreen observe o playerState.isAlive
                }

            } else {
                console.log("Sala não existe ou foi excluída. Voltando ao menu principal.");
                // Lidar com a sala sendo excluída (ex: voltar ao menu principal)
                // Isso pode ser feito através de um callback para o GameEngine e depois para o GameScreen
            }
        }, (error) => {
            console.error("Erro ao sincronizar sala:", error);
        });
        console.log("GameSync: Sincronização Firebase iniciada.");
    }

    stopSync() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            console.log("GameSync: Sincronização Firebase parada.");
        }
        // Limpar o jogador local do Firestore ao sair da sala
        if (this.isOnlineMode && this.localPlayerId && this.roomId) {
             const roomDocPath = `artifacts/${appId}/public/data/rooms/${this.roomId}`;
             const roomRef = doc(this.db, roomDocPath);
             updateDoc(roomRef, {
                [`players.${this.localPlayerId}`]: deleteField() // Firebase deleteField
             }).catch(e => console.error("Erro ao remover jogador do Firestore:", e));
        }
    }

    // Atualiza o estado do jogador local no Firestore
    updateLocalPlayerStateInFirestore() {
        if (!this.isOnlineMode || !this.localPlayerRef.current) return;

        const playerState = {
            id: this.localPlayerId, // Inclui o ID do jogador
            x: this.localPlayerRef.current.x,
            y: this.localPlayerRef.current.y,
            name: this.localPlayerRef.current.name,
            health: this.localPlayerRef.current.health,
            maxHealth: this.localPlayerRef.current.maxHealth,
            blockBar: this.localPlayerRef.current.blockBar,
            arrows: this.localPlayerRef.current.arrows,
            weaponName: this.localPlayerRef.current.weapon ? this.localPlayerRef.current.weapon.name : 'N/A',
            isAlive: this.localPlayerRef.current.isAlive,
            direction: this.localPlayerRef.current.direction, // Importante para o desenho correto
            classKey: this.localPlayerRef.current.classKey, // Adicione classKey
            color: this.localPlayerRef.current.color, // Adicione color
            isPlayer: this.localPlayerRef.current.isPlayer // Adicione isPlayer
        };
        const roomDocPath = `artifacts/${appId}/public/data/rooms/${this.roomId}`;
        const roomRef = doc(this.db, roomDocPath);
        updateDoc(roomRef, {
            [`players.${this.localPlayerId}`]: playerState
        }).catch(e => console.error("Erro ao atualizar estado do jogador no Firestore:", e));
    }

    // Método para adicionar um item dropado ao Firestore
    async addDroppedItemToFirestore(item) {
        if (!this.isOnlineMode) return;
        const roomDocPath = `artifacts/${appId}/public/data/rooms/${this.roomId}`;
        const roomRef = doc(this.db, roomDocPath);
        try {
            await updateDoc(roomRef, {
                droppedItems: arrayUnion({
                    id: item.id,
                    x: item.x,
                    y: item.y,
                    itemType: item.itemType
                })
            });
            console.log("Item dropado adicionado ao Firestore:", item.id);
        } catch (e) {
            console.error("Erro ao adicionar item dropado ao Firestore:", e);
        }
    }

    // Método para remover um item dropado do Firestore
    async removeDroppedItemFromFirestore(itemId) {
        if (!this.isOnlineMode) return;
        const roomDocPath = `artifacts/${appId}/public/data/rooms/${this.roomId}`;
        const roomRef = doc(this.db, roomDocPath);
        try {
            const docSnap = await getDoc(roomRef);
            if (docSnap.exists()) {
                const currentItems = docSnap.data().droppedItems || [];
                const updatedItems = currentItems.filter(item => item.id !== itemId);
                await updateDoc(roomRef, { droppedItems: updatedItems });
                console.log("Item dropado removido do Firestore:", itemId);
            }
        } catch (e) {
            console.error("Erro ao remover item dropado ao Firestore:", e);
        }
    }
}
