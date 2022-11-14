import { IRequestArgument } from "../IRequestArgument";
import { QueryBuilder } from "../../../query/builder/QueryBuilder";
import { MongoResponseParser } from "../../../parsers/MongoResponseParser";
import { AbstractApiRequest } from "./AbstractApiRequest";
import { APISchema } from "../../../schema/APISchema";
import { IQuery } from "../../../query/IQuery";
import { MongoQueryExecutor } from "../../../query/MongoQueryExecutor";
import { LoggingManager } from "../../../logging/LoggingManager";
import { ArrayDataObject } from "../../../cache/dataObject/impl/ArrayDataObject";

export class AggregationApiRequest extends AbstractApiRequest {

    private readonly GROUPING_LIMITATION: number = 125000; //the limit for MongoDB 1 time response, to avoid 16 MB document limitation
    private _isPaginationEnabled: boolean = false;
    private _templateQuery: IQuery = null;
    private _isFinished: boolean = false;
    private _currentTimer: NodeJS.Timeout = undefined;

    constructor(requestArgument: IRequestArgument) {
        super(requestArgument);
        this._loggingTemplate = "aggregations";
        this._templateQuery = this._splitedQueries.shift();
        this._isPaginationEnabled = this.isPaginationNecessary(this._splitedQueries);
        if (this._isPaginationEnabled) {
            this._splitedQueries.sort((first: IQuery, second: IQuery) => {
                return first.queryStats.expectedNumberOfRecords - second.queryStats.expectedNumberOfRecords;
            });
        }
    }

    public async getData(queryBuilder: QueryBuilder, queryExecutor: MongoQueryExecutor): Promise < any > {
        const dataObject: ArrayDataObject = await this._getData(queryBuilder, queryExecutor);
        this.loadDataAsync(queryBuilder, queryExecutor, dataObject);
        return dataObject;
    }

    public async _getData(queryBuilder: QueryBuilder, queryExecutor: MongoQueryExecutor): Promise < any > {
        if (this._isPaginationEnabled) this.applyPaginationStrategie(this._splitedQueries);
        const preFilteredQueries: IQuery[] = this._isPaginationEnabled 
            ? this.preFilterQueries(this._splitedQueries) 
            : this._splitedQueries;
        const mongoQuery: any = this.buildMongoQuery(queryBuilder, this._schema, preFilteredQueries);
        LoggingManager.log(`Getting ${this.loggingTemplate} data`);
        LoggingManager.log(`Generated pipeline query to MongoDB ${JSON.stringify(mongoQuery)}`);

        const startDate = new Date();
        const queryResultCursor: Promise < any > = this.executeQuery(queryExecutor, mongoQuery);
        //console.log(">>>>>>promise", new Date().getTime() - startDate.getTime());

        return this.parseQueryResult(queryResultCursor, startDate, preFilteredQueries);
    }

    private loadDataAsync(queryBuilder: QueryBuilder, queryExecutor: MongoQueryExecutor, dataObject: ArrayDataObject): void {
        if (this._isPaginationEnabled) {
            this._isFinished = this.isEverythingLoaded(this._splitedQueries);
            if (this._currentTimer !== undefined) clearTimeout(this._currentTimer);
            if (!this._isFinished) {
                dataObject.isCompleted = false;
                this._currentTimer = setTimeout(async () => {
                    const data: ArrayDataObject = await this.getData(queryBuilder, queryExecutor);
                    dataObject.push(data);
                    this.loadDataAsync(queryBuilder, queryExecutor, dataObject);
                }, 100);
            } else {
                this._isFinished = true;
                dataObject.isCompleted = true;
            }
        } else {
            this._isFinished = true;
            dataObject.isCompleted = true;
        }
        return;
    }

    public buildMongoQuery(queryBuilder: QueryBuilder, schema: APISchema, preFilteredQueries?: IQuery[]) {
        if (queryBuilder == null) throw new Error("Illegal argument exception");
        if (preFilteredQueries === undefined) preFilteredQueries = this._splitedQueries;  
        const mongoQuery: any = queryBuilder.buildAggregationPipelineFacet(preFilteredQueries, schema, this._templateQuery, this._isPaginationEnabled); //TODO: rename "buildPipeline"
        //queryBuilder.applyPaging(mongoQuery, {skipNumber: this._currentPageIndex, limitNumber: this.CHUNK_SIZE});
        //this._currentPageIndex += this.CHUNK_SIZE;
        return mongoQuery;
    }

    private preFilterQueries(queries: IQuery[]): IQuery[] {
        if (!this._isPaginationEnabled) return queries;
        const paginatedQueries: IQuery[] = [];
        for (let i: number = 0; i < queries.length; i++) {
            if (!queries[i].queryStats.isAllQueryDataLoaded && queries[i].queryStats.chunkToLoad > 0) {
                paginatedQueries.push(queries[i]);
            }
        }
        return paginatedQueries;
    }

    public parseQueryResult = (queryResult: Promise < any > , date: Date = null, preFilteredQueries?: IQuery[]) =>
        MongoResponseParser.getInstance().parseCalculationsFromCursor(queryResult, preFilteredQueries, this.CHUNK_SIZE, date, this);

    public updateLoadingStatus(data: any): void {
        if (data === undefined) return;
        for (let i: number = 0; i < this._splitedQueries.length; i++) {
            const dataChunk: any[] = data[this._splitedQueries[i].definition];
            if (dataChunk !== undefined) {
                this._splitedQueries[i].queryStats.loadedNumberOfRecords = dataChunk.length;
                this.updateQueryStats(this._splitedQueries[i]);
            }
        }
    }

