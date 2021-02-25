export interface IQuery {
    readonly definition: string;
    clientQuery: any;
    queryStats?: QueryStats;
}

export interface QueryStats {
    expectedNumberOfRecords: number;
    loadedNumberOfRecords: number;
    isAllQueryDataLoaded: false;
    intersectionList: string[]; //the list of uniqueNames
}