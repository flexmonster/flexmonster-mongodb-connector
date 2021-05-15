import { RetrievalResult } from "../DataRetrievalInterface";
//import { CachedDataInterface } from "../CachedDataInterface";
import { AbstractDataObject } from "./AbstractDataObject";

export class ArrayDataObject extends AbstractDataObject {//implements DataRetrievalInterface, CachedDataInterface {

    private data: any[]; //[][]
    public computationTime: number; // ms
    public dataMemorySize: number;

    constructor(parsedData: any[], startDate: Date, dataMemorySize: number = 0) {
        super();
        this.data = parsedData;
        this.computationTime = new Date().getTime() - startDate.getTime();
        this.dataMemorySize = dataMemorySize;
    }

    public getChunk(iterator: IterableIterator<number>): RetrievalResult {
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

    public push(dataChunk: any[], dataMemorySize?: number): void {
        this.data.push(dataChunk);
        if (dataMemorySize !== undefined) this.dataMemorySize += dataMemorySize;
    }

    public getNumberOfItems(): number {
        let numberOfMembers: number = 0;
        for (let i: number = 0; i < this.data.length; i++) {
            numberOfMembers+= this.data[i].length;
        }
        return numberOfMembers;
    }
}
