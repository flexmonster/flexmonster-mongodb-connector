import {QueryBuilder} from "../../../query/builder/QueryBuilder";
import {MongoQueryExecutor} from "../../../query/MongoQueryExecutor";
import {IRequestArgument} from "../IRequestArgument";
import {MongoResponseParser} from "../../../parsers/MongoResponseParser";
import { AbstractApiRequest } from "./AbstractApiRequest";
import { APISchema } from "../../../schema/APISchema";
import { Logger } from "../../../utils/Logger";

export class DrillThroughApiRequest extends AbstractApiRequest {

    private _clientSideLimitation: number;

    constructor(requestArgument: IRequestArgument) {
        super(requestArgument);
        this._loggingTemplate = "drill-through";
        this._clientSideLimitation = requestArgument.clientQuery["limit"] != null ? requestArgument.clientQuery["limit"] : 0;
    }

    public async getData(schema: APISchema, queryBuilder: QueryBuilder, queryExecutor: MongoQueryExecutor): Promise<any> {

        let data: any[] = [];

        // if ((this._currentPageIndex < this._clientSideLimitation && this._clientSideLimitation > 0) || this._clientSideLimitation <= 0) {

            const mongoQuery: any = this.buildMongoQuery(queryBuilder, schema);
            Logger.getInstance().log(`Getting ${this.loggingTemplate} data`);
            Logger.getInstance().log(`Generated pipeline query to MongoDB ${JSON.stringify(mongoQuery)}`);

            const startDate = new Date();
            const queryResultCursor: Promise<any> = this.executeQuery(queryExecutor, mongoQuery);

            //data = await this.parseQueryResult(queryResultCursor);
        //}

        return this.parseQueryResult(queryResultCursor, startDate);
    }
    
    buildMongoQuery(queryBuilder: QueryBuilder, schema: APISchema) {
        if (queryBuilder == null) throw new Error("Illegal argument exception");

        const mongoQuery: any = queryBuilder.buildDrillThroughPipeline(this._splitedQueries[this._curentQueryIndex], schema, this._clientSideLimitation);
        // const limit: number = this.getQueryLimit();
        // queryBuilder.applyPaging(mongoQuery, {skipNumber: this._currentPageIndex, limitNumber: limit});
        // this._currentPageIndex += limit;

        return mongoQuery;
    }

    // private getQueryLimit(): number {
    //     if (this._clientSideLimitation <= 0) return this.CHUNK_SIZE;
    //     const limit: number = this._clientSideLimitation > 0 && this._clientSideLimitation < this.CHUNK_SIZE 
    //         ? this._clientSideLimitation : Math.min(this.CHUNK_SIZE, this._clientSideLimitation - this._currentPageIndex);
    //     return limit;
    // }

    parseQueryResult = (queryResult: Promise<any>, date: Date) =>
        MongoResponseParser.getInstance().parseDrillThroughFromCursor(queryResult, this._splitedQueries[this._curentQueryIndex]["fields"], this.CHUNK_SIZE, date);

    toJSON(response: any, nextpageToken?: string) {
        const jsonResponse: any = response;
        if (nextpageToken != null) jsonResponse["nextPageToken"] = nextpageToken;
        return jsonResponse;
    }
}