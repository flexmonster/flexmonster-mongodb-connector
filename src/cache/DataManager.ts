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
//import { CachedDataInterface } from "./dataObject/CachedDataInterface";
//import { AbstractDataObject } from "./dataObject/impl/AbstractDataObject";

export class DataManager {

    private _queryBuilder: QueryBuilder;
    private _queryExecutor: MongoQueryExecutor;
    private _cacheManager: IDataCache<string, any>;
    private isProbabilisticCacheFlushEnabled: boolean = true;
    private _requestsRegister: Register<string, DataIterationInterface>;
    private readonly CHUNK_SIZE: number = 50000;

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

    public async getData(schema: APISchema, apiRequest: IApiRequest, currentPage: PagingInterface): Promise<any> {
        if (currentPage.pageToken != null) {
            const dataIterator = this._requestsRegister.deleteItem(currentPage.pageToken);
            const retrievalResult: RetrievalResult = dataIterator.data.getChunk(dataIterator.iterator, this.CHUNK_SIZE);
            let nextPageToken: string = null;

            if (!retrievalResult.isFinished) {
                nextPageToken = new RequestKey(apiRequest.requestArgument.clientQuery).hash();
                this._requestsRegister.addItem(nextPageToken, dataIterator)
            }

            return apiRequest.toJSON(retrievalResult.data, nextPageToken);
        }

        const data: DataRetrievalInterface = await this._getData(schema, apiRequest);
        const iterator: IterableIterator<any> = data.getIterationKeys();
        const retrievalResult: RetrievalResult = data.getChunk(iterator, this.CHUNK_SIZE);
        let nextPageToken: string = null;

        if (!retrievalResult.isFinished) {
            nextPageToken = new RequestKey(apiRequest.requestArgument.clientQuery).hash();
            this._requestsRegister.addItem(nextPageToken, {
                data: data,
                iterator: iterator
            });
        }
        
        return apiRequest.toJSON(retrievalResult.data, nextPageToken);
    }

    private async _getData(schema: APISchema, apiRequest: IApiRequest): Promise<DataRetrievalInterface> {
        let query: string = JSON.stringify(apiRequest.requestArgument.clientQuery);
        let data: DataRetrievalInterface = this.getDataFromCache(query);
        //console.log(">>>>>>>query", query);

        if (data === undefined) {
            data = await apiRequest.getData(schema, this._queryBuilder, this._queryExecutor);
            this.setDataToCache(query, <AbstractDataObject>data);
            console.log(">>>>>", this.getCacheMemoryStatus());
        }
        // if (this._cacheManager.hasKey(query)) {
        //     data = this._cacheManager.getCache(query);
        //     console.log(">>>>>>>cache");
        // } else {
        //     data = await apiRequest.getData(schema, this._queryBuilder, this._queryExecutor);
        //     this._cacheManager.setCache(query, data);
        //     console.log(">>>>>>", this._cacheManager.getCacheMemoryStatus());
        // }

        return data;
    }

    private getDataFromCache(queryString: string): DataRetrievalInterface {
        if (this._cacheManager === null) return null;
        return this._cacheManager.getCache(queryString); 
    }

    private setDataToCache(queryString: string, data: AbstractDataObject): void {
        if (this._cacheManager === null) return null;
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
}