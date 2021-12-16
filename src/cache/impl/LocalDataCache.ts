import { IDataCache } from "../IDataCache";
import { ICacheStrategie } from "../cacheStrategies/ICacheStrategie";
import { ConfigInterface } from "../../config/ConfigInterface";
import { AbstractDataObject } from "../dataObject/impl/AbstractDataObject";
import { DataRetrievalInterface } from "../dataObject/DataRetrievalInterface";
import { CacheKeyInterface } from "../DataManager";
import { HashGenerator } from "../../utils/HashGenerator";

export class LocalDataCache implements IDataCache<CacheKeyInterface, any> {

    private _cache: Map<string, CachedDataObject> = null;
    private timeToLive: number = 0; //TTL for data objects in minutes, default 0 means we are not going to update cache
    private _cacheSizeLimit: number = 0; // mb
    private _cacheStrategie: ICacheStrategie;
    private _currentCacheSize: number = 0; //bytes
    private readonly _garbageCollectingCoefficient: number = 0.6; // when reaching cache size limit we keep 60% of data and remove 40%

    constructor(cacheStrategie: ICacheStrategie, config: ConfigInterface) {
        this._cache = new Map<string, any>();
        this._cacheStrategie = cacheStrategie;
        this.timeToLive = config.cacheTimeToLive;
        this._cacheSizeLimit = config.cacheMemoryLimit * 1024 * 1024;
        this._currentCacheSize = 0;
    }

    setTimeToLive(minutes: number): void {
        if (minutes < 0) return;
        this.timeToLive = minutes;
    }

    // public hasKey(key: CacheKeyInterface): boolean {
    //     if (key == null) throw new Error("Null key exception");
    //     return this._cache.has(key);
    // }

    public getCache(key: CacheKeyInterface): DataRetrievalInterface {
        if (key == null) throw new Error("Null key exception");
        const keyHash: string = this.getCacheKey(key);
        let cachedDataObject: CachedDataObject = this._cache.get(keyHash);
        
        if (typeof cachedDataObject !== "undefined" && this._cacheStrategie.isCacheStaled(cachedDataObject, this.timeToLive)) {
            // console.log(">>>>>stalled", ((new Date().getTime() - cachedDataObject.timeStamp) / (1000 * 60)));
            cachedDataObject = undefined;
            this.removeFromCache(key);
        }

        return typeof cachedDataObject === "undefined" ? undefined : cachedDataObject.data;
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

    private removeFromCache(key: CacheKeyInterface): void {
        if (key == null) throw new Error("Null key exception");
        const keyHash: string = this.getCacheKey(key);
        const cachedItem: CachedDataObject = this._cache.get(keyHash);
        if (typeof cachedItem === "undefined") return;

        this._removeFromCache(keyHash);
        this._currentCacheSize-= cachedItem.dataMemorySize;
        cachedItem.data = null;
        return;
    }

    private _removeFromCache(keyHash: string): void {
        this._cache.delete(keyHash);
    }


    public setCache(key: CacheKeyInterface, data: AbstractDataObject): void {
        const keyHash: string = this.getCacheKey(key);
        this._cache.set(keyHash, 
            {
                data: data,
                timeStamp: new Date().getTime(),
                computationTime: data.computationTime,
                dataMemorySize: data.dataMemorySize
            }
        );
        this._currentCacheSize+= data.dataMemorySize;

        if (this._cacheSizeLimit > 0 && this._currentCacheSize > this._cacheSizeLimit) this.collectGabbage();
    }

    private collectGabbage(): void {
        //console.log(">>>>>>", this.getCacheMemoryStatus());
        const entries = this._cache.entries();
        let entriesList: GarbageColletingItemsInterface[] = [];

        for (const entry of entries) {
            entriesList.push({
                key: entry[0],
                timeStamp: entry[1].timeStamp,
                computationTime: entry[1].computationTime,
                dataMemorySize: entry[1].dataMemorySize,
                isCacheStaled: this._cacheStrategie.isCacheStaled(entry[1], this.timeToLive)
            });
        }

        entriesList.sort(this.garbageItemsComparator);

        let garbageCollectingItem: GarbageColletingItemsInterface = null;
        while (this._cacheSizeLimit * this._garbageCollectingCoefficient <= this._currentCacheSize) {
            garbageCollectingItem = entriesList.shift();
            this._removeFromCache(garbageCollectingItem.key);
        }

        entriesList = null;
        //console.log(">>>>>>", this.getCacheMemoryStatus());
    }

    private garbageItemsComparator: (a: GarbageColletingItemsInterface, b: GarbageColletingItemsInterface) => number 
        = (a: GarbageColletingItemsInterface, b: GarbageColletingItemsInterface) => {
        const aScore: number = this.getGarbageItemScore(a);
        const bScore: number = this.getGarbageItemScore(b);
        return aScore - bScore;
    }

    private getGarbageItemScore(item: GarbageColletingItemsInterface): number {
        if (item.isCacheStaled) return cacheScoreMetrics.StaledCache;
        return item.computationTime;
    }

    //private refreshMemory(): void {}

    public setCacheStrategie(cacheStrategie: ICacheStrategie) {
        if (cacheStrategie == null) return;
        this._cacheStrategie = cacheStrategie;
    }

    public clearCache(): void {
        this._cache.clear();
        this._currentCacheSize = 0;
    }

    private getCacheKey(objectKey: CacheKeyInterface): string {
        if (objectKey == null) throw new Error("Null cache object key exception");
        return HashGenerator.createHashFromObject(objectKey);
    }

    public getCacheMemoryStatus(): string {
        return `Current cache size: ${(this._currentCacheSize / (1024 * 1024)).toFixed(2)} MB`;
    }
}

export interface CachedDataObject {
    data: DataRetrievalInterface;
    timeStamp: number;//timeStamp for data added to cache (in miliseconds) 
    computationTime: number;
    dataMemorySize: number;
}

export interface GarbageColletingItemsInterface {
    key: string,
    timeStamp: number;//timeStamp for data added to cache (in miliseconds) 
    computationTime: number;
    dataMemorySize: number;
    isCacheStaled: boolean;
}

const cacheScoreMetrics = {
    StaledCache: -300
}