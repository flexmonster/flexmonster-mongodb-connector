export interface DataRetrievalInterface {
    getChunk(iterator: IterableIterator<any>, chunkSize: number): RetrievalResult;
    getIterationKeys(): IterableIterator<any>;
}

export interface RetrievalResult {
    data: any;
    isFinished: boolean;
}