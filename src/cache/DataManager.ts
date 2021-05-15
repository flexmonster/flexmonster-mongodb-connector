import { QueryBuilder } from "../query/builder/QueryBuilder";
import { MongoQueryExecutor } from "../query/MongoQueryExecutor";
import { LocalDataCache } from "./impl/LocalDataCache";
import { APISchema } from "../schema/APISchema";
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
//import { CachedDataInterface } from "./dataObject/CachedDataInterface";
//import { AbstractDataObject } from "./dataObject/impl/AbstractDataObject";

export class DataManager {

    private _queryBuilder: QueryBuilder;
    private _queryExecutor: MongoQueryExecutor;
    private _cacheManager: IDataCache<string, any>;
    private isProbabilisticCacheFlushEnabled: boolean = true;
    private _requestsRegister: Register<string, DataIterationInterface>;
    //private readonly CHUNK_SIZE: number = 50000;

    constructor(queryBuilder: QueryBuilder, queryExecutor: MongoQueryExecutor) {
        this._queryBuilder = queryBuilder;
        this._queryExecutor = queryExecutor;
        const cacheStategie: ICacheStrategie = this.isProbabilisticCacheFlushEnabled 
            ? new ProbibalisticCacheStrategie() : new SimpleCacheStrategie();
        const currentConfig: ConfigInterface = ConfigManager.getInstance().currentConfig;
        console.log(">>>>>>", currentConfig);
        this._cacheManager = currentConfig.cacheEnabled ? new LocalDataCache(cacheStategie, ConfigManager.getInstance().currentConfig) : null;
        this._requestsRegister = new Register();
    }

    public async getData(requestArgument: IRequestArgument, requestType: string, currentPage: PagingInterface): Promise<any> {

        if (currentPage.pageToken != null) {
            const registerItem = this._requestsRegister.deleteItem(currentPage.pageToken);
            const retrievalResult: RetrievalResult = registerItem.data.getChunk(registerItem.iterator);
            let nextPageToken: string = null;

            if (!retrievalResult.isFinished) {
                nextPageToken = new RequestKey(registerItem.apiRequest.requestArgument.clientQuery).hash();
                this._requestsRegister.addItem(nextPageToken, registerItem)
            }

            return registerItem.apiRequest.toJSON(retrievalResult.data, nextPageToken);
        }

        //console.log(">>>>>>", RequestFactory.name, RequestFactory.prototype);
        const apiRequest: IApiRequest = RequestFactory.createRequestInstance(requestArgument, requestType);
        const data: DataRetrievalInterface = await this._getData(apiRequest);
        const iterator: IterableIterator<any> = data.getIterationKeys();
        const retrievalResult: RetrievalResult = data.getChunk(iterator);
        let nextPageToken: string = null;

        if (!retrievalResult.isFinished) {
            nextPageToken = new RequestKey(apiRequest.requestArgument.clientQuery).hash();
            this._requestsRegister.addItem(nextPageToken, {
                data: data,
                iterator: iterator,
                apiRequest: apiRequest
            });
        }
        
        return apiRequest.toJSON(retrievalResult.data, nextPageToken);
    }

    private async _getData(apiRequest: IApiRequest): Promise<DataRetrievalInterface> {
        let query: string = JSON.stringify(apiRequest.requestArgument.clientQuery);
        let data: DataRetrievalInterface = this.getDataFromCache(query);
        LoggingManager.log(`Client query: ${JSON.stringify(apiRequest.requestArgument.clientQuery)}`);

        if (data === undefined) {
            data = await apiRequest.getData(this._queryBuilder, this._queryExecutor);
            this.setDataToCache(query, <AbstractDataObject>data);
            console.log(">>>>>", this.getCacheMemoryStatus());

            if (ConfigManager.getInstance().currentConfig.cacheEnabled) {
                LoggingManager.log(`Putting ${apiRequest.loggingTemplate} data to cache`);
                LoggingManager.log(this.getCacheMemoryStatus());
            }
        } else {
            LoggingManager.log(`Getting ${apiRequest.loggingTemplate} data from cache`);
        }

        return data;
    }

    private getDataFromCache(queryString: string): DataRetrievalInterface {
        if (this._cacheManager === null) return undefined;
        return this._cacheManager.getCache(queryString); 
    }

    private setDataToCache(queryString: string, data: AbstractDataObject): void {
        if (this._cacheManager === null) return undefined;
        this._cacheManager.setCache(queryString, data);
    }

    private getCacheMemoryStatus(): string {
        if (this._cacheManager === null) return LoggingMessages.DISABLED_CACHE_MESSAGE;
        return this._cacheManager.getCacheMemoryStatus();
    }
}

export interface DataIterationInterface {
    data: DataRetrievalInterface;
    iterator: IterableIterator<any>;
    apiRequest?: IApiRequest;
}