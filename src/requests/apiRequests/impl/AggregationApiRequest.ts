import {IRequestArgument} from "../IRequestArgument";
import {QueryBuilder} from "../../../query/builder/QueryBuilder";
import {MongoResponseParser} from "../../../parsers/MongoResponseParser";
import { AbstractApiRequest } from "./AbstractApiRequest";

export class AggregationApiRequest extends AbstractApiRequest {

    constructor(requestArgument: IRequestArgument) {
        super(requestArgument);
    }

    public buildMongoQuery(queryBuilder: QueryBuilder) {
        if (queryBuilder == null) throw new Error("Illegal argument exception");
        const mongoQuery: any = queryBuilder.buildAggregationPipeline(this._splitedQueries[this._curentQueryIndex]); //TODO: rename "buildPipeline"
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

        this._splitSubTotalQuery(query, aggregationQueries);
        this._splitGrandTotalQuery(query, aggregationQueries);

        return aggregationQueries;
    }

    private _splitSubTotalQuery(query: any, aggregationQueries: any[]): void {
        if (query["aggs"] == null || query["aggs"]["by"] == null) return;

        const rowByQuery: any = JSON.parse(JSON.stringify(query));//a full copy of original query        
        delete rowByQuery["aggs"]["by"]["cols"];        
        
        const colsByQuery: any = JSON.parse(JSON.stringify(query));//a full copy of original query
        delete colsByQuery["aggs"]["by"]["rows"];

        if (rowByQuery["aggs"]["by"]["rows"] != null) aggregationQueries.push(rowByQuery);
        if (colsByQuery["aggs"]["by"]["cols"] != null) aggregationQueries.push(colsByQuery);

        return;
    }

    private _splitGrandTotalQuery(query: any, aggregationQueries: any[]): void {
        if (query["aggs"] == null) return;

        const grandTotalQuery: any = JSON.parse(JSON.stringify(query));
        delete grandTotalQuery["aggs"]["by"];

        aggregationQueries.push(grandTotalQuery);

        return;
    }
}