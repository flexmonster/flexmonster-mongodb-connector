export class CacheManager {

    private static _instance: CacheManager = null;
    private _cache: Map<string, any> = null;

    constructor() {
        if (CacheManager._instance != null) throw new Error("Initialization failed: "+
        "use Singleton.getInstance() instead of new.");
        this._cache = new Map<string, any>();
        CacheManager._instance = this;
    }

    public static getInstance(): CacheManager {
        if (this._instance == null) {
            this._instance = new CacheManager();
        }
        return this._instance;
    }

    public hasKey(key: string): boolean {
        if (key == null) throw new Error("Null key exception");
        return this._cache.has(key);
    }

    public getCache(key: string): any {
        if (key == null) throw new Error("Null key exception");
        return this._cache.get(key);
    }

    public setCache(key: string, data: any) {
        this._cache.set(key, data);
    }
}