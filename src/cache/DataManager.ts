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
        this._cacheManager = new LocalDataCache(cacheStategie);
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
        let data: any = null;
        let query: string = JSON.stringify(apiRequest.requestArgument.clientQuery);
        //console.log(">>>>>>>query", query);
        if (this._cacheManager.hasKey(query)) {
            data = this._cacheManager.getCache(query);
            console.log(">>>>>>>cache");
        } else {
            data = await apiRequest.getData(schema, this._queryBuilder, this._queryExecutor);
            this._cacheManager.setCache(query, data);
            console.log(">>>>>>>query");
        }

        return data;
    }
}

export interface DataIterationInterface {
    data: DataRetrievalInterface;
    iterator: IterableIterator<any>;
}