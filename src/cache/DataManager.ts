import { QueryBuilder } from "../query/builder/QueryBuilder";
import { MongoQueryExecutor } from "../query/MongoQueryExecutor";
import { CacheManager } from "./CacheManager";
import { APISchema } from "../schema/APISchema";
import { IApiRequest } from "../requests/apiRequests/IApiRequest";

export class DataManager {

    private _queryBuilder: QueryBuilder;
    private _queryExecutor: MongoQueryExecutor;
    private _cacheManager: CacheManager;
    private _DATA: Map<string, any> = null;
    private _iterator: IterableIterator<string> = null;
    private readonly CHUNK_SIZE: number = 50000;

    constructor(queryBuilder: QueryBuilder, queryExecutor: MongoQueryExecutor, cacheManager?: CacheManager) {
        this._queryBuilder = queryBuilder;
        this._queryExecutor = queryExecutor;
        this._cacheManager = cacheManager;
    }

    public async getData(schema: APISchema, apiRequest: IApiRequest): Promise<any> {
        if (this._DATA == null) {
            this._DATA = await apiRequest.getData(schema, this._queryBuilder, this._queryExecutor);
            this._iterator = this._DATA.keys();
            //(<AbstractApiRequest>apiRequest)._curentQueryIndex = 100;
        }

        const response: any[] = [];
        let i: number = 0;
        let dataObject: IteratorResult<string, any> = this._iterator.next();

        while (i <= this.CHUNK_SIZE && !dataObject.done) {
            response.push(this._DATA.get(dataObject.value));
            i++;
            dataObject = this._iterator.next()
        }

        this._DATA = null;

        return response;        
    }

    private async _getData(schema: APISchema, apiRequest: IApiRequest): Promise<any> {
        let data: any = null;
        let query: string = JSON.stringify(apiRequest.requestArgument.clientQuery);

        if (this._cacheManager.hasKey(query)) {
            data = this._cacheManager.getCache(query);
        } else {
            data = await apiRequest.getData(schema, this._queryBuilder, this._queryExecutor);
            this._cacheManager.setCache(query, data);
        }

        return data;
    }


    private prepareChunk(): void {

    }
}