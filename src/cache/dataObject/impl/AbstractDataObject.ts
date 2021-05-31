import { DataRetrievalInterface, RetrievalResult } from "../DataRetrievalInterface";
import { CachedDataInterface } from "../CachedDataInterface";

export abstract class AbstractDataObject implements DataRetrievalInterface, CachedDataInterface {

    computationTime: number;
    dataMemorySize: number;

    public getChunk(iterator: Iterator<any>): RetrievalResult {
        throw new Error("Method not implemented.");
    }

    public async getChunkAsync(iterator: Iterator<number>): Promise<RetrievalResult> {
        throw new Error("Method not implemented.");
    }
    
    public getIterationKeys(): Iterator<any> {
        throw new Error("Method not implemented.");
    }

}