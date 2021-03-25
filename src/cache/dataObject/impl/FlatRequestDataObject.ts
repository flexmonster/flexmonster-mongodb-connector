import { DataRetrievalInterface, RetrievalResult } from "../DataRetrievalInterface";
import { CachedDataInterface } from "../CachedDataInterface";
import { AbstractDataObject } from "./AbstractDataObject";

export class FlatResultDataObject extends AbstractDataObject { //implements DataRetrievalInterface, CachedDataInterface {

    public computationTime: number;
    public dataMemorySize: number;
    private data: FlatResultDataInterface;

    constructor(parsedData: any, dataMemorySize: number, startDate: Date) {
        super();
        //console.log(">>>>>", parsedData);
        this.data = parsedData;
        this.computationTime = new Date().getTime() - startDate.getTime();
        this.dataMemorySize = dataMemorySize;
    }

    getChunk(iterator: IterableIterator<number>, chunkSize: number): RetrievalResult {
        let iteratorItem = iterator.next();
        let isFinished = iteratorItem.done || iteratorItem.value + 1 === this.data.hits.length;
        
        let chunk: FlatResultDataInterface = {
            fields: this.data.fields,
            hits: this.data.hits[iteratorItem.value]
        };

        if (this.data.aggs !== undefined) {
            chunk.aggs = this.data.aggs;
        }

        // if (chunkSize >= this.data.hits.length) {
        //     chunk = this.data;
        //     isFinished = true;
        // } else {
        //     chunk = {
        //         fields: [],
        //         hits: []
        //     };
        //     let item = iterator.next();
        //     let currentChunkSize = 0;

        //     while (!item.done && currentChunkSize < chunkSize) {
        //         chunk.hits.push(this.data.hits[item.value]);
        //         currentChunkSize++;
        //         item = iterator.next();
        //     }

        //     chunk.fields = this.data.fields;
        //     isFinished = item.done;

        //     if (this.data.aggs !== undefined) {
        //         chunk.aggs = this.data.aggs;
        //     }
        // }

        return {
            data: chunk,
            isFinished: isFinished
        }
    }
    getIterationKeys(): IterableIterator<any> {
        return this.data.hits.keys();
    }

}

export interface FlatResultDataInterface {
    fields: any[] //fields 
    hits: [][], // raw data for flat and drill-through
    aggs?: {[value: string]: object}[] //aggs always has length 1 for flat and undefined for drill-through
}