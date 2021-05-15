import {IRequestArgument} from "../IRequestArgument";
import {QueryBuilder} from "../../../query/builder/QueryBuilder";
import {MongoResponseParser} from "../../../parsers/MongoResponseParser";
import { AbstractApiRequest } from "./AbstractApiRequest";
import { APISchema } from "../../../schema/APISchema";
import { IQuery } from "../../../query/IQuery";

export class AggregationApiRequest extends AbstractApiRequest {

    private readonly GROUPING_LIMITATION: number = 175000; //the limit for MongoDB 1 time response, to avoid 64 MB document limitation
    private _isPaginationEnabled: boolean = false;
    private _templateQuery: IQuery = null;

    constructor(requestArgument: IRequestArgument) {
        super(requestArgument);
        this._loggingTemplate = "aggregations";
        this._templateQuery = this._splitedQueries.shift(); //this._splitedQueries[0];
        this._isPaginationEnabled = this.isPaginationNecessary(this._splitedQueries);
        if (this._isPaginationEnabled) {
            this.applyPaginationStrategie(this._splitedQueries);
        }
    }

    public buildMongoQuery(queryBuilder: QueryBuilder, schema: APISchema) {
        if (queryBuilder == null) throw new Error("Illegal argument exception");
        const mongoQuery: any = queryBuilder.buildAggregationPipelineFacet(this._splitedQueries, schema, this._templateQuery); //TODO: rename "buildPipeline"
        //queryBuilder.applyPaging(mongoQuery, {skipNumber: this._currentPageIndex, limitNumber: this.CHUNK_SIZE});
        //this._currentPageIndex += this.CHUNK_SIZE;
        return mongoQuery;
    }    

    public parseQueryResult = (queryResult: Promise<any>, date: Date = null) => 
        MongoResponseParser.getInstance().parseCalculationsFromCursor(queryResult, this._splitedQueries, this.CHUNK_SIZE, date, this);

    public updateLoadingStatus(data: any): void {
        if (data === undefined) return;
        for (let i: number = 0; i < this._splitedQueries.length; i++) {
            const dataChunk: any[] = data[this._splitedQueries[i].definition];
            if (dataChunk !== undefined) {
                this._splitedQueries[i].queryStats.loadedNumberOfRecords = dataChunk.length;
            }
        }
    }

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

        const expectedNumberOfRecords: number = this.areSubTotalsAvailable(query) 
            ? this.getExpectedNumberOfRecords(query["aggs"]["by"]["rows"], query["aggs"]["values"]) 
                + this.getExpectedNumberOfRecords(query["aggs"]["by"]["cols"], query["aggs"]["values"])
            : 0;
        aggregationQueries.set("intersection", {
            definition: "intersection",
            clientQuery: query,
            queryStats: {
                expectedNumberOfRecords: expectedNumberOfRecords,
                chunkToLoad: 0,
                isAllQueryDataLoaded: false,
                loadedNumberOfRecords: 0,
                sumOfLoadedRecords: 0
            }       
        });//the first query is to obtain intersections

        this._splitIntersectionQuery(query, aggregationQueries);

        if (this.areValuesAvailable(query)) {
            this._splitSubTotalQuery(query, aggregationQueries);
            this._splitGrandTotalQuery(query, aggregationQueries);
        }

