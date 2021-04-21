import {IRequestArgument} from "../IRequestArgument";
import {QueryBuilder} from "../../../query/builder/QueryBuilder";
import {MongoResponseParser} from "../../../parsers/MongoResponseParser";
import { AbstractApiRequest } from "./AbstractApiRequest";
import { APISchema } from "../../../schema/APISchema";
import { IQuery } from "../../../query/IQuery";

export class FlatApiRequest extends AbstractApiRequest {

    constructor(requestArgument: IRequestArgument) {
        super(requestArgument);
        this._loggingTemplate = "flat view";
    }    
    
    protected buildMongoQuery(queryBuilder: QueryBuilder, schema: APISchema) {
        if (queryBuilder == null) throw new Error("Illegal argument exception");

        let mongoQuery: any = queryBuilder.buildFlatPipelineFacet(this._splitedQueries, schema);

        // if (this._splitedQueries[this._curentQueryIndex]["fields"] != null) {
        //     mongoQuery = queryBuilder.buildDrillThroughPipeline(this._splitedQueries[this._curentQueryIndex], schema);
        // } else {
        //     mongoQuery = queryBuilder.buildAggregationPipeline(this._splitedQueries[this._curentQueryIndex], schema);
        // }

        // queryBuilder.applyPaging(mongoQuery, {skipNumber: this._currentPageIndex, limitNumber: this.CHUNK_SIZE});
        // this._currentPageIndex += this.CHUNK_SIZE;
        
        return mongoQuery;
    }

    protected parseQueryResult(queryResultCursor: Promise<any>, startDate: Date): Promise<any> {
        return MongoResponseParser.getInstance().parseFlatFromCursor(queryResultCursor,
            this.requestArgument.clientQuery["fields"], this._splitedQueries, this.CHUNK_SIZE, startDate);
    }
    
    toJSON(response: any, nextpageToken?: string) {
        const jsonResponse: any = response;
        if (nextpageToken != null) jsonResponse["nextPageToken"] = nextpageToken;
        return jsonResponse;
    }

    protected _splitQuery(query: any): any[] {
        const splitedQuery: IQuery[] = [];

        this._splitGrandTotalQuery(query, splitedQuery);//grandTotals part of the query

        const dataRecords: any = JSON.parse(JSON.stringify(query));//data records part of the query
        delete dataRecords["aggs"];
        splitedQuery.push({
            clientQuery: dataRecords,
            definition: "dataRecords"
        });
        
        //console.log(">>>>>", JSON.stringify(splitedQuery));
        return splitedQuery;
    }

    private _splitGrandTotalQuery(query: any, aggregationQueries: IQuery[]): void {
        if (query["aggs"] == null || query["aggs"]["values"] == null 
            || query["aggs"]["values"].length == 0) return;

        const grandTotalQuery: any = JSON.parse(JSON.stringify(query));
        delete grandTotalQuery["fields"];

        aggregationQueries.push({
            clientQuery: grandTotalQuery,
            definition: "grandTotal"
        });

        return;
    }
}