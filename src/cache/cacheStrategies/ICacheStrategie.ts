import { CachedDataObject } from "../impl/LocalDataCache";

export interface ICacheStrategie {
    isCacheStaled(cacheDataObject: CachedDataObject, timeToLive: number): boolean;
}