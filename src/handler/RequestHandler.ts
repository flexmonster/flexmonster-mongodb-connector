import { QueryBuilder } from "../query/builder/QueryBuilder";
import { MongoQueryExecutor } from "../query/MongoQueryExecutor";
import { PagingInterface} from "../api/IDataAPI";
import { MongoResponseParser } from "../parsers/MongoResponseParser";
import {IApiRequest} from "../requests/apiRequests/IApiRequest";
import {RequestsRegister} from "../requests/register/RequestsRegister";
import {RequestKey} from "../requests/register/RequestKey"
import { Db } from "mongodb";

export class RequestHandler {

    private _queryBuilder: QueryBuilder;
    private _queryExecutor: MongoQueryExecutor;
    private _requestsRegister: RequestsRegister;

    constructor(queryBuilder: QueryBuilder, queryExecutor: MongoQueryExecutor, responseParser: MongoResponseParser) {
        this._queryBuilder = queryBuilder;
        this._queryExecutor = queryExecutor;
        this._requestsRegister = RequestsRegister.getInstance();
    }

    public async loadData(dbo: Db, apiRequest: IApiRequest, currentPage: PagingInterface) {
        this._queryExecutor.injectDBConnection(dbo);

        const data: any = await apiRequest.getData(this._queryBuilder, this._queryExecutor);
        
        let nextPageToken: string = null;
        if (this.getDataLength(data) >= 0 && !apiRequest.isFinished()) {
            if (this.getDataLength(data) == 0) apiRequest.moveNext();
            if (currentPage.pageToken != null && this._requestsRegister.hasItem(currentPage.pageToken)) {
                this._requestsRegister.deleteItem(currentPage.pageToken);
            }
            if (!apiRequest.isFinished()) {
                const requestKey: RequestKey = new RequestKey(apiRequest.requestArgument.query);
                this._requestsRegister.addItem(requestKey.hash(), apiRequest);
                nextPageToken = requestKey.hash();
            }
        } else if (apiRequest.isFinished()) {
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