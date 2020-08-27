import {IRequestArgument} from "../IRequestArgument";
import {QueryBuilder} from "../../../query/builder/QueryBuilder";
import {MongoResponseParser} from "../../../parsers/MongoResponseParser";
import { AbstractApiRequest } from "./AbstractApiRequest";
import { APISchema } from "../../../schema/APISchema";

export class AggregationApiRequest extends AbstractApiRequest {

    constructor(requestArgument: IRequestArgument) {
        super(requestArgument);
    }

    public buildMongoQuery(queryBuilder: QueryBuilder, schema: APISchema) {
        if (queryBuilder == null) throw new Error("Illegal argument exception");
        const mongoQuery: any = queryBuilder.buildAggregationPipeline(this._splitedQueries[this._curentQueryIndex], schema); //TODO: rename "buildPipeline"
        queryBuilder.applyPaging(mongoQuery, {skipNumber: this._currentPageIndex, limitNumber: this.CHUNK_SIZE});
        this._currentPageIndex += this.CHUNK_SIZE;
        return mongoQuery;
    }    

    public parseQueryResult = (queryResult: Promise<any>) => 
        MongoResponseParser.getInstance().parseCalculationsFromCursor(queryResult);


    public toJSON(response: any, nextPageToken?: string) {
        const jsonResponse: any = response;
        if (nextPageToken != null) jsonResponse["nextPageToken"] = nextPageToken;
        return jsonResponse;
    }

    protected _splitQuery(query: any): any[] {
        if (query == null) throw new Error("Illegal argument exception");
        const aggregationQueries: any[] = [];

        aggregationQueries.push(query);//the first query is to obtain intersections

        if (this.isValuesAvailable(query)) {
            this._splitSubTotalQuery(query, aggregationQueries);
            this._splitGrandTotalQuery(query, aggregationQueries);
        }

        return aggregationQueries;
    }

    private _splitSubTotalQuery(query: any, aggregationQueries: any[]): void {
        if (this.isSubTotalsAvailable(query)) return;

        const rowByQuery: any = JSON.parse(JSON.stringify(query));//a full copy of original query        
        delete rowByQuery["aggs"]["by"]["cols"];        
        
        const colsByQuery: any = JSON.parse(JSON.stringify(query));//a full copy of original query
        delete colsByQuery["aggs"]["by"]["rows"];

        if (rowByQuery["aggs"]["by"]["rows"] != null) aggregationQueries.push(rowByQuery);
        if (colsByQuery["aggs"]["by"]["cols"] != null) aggregationQueries.push(colsByQuery);

        return;
    }

    private isSubTotalsAvailable(query: any): boolean {
        return (query["aggs"] != null && query["aggs"]["by"] != null);
    }

    private _splitGrandTotalQuery(query: any, aggregationQueries: any[]): void {
        const grandTotalQuery: any = JSON.parse(JSON.stringify(query));
        delete grandTotalQuery["aggs"]["by"];

        aggregationQueries.push(grandTotalQuery);

        return;
    }

    private isValuesAvailable(query: any): boolean {
        return (query["aggs"] != null && query["aggs"]["values"] != null && query["aggs"]["values"].length != 0)
    }
}