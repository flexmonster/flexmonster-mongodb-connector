export interface IQuery {
    readonly definition: string;
    clientQuery: any;
    queryStats?: QueryStats;
}

export interface QueryStats {
    expectedNumberOfRecords?: number;
    sumOfLoadedRecords?: number;
    loadedNumberOfRecords?: number;
    chunkToLoad?: number;
    isAllQueryDataLoaded?: false;
}