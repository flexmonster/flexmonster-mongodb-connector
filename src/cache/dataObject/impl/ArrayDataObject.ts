import { DataRetrievalInterface, RetrievalResult } from "../DataRetrievalInterface";

export class ArrayDataObject implements DataRetrievalInterface {

    private data: any[];

    constructor(parsedData: any[]) {
        this.data = parsedData;
    }

    getIterationKeys(): IterableIterator<number> {
        return this.data.keys();
    }

    getChunk(iterator: IterableIterator<number>, chunkSize: number): RetrievalResult {
        let chunk = null;
        let isFinished = false;
        if (chunkSize >= this.data.length) {
            chunk = this.data.slice(0);
            isFinished = true;
        } else {
            chunk = [];
            let item = iterator.next();
            let currentChunkSize = 0;

            while (!item.done && currentChunkSize < chunkSize) {
                chunk.push(this.data[item.value]);
                currentChunkSize++;
                item = iterator.next();
            }
            isFinished = item.done;
        }
        return {
            data: chunk,
            isFinished: isFinished
        }
    }
}