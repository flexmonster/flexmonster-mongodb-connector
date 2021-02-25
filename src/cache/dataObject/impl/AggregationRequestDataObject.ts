import { DataRetrievalInterface, RetrievalResult } from "../DataRetrievalInterface";

export class AggregationRequestDataObject implements DataRetrievalInterface {

    private data: any[]; //[][]
    public timeForCalculation: number; // ms

    constructor(parsedData: any[], startDate: Date) {
        this.data = parsedData;
        this.timeForCalculation = new Date().getTime() - startDate.getTime();
    }

    public getChunk(iterator: IterableIterator<number>, chunkSize: number): RetrievalResult {
        let item = iterator.next();
        let chunk = this.data[item.value];
        let isFinished = item.done || item.value + 1 === this.data.length;

        return {
            data: chunk,
            isFinished: isFinished
        }
    }

    public getIterationKeys(): IterableIterator<number> {
        return this.data.keys();
    }

    public push(dataChunk: any[]): void {
        this.data.push(dataChunk);
    }    
}
