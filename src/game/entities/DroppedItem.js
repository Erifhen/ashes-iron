import { WEAPONS } from '../constants/gameConstants'; // Importa WEAPONS

export class DroppedItem {
    // CORREÇÃO: Construtor usa itemType, que pode ser uma chave de arma ou um tipo de item
    constructor(x, y, itemType, id = null) {
        this.id = id || crypto.randomUUID(); // ID único para o item
        this.x = x;
        this.y = y;
        this.itemType = itemType; // Ex: 'health_potion', 'arrow_bundle', 'sword', 'flecha'
        this.size = 0.5; // Tamanho relativo ao CELL_SIZE

        // Se o itemType for uma chave de arma, armazena a referência à arma
        this.weapon = WEAPONS[itemType] || null;
    }
}
