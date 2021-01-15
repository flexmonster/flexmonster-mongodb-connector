import {IRegister} from './IRegister';
//import { Verify } from 'crypto';

export class Register<Key, Value> implements IRegister<Key, Value> {    
    
    //private static _requestRegisterInstance: any = null;

    private _storage: Map<Key, RequestsRegisterElement<Value>> = null;
    private _capacity: number = 0;
    private readonly _delay: number = 5 * 60 * 60 * 1000;
    private readonly _startingCapacity = 500;
    
    constructor() {
        // if (RequestsRegister._requestRegisterInstance != null) throw new Error("Initialization failed: "+
        // "use Singleton.getInstance() instead of new.");

        this._storage = new Map();
        this._capacity = this._startingCapacity;
        //RequestsRegister._requestRegisterInstance = this;
    }

    // public static getInstance(): RequestsRegister<Key, Value> {
    //     if (RequestsRegister._requestRegisterInstance == null) {
    //         RequestsRegister._requestRegisterInstance = new RequestsRegister();
    //     }
    //     return RequestsRegister._requestRegisterInstance;
    // }

    addItem(key: Key, item: Value): void {
        if (item == null || key == null) throw new Error("Illegal argument exception");

        this._storage.set(key, {element: item, lastProcessed: new Date().getTime()});

        if (this._storage.size == this._capacity) {
            this.clearOutdated();
            this.changeCapacity(this._capacity * 2);
        }  
    }    
    
    hasItem(key: Key): boolean {
        if (key == null) throw new Error("Illegal argument exception");
        return this._storage.has(key);
    }

    getItem(key: Key): Value {
        if (key == null) throw new Error("Illegal argument exception");
        return this._storage.get(key).element;
    }

    deleteItem(key: Key): Value {
        if (key == null) throw new Error("Illegal argument exception");

        let apiRequest: Value = null;
        if (this._storage.has(key)) {//hash calculation?
            apiRequest = this._storage.get(key).element;
            this._storage.delete(key);
        }

        if (this._storage.size < this._capacity / 4) {
            this.clearOutdated();
            const newCapacity: number = (this._capacity / 4 < this._startingCapacity) ? this._startingCapacity : this._capacity / 4;
            this.changeCapacity(newCapacity);
        }

        return apiRequest;
    }

    isEmpty(): boolean {
        return this._storage.size == 0;
    }

    private clearOutdated(): void {
        const keysForDelete: Key[] = [];
        const currentTime: number = new Date().getTime();

        this._storage.forEach((value: RequestsRegisterElement<Value>, key: Key, map: Map<Key, RequestsRegisterElement<Value>>) => {
            if (currentTime - value.lastProcessed > this._delay) {
                keysForDelete.push(key);
            }
        });

        keysForDelete.forEach((value: Key) => {
            this._storage.delete(value);
        });
    }

    private changeCapacity(value: number): void {
        this._capacity = value;
    }
}

// interface 

interface RequestsRegisterElement<Element> {
    element: Element;
    lastProcessed: number;
}