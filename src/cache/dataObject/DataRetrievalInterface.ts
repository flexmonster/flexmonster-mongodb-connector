import { IApiRequest } from "../../requests/apiRequests/IApiRequest";

export interface DataRetrievalInterface {
    getChunk(iterator: IterableIterator<any>): RetrievalResult;
    getIterationKeys(): IterableIterator<any>;
}

export interface RetrievalResult {
    data: any;
    isFinished: boolean;
}