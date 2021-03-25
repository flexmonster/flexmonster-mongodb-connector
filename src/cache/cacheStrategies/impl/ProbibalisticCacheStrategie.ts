import { ICacheStrategie } from "../ICacheStrategie";
import { CachedDataObject } from "../../impl/LocalDataCache";

export class ProbibalisticCacheStrategie implements ICacheStrategie {
    
    private readonly beta: number = 1;

    public isCacheStaled(cacheDataObject: CachedDataObject, timeToLive: number): boolean {
        return this.isProbabilisticCacheFlushNeeded(cacheDataObject, timeToLive, this.beta);
    }

    private isProbabilisticCacheFlushNeeded(cachedDataObject: CachedDataObject, timeToLive: number, beta: number): boolean {
        if (cachedDataObject == null) return true;

        const randomPart: number = Math.log(Math.random());
        const expectations: number = new Date().getTime() - cachedDataObject.computationTime * beta * randomPart;
        const state: number = cachedDataObject.timeStamp + timeToLive * 1000 * 60;

        return timeToLive > 0 && expectations > state;
    } 
}