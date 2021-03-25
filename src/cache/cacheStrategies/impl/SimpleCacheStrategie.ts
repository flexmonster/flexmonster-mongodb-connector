import { ICacheStrategie } from "../ICacheStrategie";
import { CachedDataObject } from "../../impl/LocalDataCache";

export class SimpleCacheStrategie implements ICacheStrategie {
    
    isCacheStaled(cacheDataObject: CachedDataObject, timeToLive: number): boolean {
        if (cacheDataObject == null) return true;
        const timeLive: number = (new Date().getTime() - cacheDataObject.timeStamp) / 1000 / 60; // in minutes
        return timeToLive > 0 && timeLive > timeToLive;
    }
}