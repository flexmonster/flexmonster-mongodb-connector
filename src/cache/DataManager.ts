import { QueryBuilder } from "../query/builder/QueryBuilder";
import { MongoQueryExecutor } from "../query/MongoQueryExecutor";
import { LocalDataCache } from "./impl/LocalDataCache";
import { IApiRequest } from "../requests/apiRequests/IApiRequest";
import { IDataCache } from "./IDataCache";
import { Register } from "../requests/register/Register";
import { ICacheStrategie } from "./cacheStrategies/ICacheStrategie";
import { ProbibalisticCacheStrategie } from "./cacheStrategies/impl/ProbibalisticCacheStrategie";
import { SimpleCacheStrategie } from "./cacheStrategies/impl/SimpleCacheStrategie";
import { DataRetrievalInterface, RetrievalResult } from "./dataObject/DataRetrievalInterface";
import { PagingInterface} from "../api/IDataAPI";
import { RequestKey } from "../requests/register/RequestKey";
import { ConfigManager } from "../config/ConfigManager";
import { ConfigInterface } from "../config/ConfigInterface";
import { AbstractDataObject } from "./dataObject/impl/AbstractDataObject";
import { LoggingMessages } from "../utils/consts/LoggingMessages";
import { LoggingManager } from "../logging/LoggingManager";
import { IRequestArgument } from "../requests/apiRequests/IRequestArgument";
import { RequestFactory } from "../requests/requestsFactory.ts/RequestsFactory";
import { ArrayDataObject } from "./dataObject/impl/ArrayDataObject";
import { SimpleNumericIterator } from "./customIterators/SimpleNumericIterator";
import { HashGenerator } from "../utils/HashGenerator";
//import { CachedDataInterface } from "./dataObject/CachedDataInterface";
//import { AbstractDataObject } from "./dataObject/impl/AbstractDataObject";

export class DataManager {

    private _queryBuilder: QueryBuilder;
    private _queryExecutor: MongoQueryExecutor;
    private _cacheManager: IDataCache<CacheKeyInterface, any>;
    private isProbabilisticCacheFlushEnabled: boolean = true;
    private _requestsRegister: Register<string, DataIterationInterface>;
    //private readonly CHUNK_SIZE: number = 50000;

    constructor(queryBuilder: QueryBuilder, queryExecutor: MongoQueryExecutor) {
        this._queryBuilder = queryBuilder;
        this._queryExecutor = queryExecutor;
        const cacheStategie: ICacheStrategie = this.isProbabilisticCacheFlushEnabled 
            ? new ProbibalisticCacheStrategie() : new SimpleCacheStrategie();
        const currentConfig: ConfigInterface = ConfigManager.getInstance().currentConfig;
        this._cacheManager = currentConfig.cacheEnabled ? new LocalDataCache(cacheStategie, ConfigManager.getInstance().currentConfig) : null;
        this._requestsRegister = new Register();
    }

    public async getData(requestArgument: IRequestArgument, requestType: string, currentPage: PagingInterface): Promise<any> {

        if (currentPage.pageToken != null) {
            const registerItem = this._requestsRegister.deleteItem(currentPage.pageToken);
            const retrievalResult: RetrievalResult = await this.getDataChunk(registerItem.data, registerItem.iterator); //registerItem.data.getChunk(registerItem.iterator);
            let nextPageToken: string = null;

            if (!retrievalResult.isFinished) {
                nextPageToken = new RequestKey(registerItem.apiRequest.requestArgument.clientQuery).hash();
                this._requestsRegister.addItem(nextPageToken, registerItem)
            }

            return registerItem.apiRequest.toJSON(retrievalResult.data, nextPageToken);
        }

        const apiRequest: IApiRequest = RequestFactory.createRequestInstance(requestArgument, requestType);
        const dataInstance: AbstractDataObject = await this._getData(apiRequest);
        const iterator: Iterator<any> = this.getIterator(dataInstance);//dataInstance.getIterationKeys();
        const retrievalResult: RetrievalResult = await this.getDataChunk(dataInstance, iterator); //await data.getChunk(iterator);
        let nextPageToken: string = null;

        if (!retrievalResult.isFinished) {
            nextPageToken = new RequestKey(apiRequest.requestArgument.clientQuery).hash();
            this._requestsRegister.addItem(nextPageToken, {
                data: dataInstance,
                iterator: iterator,
                apiRequest: apiRequest
            });
        }
        
        return apiRequest.toJSON(retrievalResult.data, nextPageToken);
    }

    private async _getData(apiRequest: IApiRequest): Promise<AbstractDataObject> {
        const cacheKey: CacheKeyInterface = {
            databaseName: apiRequest.requestArgument.db.databaseName,
            index: apiRequest.requestArgument.index,
            clientQuery: apiRequest.requestArgument.clientQuery
        };
        let data: AbstractDataObject = this.getDataFromCache(cacheKey);
        LoggingManager.log(`Client query: ${JSON.stringify(apiRequest.requestArgument.clientQuery)}`);

        if (data === undefined) {
            data = await apiRequest.getData(this._queryBuilder, this._queryExecutor);
            this.setDataToCache(cacheKey, <AbstractDataObject>data);

            if (ConfigManager.getInstance().currentConfig.cacheEnabled) {
                LoggingManager.log(`Putting ${apiRequest.loggingTemplate} data to cache`);
                LoggingManager.log(this.getCacheMemoryStatus());
            }
        } else {
            LoggingManager.log(`Getting ${apiRequest.loggingTemplate} data from cache`);
        }

        return data;
    }

    private getDataFromCache(keyObject: CacheKeyInterface): AbstractDataObject {
        if (this._cacheManager === null) return undefined;
        return this._cacheManager.getCache(keyObject); 
    }

    private setDataToCache(keyObject: CacheKeyInterface, data: AbstractDataObject): void {
        if (this._cacheManager === null) return undefined;
        this._cacheManager.setCache(keyObject, data);
    }

    private getCacheMemoryStatus(): string {
        if (this._cacheManager === null) return LoggingMessages.DISABLED_CACHE_MESSAGE;
        return this._cacheManager.getCacheMemoryStatus();
    }

    private getIterator(dataInstance: AbstractDataObject): Iterator<any> {
        if (dataInstance instanceof ArrayDataObject) {
            return dataInstance.isCompleted ? dataInstance.getIterationKeys() : new SimpleNumericIterator(); 
        }
        return dataInstance.getIterationKeys();
    }

    private async getDataChunk(dataInstance: DataRetrievalInterface, iterator: Iterator<any>): Promise<RetrievalResult> {
        if (dataInstance instanceof ArrayDataObject) {
            return dataInstance.isCompleted ? dataInstance.getChunk(iterator) : dataInstance.getChunkAsync(iterator);
        }
        return dataInstance.getChunk(iterator);
    }

    // private getCacheKey(objectKey: CacheKeyInterface): string {
    //     if (objectKey == null) throw new Error("Null cache object key exception");
    //     return HashGenerator.createHashFromObject(objectKey);
    // }
}

export interface CacheKeyInterface {
    clientQuery: string,
    databaseName: string,
    index: string    
}

export interface DataIterationInterface {
    data: DataRetrievalInterface;
    iterator: Iterator<any>;
    apiRequest?: IApiRequest;
}