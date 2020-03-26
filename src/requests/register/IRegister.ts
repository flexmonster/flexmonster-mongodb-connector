export interface IRegister<Key, Item> {

    addItem(key: Key, item: Item): void;
    hasItem(key: Key): boolean;
    getItem(key: Key): Item;
    deleteItem(key: Key): Item;
    isEmpty(): boolean;
}