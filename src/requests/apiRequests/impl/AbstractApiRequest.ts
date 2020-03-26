import {IApiRequest} from "../IApiRequest";
import {IRequestArgument} from "../IRequestArgument";
import {QueryBuilder} from "../../../query/builder/QueryBuilder";
import { MongoQueryExecutor } from "../../../query/MongoQueryExecutor";

export abstract class AbstractApiRequest implements IApiRequest{

    protected readonly _requestArgument: IRequestArgument;
    protected _splitedQueries: any[];
    protected _curentQueryIndex: number;
    protected _currentPageIndex: number;
    protected CHUNK_SIZE: number = 50000;

    constructor(requestArgument: IRequestArgument) {
        this._requestArgument = requestArgument;
        this._splitedQueries = this._splitQuery(this._requestArgument.query);
        this._curentQueryIndex = 0;
        this._currentPageIndex = 0;
    }

    public get requestArgument(): IRequestArgument {
        return this._requestArgument;
    };
    
    public async getData(queryBuilder: QueryBuilder, queryExecutor: MongoQueryExecutor): Promise<any> {
        const mongoQuery: any = this.buildMongoQuery(queryBuilder);

        const queryResultCursor: Promise<any> = this.executeQuery(queryExecutor, mongoQuery);

        const data: any[] = await this.parseQueryResult(queryResultCursor);

        return data;
    }

    public moveNext(): void {
        this._curentQueryIndex++;
        this._currentPageIndex = 0;    
    }

    public isFinished(): boolean {
        return this._splitedQueries.length <= this._curentQueryIndex;
    }

    protected _splitQuery(query: any): any[] {
        const splitedQuery: any[] = [];

        splitedQuery.push(query);
        
        return splitedQuery;
    }

    protected executeQuery(queryExecutor: MongoQueryExecutor, mongoQuery: any): Promise<any> {
        if (queryExecutor == null || mongoQuery == null) throw new Error("Illegal argument exception");
        return queryExecutor.runAggregateQuery(this._requestArgument.index, mongoQuery);
    }

    abstract toJSON(response: any, nextpageToken?: string): any;

    protected abstract buildMongoQuery(queryBuilder: QueryBuilder): any;
    protected abstract parseQueryResult(queryResultCursor: Promise<any>): Promise<any>;

}