export interface DataRetrievalInterface {
    getChunk(iterator: Iterator<any>): RetrievalResult;
    getChunkAsync(iterator: Iterator<number>): Promise<RetrievalResult>;
    getIterationKeys(): Iterator<any>;
}

export interface RetrievalResult {
    data: any;
    isFinished: boolean;
}