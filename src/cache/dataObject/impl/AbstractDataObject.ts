import { DataRetrievalInterface, RetrievalResult } from "../DataRetrievalInterface";
import { CachedDataInterface } from "../CachedDataInterface";

export abstract class AbstractDataObject implements DataRetrievalInterface, CachedDataInterface {

    computationTime: number;
    dataMemorySize: number;

    public getChunk(iterator: IterableIterator<any>): RetrievalResult {
        throw new Error("Method not implemented.");
    }
    
    public getIterationKeys(): IterableIterator<any> {
        throw new Error("Method not implemented.");
    }

}