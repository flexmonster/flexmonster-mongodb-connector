import { DataRetrievalInterface, RetrievalResult } from "../DataRetrievalInterface";

export class ArrayDataObject implements DataRetrievalInterface {

    private data: any[];
    public dataSize: number; // dataSize in bytes
    public timeForCalculation: number; // ms

    constructor(parsedData: any[], startDate: Date = new Date()) {
        this.data = parsedData;
        this.dataSize = 
        this.timeForCalculation = new Date().getTime() - startDate.getTime();
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