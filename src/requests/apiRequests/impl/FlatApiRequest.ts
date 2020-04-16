import {IRequestArgument} from "../IRequestArgument";
import {QueryBuilder} from "../../../query/builder/QueryBuilder";
import {MongoResponseParser} from "../../../parsers/MongoResponseParser";
import { AbstractApiRequest } from "./AbstractApiRequest";
import { APISchema } from "../../../schema/APISchema";

export class FlatApiRequest extends AbstractApiRequest {

    constructor(requestArgument: IRequestArgument) {
        super(requestArgument);
    }    
    
    protected buildMongoQuery(queryBuilder: QueryBuilder, schema: APISchema) {
        if (queryBuilder == null) throw new Error("Illegal argument exception");

        let mongoQuery: any = null;
        if (this._splitedQueries[this._curentQueryIndex]["fields"] != null) {
            mongoQuery = queryBuilder.buildDrillThroughPipeline(this._splitedQueries[this._curentQueryIndex], schema);
        } else {
            mongoQuery = queryBuilder.buildAggregationPipeline(this._splitedQueries[this._curentQueryIndex], schema);
        }
        queryBuilder.applyPaging(mongoQuery, {skipNumber: this._currentPageIndex, limitNumber: this.CHUNK_SIZE});
        this._currentPageIndex += this.CHUNK_SIZE;
        return mongoQuery;
    }

    protected parseQueryResult(queryResultCursor: Promise<any>): Promise<any> {
        return MongoResponseParser.getInstance().parseFlatFromCursor(queryResultCursor,
            this.requestArgument.query["fields"], this._splitedQueries[this._curentQueryIndex]["fields"] == null);
    }
    
    toJSON(response: any, nextpageToken?: string) {
        const jsonResponse: any = response;
        if (nextpageToken != null) jsonResponse["nextPageToken"] = nextpageToken;
        return jsonResponse;
    }

    protected _splitQuery(query: any): any[] {
        const splitedQuery: any[] = [];

        this._splitGrandTotalQuery(query, splitedQuery);//grandTotals part of the query

        const drillThrough: any = JSON.parse(JSON.stringify(query));//drill-through part of the query
        delete drillThrough["aggs"];
        splitedQuery.push(drillThrough);
                        
        return splitedQuery;
    }

    private _splitGrandTotalQuery(query: any, aggregationQueries: any[]): void {
        if (query["aggs"] == null || query["aggs"]["values"] == null 
            || query["aggs"]["values"].length == 0) return;

        const grandTotalQuery: any = JSON.parse(JSON.stringify(query));
        delete grandTotalQuery["fields"];

        aggregationQueries.push(grandTotalQuery);

        return;
    }
}