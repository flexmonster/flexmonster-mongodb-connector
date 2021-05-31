import { ICacheStrategie } from "./cacheStrategies/ICacheStrategie";

export interface IDataCache<KeyType, DataType> {
    hasKey(key: KeyType): boolean;
    getCache(key: KeyType): DataType;
    setCache(key: KeyType, data: DataType): void;
    clearCache(): void;
    setTimeToLive(seconds: number): void;
    setCacheStrategie(cacheStrategie: ICacheStrategie): void;
    getCacheMemoryStatus(): string;
}