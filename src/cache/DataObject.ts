export class DataObject {

    private _data: Map<string, any> | any[];
    private _isArray: boolean = false;

    constructor(data: Map<string, any> | any[], isArray: boolean = false) {
        if (data == null) throw new Error("Data cannot be null");
        this._data = data;
        this._isArray = isArray;
    }

    public keys(): Iterator<string> | Iterator<number> {
        return this._data.keys();
    }

    public getValue(key: string | number): any {
        return this._isArray ? (<any[]>this._data)[<number>key] : (<Map<string, any>>this._data).get(<string>key);
    }

    public clear() {
        this._data = null;
    }
}