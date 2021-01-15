import {IRequestArgument} from "../IRequestArgument";
import {QueryBuilder} from "../../../query/builder/QueryBuilder";
import {MongoResponseParser} from "../../../parsers/MongoResponseParser";
import { AbstractApiRequest } from "./AbstractApiRequest";
import { APISchema } from "../../../schema/APISchema";
import { IQuery } from "../../../query/IQuery";

export class AggregationApiRequest extends AbstractApiRequest {

    constructor(requestArgument: IRequestArgument) {
        super(requestArgument);
    }

    public buildMongoQuery(queryBuilder: QueryBuilder, schema: APISchema) {
        if (queryBuilder == null) throw new Error("Illegal argument exception");
        const mongoQuery: any = queryBuilder.buildAggregationPipelineFacet(this._splitedQueries, schema); //TODO: rename "buildPipeline"
        //queryBuilder.applyPaging(mongoQuery, {skipNumber: this._currentPageIndex, limitNumber: this.CHUNK_SIZE});
        //this._currentPageIndex += this.CHUNK_SIZE;
        return mongoQuery;
    }    

    public parseQueryResult = (queryResult: Promise<any>, date: Date = null) => 
        MongoResponseParser.getInstance().parseCalculationsFromCursor(queryResult, this._splitedQueries, date);


    public toJSON(response: any, nextPageToken?: string) {
        const jsonResponse: any = {
            "aggs": response
        };
        if (nextPageToken != null) jsonResponse["nextPageToken"] = nextPageToken;
        return jsonResponse;
    }

    protected _splitQuery(query: any): any[] {
        if (query == null) throw new Error("Illegal argument exception");
        const aggregationQueries: IQuery[] = [];

        aggregationQueries.push({
            definition: "intersection",
            clientQuery: query            
        });//the first query is to obtain intersections

        if (this.areValuesAvailable(query)) {
            this._splitSubTotalQuery(query, aggregationQueries);
            this._splitGrandTotalQuery(query, aggregationQueries);
        }

        return aggregationQueries;
    }

    private _splitSubTotalQuery(query: any, aggregationQueries: any[]): void {
        if (!this.isSubTotalsAvailable(query)) return;

        const rowByQuery: any = JSON.parse(JSON.stringify(query));//a full copy of original query        
        delete rowByQuery["aggs"]["by"]["cols"];        

        const colsByQuery: any = JSON.parse(JSON.stringify(query));//a full copy of original query
        delete colsByQuery["aggs"]["by"]["rows"];

        if (rowByQuery["aggs"]["by"]["rows"] != null) {
            aggregationQueries.push({
                definition: "totalRows",
                clientQuery: rowByQuery
            });
        }            
        if (colsByQuery["aggs"]["by"]["cols"] != null) {
            aggregationQueries.push({
                definition: "totalColumns",
                clientQuery: colsByQuery
            });
        }
        
        return;
    }

    private isSubTotalsAvailable(query: any): boolean {
        return (query["aggs"] != null && query["aggs"]["by"] != null);
    }

    private _splitGrandTotalQuery(query: any, aggregationQueries: any[]): void {
        const grandTotalQuery: any = JSON.parse(JSON.stringify(query));
        delete grandTotalQuery["aggs"]["by"];

        aggregationQueries.push({
            definition: "grandTotal",
            clientQuery: grandTotalQuery
        });

        return;
    }

    private areValuesAvailable(query: any): boolean {
        return (query["aggs"] != null && query["aggs"]["values"] != null && query["aggs"]["values"].length != 0)
    }
}