        const uniqueAggregationQueries: IQuery[] = Array.from(aggregationQueries.values());
        return uniqueAggregationQueries;
    }

    private applyPaginationStrategie(queries: IQuery[]): void {
        //console.log(">>>>> before", JSON.stringify(queries, null, ' '));
        queries.sort((first: IQuery, second: IQuery) => {
            return first.queryStats.expectedNumberOfRecords - second.queryStats.expectedNumberOfRecords;
        });
        let currentSizeChunk: number = 0;
        const coeficient: number = 0.25;
        
        // while (currentSizeChunk <= this.GROUPING_LIMITATION && queryNumber < queries.length) {
        //     if (queries[queryNumber].queryStats.isAllQueryDataLoaded 
        //         || queries[queryNumber].queryStats.chunkToLoad === queries[queryNumber].queryStats.expectedNumberOfRecords) {
        //         queryNumber++;
        //         continue;
        //     }
        //     const query: IQuery = queries[queryNumber];            
        //     let expectedChunkToLoad: number = (this.GROUPING_LIMITATION * coeficient > query.queryStats.expectedNumberOfRecords - query.queryStats.sumOfLoadedRecords) 
        //         ? query.queryStats.expectedNumberOfRecords - query.queryStats.sumOfLoadedRecords
        //         : this.GROUPING_LIMITATION * coeficient
        //     if (currentSizeChunk + expectedChunkToLoad <= this.GROUPING_LIMITATION) {
        //         query.queryStats.chunkToLoad = expectedChunkToLoad;
        //         currentSizeChunk += expectedChunkToLoad;
        //     } else {
        //         expectedChunkToLoad = this.GROUPING_LIMITATION - currentSizeChunk;
        //         currentSizeChunk += expectedChunkToLoad;
        //     }
        //     queryNumber++;
        // }

        while (currentSizeChunk < this.GROUPING_LIMITATION) {
            currentSizeChunk = this.balanceGroupingLimitation(queries, currentSizeChunk, coeficient);
        }
        //console.log(">>>>>>>", JSON.stringify(queries, null, ' '));
    }

    private balanceGroupingLimitation(queries: IQuery[], currentSizeChunk: number, coeficient: number): number {
        let queryNumber: number = 0;

        while (currentSizeChunk < this.GROUPING_LIMITATION && queryNumber < queries.length) {
            if (queries[queryNumber].queryStats.isAllQueryDataLoaded 
                || queries[queryNumber].queryStats.chunkToLoad === queries[queryNumber].queryStats.expectedNumberOfRecords) {
                queryNumber++;
                continue;
            }
            const query: IQuery = queries[queryNumber];            
            let expectedChunkToLoad: number = (this.GROUPING_LIMITATION * coeficient > query.queryStats.expectedNumberOfRecords - query.queryStats.sumOfLoadedRecords) 
                ? query.queryStats.expectedNumberOfRecords - query.queryStats.sumOfLoadedRecords
                : this.GROUPING_LIMITATION * coeficient
            if (currentSizeChunk + expectedChunkToLoad <= this.GROUPING_LIMITATION) {
                query.queryStats.chunkToLoad = expectedChunkToLoad;
                currentSizeChunk += expectedChunkToLoad;
            } else {
                expectedChunkToLoad = this.GROUPING_LIMITATION - currentSizeChunk;
                currentSizeChunk += expectedChunkToLoad;
            }
            queryNumber++;
        }

        return currentSizeChunk;
    }

    private isPaginationNecessary(queryList: IQuery[]): boolean {
        let sumOfExpectedRecords: number = 0;
        for (let i: number = 0; i < queryList.length; i++) {
            if (queryList[i].queryStats === undefined) {
                continue;
            }
            sumOfExpectedRecords+= queryList[i].queryStats.expectedNumberOfRecords;
        }
        //console.log(">>>>>>sum of expected", sumOfExpectedRecords, JSON.stringify(queryList, null, ' '));
        return this.GROUPING_LIMITATION < sumOfExpectedRecords;
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
                    clientQuery: intersectionQuery,
                    queryStats: {
                        expectedNumberOfRecords: this.getExpectedNumberOfRecords(colsItems, intersectionQuery["aggs"]["values"]),
                        chunkToLoad: 0,
                        isAllQueryDataLoaded: false,
                        loadedNumberOfRecords: 0,
                        sumOfLoadedRecords: 0
                    }
                })
            }
        }
        return;
    }

    private getExpectedNumberOfRecords(colsItems: any[], valuesList: any[]): number {
        if (colsItems === undefined) return 0;
        let expectedNumberOfRecords: number = this._schema.fields.get(colsItems[0]["uniqueName"]).fieldStats.distinctMembersNumber;
        let numberOfMeasures: number = valuesList === undefined ? 1 : valuesList.length;
        for (let i = 1; i < colsItems.length; i++) {
            expectedNumberOfRecords*= this._schema.fields.get(colsItems[i]["uniqueName"]).fieldStats.distinctMembersNumber;
        }
        expectedNumberOfRecords*= numberOfMeasures;
        return expectedNumberOfRecords;
    }

    private _splitSubTotalQuery(query: any, aggregationQueries: Map<string, IQuery>): void {
        if (!this.areSubTotalsAvailable(query)) return;

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
                clientQuery: subTotalQuery,
                queryStats: {
                    expectedNumberOfRecords: this.getExpectedNumberOfRecords(axisItemsList, subTotalQuery["aggs"]["values"]),
                    chunkToLoad: 0,
                    isAllQueryDataLoaded: false,
                    loadedNumberOfRecords: 0,
                    sumOfLoadedRecords: 0
                }
            });
        }
        
        return;
    }

    private areSubTotalsAvailable(query: any): boolean {
        return (query["aggs"] != null && query["aggs"]["by"] != null);
    }

    private _splitGrandTotalQuery(query: any, aggregationQueries: Map<string, IQuery>): void {
        const grandTotalQuery: any = JSON.parse(JSON.stringify(query));
        delete grandTotalQuery["aggs"]["by"];
        const definitionLabel: string = "grandTotal";

        aggregationQueries.set(definitionLabel, 
        {
            definition: definitionLabel,
            clientQuery: grandTotalQuery,
            queryStats: {
                expectedNumberOfRecords: grandTotalQuery["aggs"]["values"].length,
                chunkToLoad: 0,
                isAllQueryDataLoaded: false,
                loadedNumberOfRecords: 0,
                sumOfLoadedRecords: 0
            }
        });

        return;
    }

    private areValuesAvailable(query: any): boolean {
        return (query["aggs"] != null && query["aggs"]["values"] != null && query["aggs"]["values"].length != 0)
    }
}