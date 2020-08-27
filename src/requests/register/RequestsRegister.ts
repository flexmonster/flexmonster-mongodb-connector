import {IRegister} from './IRegister';
import { IApiRequest } from '../apiRequests/IApiRequest';

type Request = RequestsRegisterElement<IApiRequest>;

export class RequestsRegister implements IRegister<string, IApiRequest> {    
    
    private static _requestRegisterInstance: RequestsRegister = null;

    private _storage: Map<string, Request> = null;
    private _capacity: number = 0;
    private readonly _delay: number = 5 * 60 * 60 * 1000;
    private readonly _startingCapacity = 500;
    
    constructor() {
        if (RequestsRegister._requestRegisterInstance != null) throw new Error("Initialization failed: "+
        "use Singleton.getInstance() instead of new.");

        this._storage = new Map();
        this._capacity = this._startingCapacity;
        RequestsRegister._requestRegisterInstance = this;
    }

    public static getInstance(): RequestsRegister {
        if (RequestsRegister._requestRegisterInstance == null) {
            RequestsRegister._requestRegisterInstance = new RequestsRegister();
        }
        return RequestsRegister._requestRegisterInstance;
    }

    addItem(key: string, item: IApiRequest): void {
        if (item == null || key == null) throw new Error("Illegal argument exception");

        this._storage.set(key, {element: item, lastProcessed: new Date().getTime()});

        if (this._storage.size == this._capacity) {
            this.clearOutdated();
            this.changeCapacity(this._capacity * 2);
        }  
    }    
    
    hasItem(key: string): boolean {
        if (key == null) throw new Error("Illegal argument exception");
        return this._storage.has(key);
    }

    getItem(key: string): IApiRequest {
        if (key == null) throw new Error("Illegal argument exception");
        return this._storage.get(key).element;
    }

    deleteItem(key: string): IApiRequest {
        if (key == null) throw new Error("Illegal argument exception");

        let apiRequest: IApiRequest = null;
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
        const keysForDelete: string[] = [];
        const currentTime: number = new Date().getTime();

        this._storage.forEach((value: Request, key: string, map: Map<String, Request>) => {
            if (currentTime - value.lastProcessed > this._delay) {
                keysForDelete.push(key);
            }
        });

        keysForDelete.forEach((value: string) => {
            this._storage.delete(value);
        });
    }

    private changeCapacity(value: number): void {
        this._capacity = value;
    }
}

interface RequestsRegisterElement<Element> {
    element: Element;
    lastProcessed: number;
}