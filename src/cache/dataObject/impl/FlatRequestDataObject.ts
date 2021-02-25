import { DataRetrievalInterface, RetrievalResult } from "../DataRetrievalInterface";

export class FlatResultDataObject implements DataRetrievalInterface {

    private data: FlatResultDataInterface;

    constructor(parsedData: any) {
        //console.log(">>>>>", parsedData);
        this.data = parsedData;
    }

    getChunk(iterator: IterableIterator<any>, chunkSize: number): RetrievalResult {
        let chunk: FlatResultDataInterface = null;
        let isFinished = false;
        if (chunkSize >= this.data.hits.length) {
            chunk = this.data;
            isFinished = true;
        } else {
            chunk = {
                fields: [],
                hits: []
            };
            let item = iterator.next();
            let currentChunkSize = 0;

            while (!item.done && currentChunkSize < chunkSize) {
                chunk.hits.push(this.data.hits[item.value]);
                currentChunkSize++;
                item = iterator.next();
            }

            chunk.fields = this.data.fields;
            isFinished = item.done;

            if (this.data.aggs !== undefined) {
                chunk.aggs = this.data.aggs;
            }
        }
        return {
            data: chunk,
            isFinished: isFinished
        }
    }
    getIterationKeys(): IterableIterator<any> {
        return this.data.hits.keys();
    }

}

interface FlatResultDataInterface {
    fields: object[] //fields 
    hits: [][], // raw data for flat and drill-through
    aggs?: {[key: string]: object}[] //aggs always has length 1 for flat and undefined for drill-through
}