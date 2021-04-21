import {IApiRequest} from "../IApiRequest";
import {IRequestArgument} from "../IRequestArgument";
import {QueryBuilder} from "../../../query/builder/QueryBuilder";
import { MongoQueryExecutor } from "../../../query/MongoQueryExecutor";
import { APISchema } from "../../../schema/APISchema";
import { IQuery } from "../../../query/IQuery";
import { Db } from "mongodb";
import { Logger } from "../../../utils/Logger";

export abstract class AbstractApiRequest implements IApiRequest{

    protected readonly _requestArgument: IRequestArgument;
    protected _splitedQueries: any[] | IQuery[];
    protected _curentQueryIndex: number;
    protected _currentPageIndex: number;
    protected _db: Db;
    protected CHUNK_SIZE: number = 50000;
    protected _loggingTemplate: string;

    constructor(requestArgument: IRequestArgument) {
        this._requestArgument = requestArgument;
        this._splitedQueries = this._splitQuery(this._requestArgument.clientQuery);
        this._db = requestArgument.db;
        this._curentQueryIndex = 0;
        this._currentPageIndex = 0;
    }

    public get requestArgument(): IRequestArgument {
        return this._requestArgument;
    };

    public get loggingTemplate(): string {
        return this._loggingTemplate;
    }
    
    public async getData(schema: APISchema, queryBuilder: QueryBuilder, queryExecutor: MongoQueryExecutor): Promise<any> {
        const mongoQuery: any = this.buildMongoQuery(queryBuilder, schema);
        Logger.getInstance().log(`Getting ${this.loggingTemplate} data`);
        Logger.getInstance().log(`Generated pipeline query to MongoDB ${JSON.stringify(mongoQuery)}`);

        const startDate = new Date();
        const queryResultCursor: Promise<any> = this.executeQuery(queryExecutor, mongoQuery);
        console.log(">>>>>>promise", new Date().getTime() - startDate.getTime());
        const data: any[] = await this.parseQueryResult(queryResultCursor, startDate);

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
        queryExecutor.injectDBConnection(this._db);
        return queryExecutor.runAggregateQuery(this._requestArgument.index, mongoQuery);
    }

    abstract toJSON(response: any, nextpageToken?: string): any;

    protected abstract buildMongoQuery(queryBuilder: QueryBuilder, schema: APISchema): any;
    protected abstract parseQueryResult(queryResultCursor: Promise<any>, date: Date): Promise<any>;

}