import {IRequestArgument} from "../IRequestArgument";
import {QueryBuilder} from "../../../query/builder/QueryBuilder";
import {MongoResponseParser} from "../../../parsers/MongoResponseParser";
import { AbstractApiRequest } from "./AbstractApiRequest";
import { APISchema } from "../../../schema/APISchema";
import { IQuery } from "../../../query/IQuery";

export class AggregationApiRequest extends AbstractApiRequest {

    constructor(requestArgument: IRequestArgument) {
        super(requestArgument);
        this._loggingTemplate = "aggregations";
    }

    public buildMongoQuery(queryBuilder: QueryBuilder, schema: APISchema) {
        if (queryBuilder == null) throw new Error("Illegal argument exception");
        const mongoQuery: any = queryBuilder.buildAggregationPipelineFacet(this._splitedQueries, schema); //TODO: rename "buildPipeline"
        //queryBuilder.applyPaging(mongoQuery, {skipNumber: this._currentPageIndex, limitNumber: this.CHUNK_SIZE});
        //this._currentPageIndex += this.CHUNK_SIZE;
        return mongoQuery;
    }    

    public parseQueryResult = (queryResult: Promise<any>, date: Date = null) => 
        MongoResponseParser.getInstance().parseCalculationsFromCursor(queryResult, this._splitedQueries, this.CHUNK_SIZE, date);


    public toJSON(response: any, nextPageToken?: string) {
        const jsonResponse: any = {
            "aggs": response
        };
        if (nextPageToken != null) jsonResponse["nextPageToken"] = nextPageToken;
        return jsonResponse;
    }

    protected _splitQuery(query: any): any[] {
        if (query == null) throw new Error("Illegal argument exception");
        const aggregationQueries: Map<string, IQuery> = new Map();

        aggregationQueries.set("intersection", {
            definition: "intersection",
            clientQuery: query            
        });//the first query is to obtain intersections

        this._splitIntersectionQuery(query, aggregationQueries);

        if (this.areValuesAvailable(query)) {
            this._splitSubTotalQuery(query, aggregationQueries);
            this._splitGrandTotalQuery(query, aggregationQueries);
        }

        return Array.from(aggregationQueries.values());
    }

    private _splitIntersectionQuery(query: any, aggregationQueries: Map<string, IQuery>) {
        if (typeof query["aggs"] === "undefined" || typeof query["aggs"]["by"] === "undefined" 
            || typeof query["aggs"]["by"]["rows"] === "undefined" || typeof query["aggs"]["by"]["cols"] === "undefined") return;

        const rowsList: any[] = query["aggs"]["by"]["rows"];
        const colsList: any[] = query["aggs"]["by"]["cols"];

        let rowsItems = [];
        let colsItems = [];
        let intersectionQuery = JSON.parse(JSON.stringify(query));
        delete intersectionQuery["aggs"]["by"]["rows"];
        delete intersectionQuery["aggs"]["by"]["cols"];

        for (let i = 0; i < rowsList.length; i++) {
            rowsItems.push(rowsList[i]);
            colsItems = rowsItems.slice(0);
            for (let j = 0; j < colsList.length; j++) {
                colsItems = colsItems.slice(0);
                colsItems.push(colsList[j]);

                intersectionQuery = JSON.parse(JSON.stringify(intersectionQuery));
                intersectionQuery["aggs"]["by"] = {
                    "cols": colsItems
                };

                aggregationQueries.set(JSON.stringify(colsItems),
                {
                    definition: "intersection" + i + j,
                    clientQuery: intersectionQuery
                })
            }
        }
        return;
    }

    private _splitSubTotalQuery(query: any, aggregationQueries: Map<string, IQuery>): void {
        if (!this.isSubTotalsAvailable(query)) return;

        const rowByQuery: any = JSON.parse(JSON.stringify(query));//a full copy of original query        
        delete rowByQuery["aggs"]["by"]["cols"];

        const colsByQuery: any = JSON.parse(JSON.stringify(query));//a full copy of original query
        delete colsByQuery["aggs"]["by"]["rows"];

        if (rowByQuery["aggs"]["by"]["rows"] != null) {
            this._generateAllSubtotalsCombinations(rowByQuery, aggregationQueries, "rows", "totalRows");
        }    
        if (colsByQuery["aggs"]["by"]["cols"] != null) {
            this._generateAllSubtotalsCombinations(colsByQuery, aggregationQueries, "cols", "totalColumns");
        }
        
        return;
    }

    private _generateAllSubtotalsCombinations(query: any, aggregationQueries: Map<string, IQuery>, axisName: string, definitionLabel: string): void {
        const rowsColumnsList: any[] = query["aggs"]["by"][axisName];
        let axisItemsList: any[] = [];
        let subTotalQuery = null;

        for (let i = 0; i < rowsColumnsList.length; i++) {
            subTotalQuery = JSON.parse(JSON.stringify(query));
            axisItemsList = axisItemsList.slice(0);
            axisItemsList.push(rowsColumnsList[i]);
            subTotalQuery["aggs"]["by"][axisName] = axisItemsList;

            aggregationQueries.set(JSON.stringify(axisItemsList), 
            {
                definition: definitionLabel + i,
                clientQuery: subTotalQuery
            });
        }
        
        return;
    }

    private isSubTotalsAvailable(query: any): boolean {
        return (query["aggs"] != null && query["aggs"]["by"] != null);
    }

    private _splitGrandTotalQuery(query: any, aggregationQueries: Map<string, IQuery>): void {
        const grandTotalQuery: any = JSON.parse(JSON.stringify(query));
        delete grandTotalQuery["aggs"]["by"];
        const definitionLabel: string = "grandTotal";

        aggregationQueries.set(definitionLabel, 
        {
            definition: definitionLabel,
            clientQuery: grandTotalQuery
        });

        return;
    }

    private areValuesAvailable(query: any): boolean {
        return (query["aggs"] != null && query["aggs"]["values"] != null && query["aggs"]["values"].length != 0)
    }
}