    public toJSON(response: any, nextPageToken? : string) {
        const jsonResponse: any = {
            "aggs": response
        };
        if (nextPageToken != null) jsonResponse["nextPageToken"] = nextPageToken;
        return jsonResponse;
    }

    private isAllQueryDataLoaded(query: IQuery): boolean {
        return query.queryStats.loadedNumberOfRecords < query.queryStats.chunkToLoad ||
            query.queryStats.sumOfLoadedRecords + query.queryStats.loadedNumberOfRecords >= query.queryStats.expectedNumberOfRecords;
    }

    private updateQueryStats(query: IQuery): void {
        //console.log(">>>>>>query", query);
        if (this.isAllQueryDataLoaded(query)) {
            query.queryStats.isAllQueryDataLoaded = true;
        } else {
            query.queryStats.sumOfLoadedRecords += query.queryStats.loadedNumberOfRecords;
            query.queryStats.chunkToLoad = 0;
            query.queryStats.loadedNumberOfRecords = 0;
        }
    }

    private isEverythingLoaded(quries: IQuery[]): boolean {
        for (let i: number = 0; i < quries.length; i++) {
            if (!quries[i].queryStats.isAllQueryDataLoaded) {
                return false;
            }
        }
        return true;
    }

    protected _splitQuery(query: any): any[] {
        if (query == null) throw new Error("Illegal argument exception");
        const aggregationQueries: Map <string, IQuery> = new Map();

        const expectedNumberOfRecords: number = this.areSubTotalsAvailable(query) ?
            this.getExpectedNumberOfRecords(query["aggs"]["by"]["rows"], query["aggs"]["values"]) +
            this.getExpectedNumberOfRecords(query["aggs"]["by"]["cols"], query["aggs"]["values"]) :
            0;
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
        }); //the first query is to obtain intersections

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

        let currentSizeChunk: number = 0;
        const coeficient: number = 0.25;

        while (currentSizeChunk < this.GROUPING_LIMITATION) {
            currentSizeChunk = this.balanceGroupingLimitation(queries, currentSizeChunk, coeficient);
        }
    }

    private balanceGroupingLimitation(queries: IQuery[], currentSizeChunk: number, coeficient: number): number {
        let queryNumber: number = 0;

        while (currentSizeChunk < this.GROUPING_LIMITATION && queryNumber < queries.length) {
            if (queries[queryNumber].queryStats.isAllQueryDataLoaded ||
                queries[queryNumber].queryStats.chunkToLoad === queries[queryNumber].queryStats.expectedNumberOfRecords) {
                queryNumber++;
                continue;
            }
            const query: IQuery = queries[queryNumber];
            let expectedChunkToLoad: number = (this.GROUPING_LIMITATION * coeficient > query.queryStats.expectedNumberOfRecords - query.queryStats.sumOfLoadedRecords) ?
                query.queryStats.expectedNumberOfRecords - query.queryStats.sumOfLoadedRecords :
                this.GROUPING_LIMITATION * coeficient;
            if (currentSizeChunk + expectedChunkToLoad <= this.GROUPING_LIMITATION) {
                query.queryStats.chunkToLoad += expectedChunkToLoad;
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

    private _splitIntersectionQuery(query: any, aggregationQueries: Map <string, IQuery> ) {
        if (typeof query["aggs"] === "undefined" || typeof query["aggs"]["by"] === "undefined" ||
            typeof query["aggs"]["by"]["rows"] === "undefined" || typeof query["aggs"]["by"]["cols"] === "undefined") return;

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

                aggregationQueries.set(JSON.stringify(colsItems), {
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

    private _splitSubTotalQuery(query: any, aggregationQueries: Map <string, IQuery> ): void {
        if (!this.areSubTotalsAvailable(query)) return;

        const rowByQuery: any = JSON.parse(JSON.stringify(query)); //a full copy of original query        
        delete rowByQuery["aggs"]["by"]["cols"];

        const colsByQuery: any = JSON.parse(JSON.stringify(query)); //a full copy of original query
        delete colsByQuery["aggs"]["by"]["rows"];

        if (rowByQuery["aggs"]["by"]["rows"] != null) {
            this._generateAllSubtotalsCombinations(rowByQuery, aggregationQueries, "rows", "totalRows");
        }
        if (colsByQuery["aggs"]["by"]["cols"] != null) {
            this._generateAllSubtotalsCombinations(colsByQuery, aggregationQueries, "cols", "totalColumns");
        }

        return;
    }

    private _generateAllSubtotalsCombinations(query: any, aggregationQueries: Map <string, IQuery> , axisName: string, definitionLabel: string): void {
        const rowsColumnsList: any[] = query["aggs"]["by"][axisName];
        let axisItemsList: any[] = [];
        let subTotalQuery = null;

        for (let i = 0; i < rowsColumnsList.length; i++) {
            subTotalQuery = JSON.parse(JSON.stringify(query));
            axisItemsList = axisItemsList.slice(0);
            axisItemsList.push(rowsColumnsList[i]);
            subTotalQuery["aggs"]["by"][axisName] = axisItemsList;

            aggregationQueries.set(JSON.stringify(axisItemsList), {
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

    private _splitGrandTotalQuery(query: any, aggregationQueries: Map <string, IQuery> ): void {
        const grandTotalQuery: any = JSON.parse(JSON.stringify(query));
        delete grandTotalQuery["aggs"]["by"];
        const definitionLabel: string = "grandTotal";

        aggregationQueries.set(definitionLabel, {
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