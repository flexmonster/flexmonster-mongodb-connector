import { DataRetrievalInterface, RetrievalResult } from "../DataRetrievalInterface";

export class MapDataObject implements DataRetrievalInterface {

    private data: Map<string, any>;

    constructor(parsedData: Map<string, any>) {
        this.data = parsedData;
    }

    public getIterationKeys(): IterableIterator<string> {
        return this.data.keys();
    }

    public getChunk(iterator: IterableIterator<string>, chunkSize: number): RetrievalResult {
        let dataChunk: any[] = null;
        let isFinished = false;
        if (chunkSize >= this.data.size) {
            dataChunk = Array.from(this.data, ([key, value]) => value);
            isFinished = true;
        } else {
            dataChunk = [];
            let dataItem = iterator.next();
            let currentChunkSize = 0;
            while (!dataItem.done && currentChunkSize < chunkSize) {
                dataChunk.push(this.data.get(dataItem.value));
                currentChunkSize++;
                dataItem = iterator.next();
            }
            isFinished = dataItem.done;            
        }
        return {
            data: dataChunk,
            isFinished: isFinished
        }
    }    
}