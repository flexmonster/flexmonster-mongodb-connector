import { IDataCache } from "../IDataCache";
import { ICacheStrategie } from "../cacheStrategies/ICacheStrategie";

export class LocalDataCache implements IDataCache<string, any> {

    private _cache: Map<string, CachedDataObject> = null;
    private timeToLive: number = 0; //TTL for data objects in seconds, default 0 means we are not going to update cahce
    private cacheStrategie: ICacheStrategie;

    constructor(cacheStrategie: ICacheStrategie) {
        this._cache = new Map<string, any>();
        this.cacheStrategie = cacheStrategie;
    }

    setTimeToLive(seconds: number): void {
        if (seconds < 0) return;
        this.timeToLive = seconds;
    }

    public hasKey(key: string): boolean {
        if (key == null) throw new Error("Null key exception");
        return this._cache.has(key);
    }

    public getCache(key: string): any {
        if (key == null) throw new Error("Null key exception");
        let cachedDataObject: CachedDataObject = this._cache.get(key);
        
        if (this.cacheStrategie.isCacheStaled(cachedDataObject, this.timeToLive)) {
            cachedDataObject = null;
            this.removeFromCache(key);
        }

        return cachedDataObject == null ? cachedDataObject : cachedDataObject.data;
    }

    // private isDataObjectStaled(cachedDataObject: CachedDataObject): boolean {
    //     if (cachedDataObject == null) return true;
    //     const timeLive: number = (new Date().getTime() - cachedDataObject.timeStamp) / 1000; // in seconds
    //     return this.timeToLive > 0 && timeLive > this.timeToLive;
    // }

    // private isProbabilisticCacheFlushNeeded(cachedDataObject: CachedDataObject, beta: number = 1): boolean {
    //     if (cachedDataObject == null) return true;
    //     return new Date().getTime() - cachedDataObject.computationTime * beta * Math.log(Math.random()) 
    //         > cachedDataObject.timeStamp + this.timeToLive * 1000;
    // }

    private removeFromCache(key: string): void {
        if (key == null) throw new Error("Null key exception");
        this._cache.set(key, null);
    }

    public setCache(key: string, data: any) {
        this._cache.set(key, {
            timeStamp: new Date().getTime(),
            data: data
        });
    }

    public setCacheStrategie(cacheStrategie: ICacheStrategie) {
        if (cacheStrategie == null) return;
        this.cacheStrategie = cacheStrategie;
    }

    public clearCache(): void {
        throw new Error("Method not implemented.");
    }
}

export interface CachedDataObject {
    data: any;
    timeStamp: number;//timeStamp for data added to cache (in miliseconds) 
    computationTime?: number;
}