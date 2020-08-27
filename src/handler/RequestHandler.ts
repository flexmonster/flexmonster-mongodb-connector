import { QueryBuilder } from "../query/builder/QueryBuilder";
import { MongoQueryExecutor } from "../query/MongoQueryExecutor";
import { PagingInterface} from "../api/IDataAPI";
import {IApiRequest} from "../requests/apiRequests/IApiRequest";
import {RequestsRegister} from "../requests/register/RequestsRegister";
import {RequestKey} from "../requests/register/RequestKey"
import { Db } from "mongodb";
import { APISchema } from "../schema/APISchema";
import { DataManager } from "../cache/DataManager";
import { AggregationApiRequest } from "../requests/apiRequests/impl/AggregationApiRequest";

export class RequestHandler {

    private _queryBuilder: QueryBuilder;
    private _queryExecutor: MongoQueryExecutor;
    private _requestsRegister: RequestsRegister;
    private _dataManager: DataManager;

    constructor(queryBuilder: QueryBuilder, queryExecutor: MongoQueryExecutor, dataManager: DataManager) {
        this._queryBuilder = queryBuilder;
        this._queryExecutor = queryExecutor;
        this._dataManager = dataManager;
        this._requestsRegister = RequestsRegister.getInstance();
    }

    public async loadData(dbo: Db, schema: APISchema, apiRequest: IApiRequest, currentPage: PagingInterface) {
        this._queryExecutor.injectDBConnection(dbo);

        const data: any = apiRequest instanceof AggregationApiRequest ? await this._dataManager.getData(schema, apiRequest) : await apiRequest.getData(schema, this._queryBuilder, this._queryExecutor);
        
        let nextPageToken: string = null;
        if (this.getDataLength(data) >= 0 && !apiRequest.isFinished()) {
            if (this.getDataLength(data) == 0) apiRequest.moveNext();
            if (currentPage.pageToken != null && this._requestsRegister.hasItem(currentPage.pageToken)) {
                this._requestsRegister.deleteItem(currentPage.pageToken);
            }
            if (!apiRequest.isFinished()) {
                const requestKey: RequestKey = new RequestKey(apiRequest.requestArgument.clientQuery);
                this._requestsRegister.addItem(requestKey.hash(), apiRequest);
                nextPageToken = requestKey.hash();
            }
        } else if (apiRequest.isFinished() && currentPage.pageToken != null) {
            this._requestsRegister.deleteItem(currentPage.pageToken);
        }

        return apiRequest.toJSON(data, nextPageToken);
    }

    private getDataLength(data: any): number {
        let length: number = 0;
        if (data.length != null) {
            length = data.length;
        } else if (data["aggs"] != null) {
            length = data["aggs"].length;
        } else if (data["hits"] != null) {
            length = data["hits"].length;
        }
        return length;
    }
    
    public isRequestRegistered(key: string): boolean {
        return this._requestsRegister.hasItem(key);
    }

    public getRegisteredRequest(key: string): IApiRequest {
        return this._requestsRegister.getItem(key);
    }
}