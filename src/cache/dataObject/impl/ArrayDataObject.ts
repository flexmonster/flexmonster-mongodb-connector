import { RetrievalResult } from "../DataRetrievalInterface";
import { AbstractDataObject } from "./AbstractDataObject";
import { clearInterval } from "timers";
import { Register } from "../../../requests/register/Register";

export class ArrayDataObject extends AbstractDataObject {

    private data: any[]; //[][]
    public computationTime: number; // ms
    public dataMemorySize: number;
    public isCompleted: boolean;
    //private subscriptionRegister: Register<string,>

    constructor(parsedData: any[], startDate: Date, dataMemorySize: number = 0) {
        super();
        this.data = parsedData;
        this.computationTime = new Date().getTime() - startDate.getTime();
        this.dataMemorySize = dataMemorySize;
        this.isCompleted = true;
    }

    public getChunk(iterator: Iterator<number>): RetrievalResult {
        let item = iterator.next();
        let chunk = this.data[item.value];
        let isFinished = item.done || item.value + 1 === this.data.length;

        return {
            data: chunk,
            isFinished: isFinished
        }
    }

    public async getChunkAsync(iterator: Iterator<number>): Promise<RetrievalResult> {
        const index: number = iterator.next().value;
        if (!this.isCompleted && index + 1 >= this.data.length) {
            return this.subscribeForChunk(index);
        }

        let isFinished = (index + 1 === this.data.length);
        return {
            data: this.data[index],
            isFinished: isFinished
        }
    }

    private async subscribeForChunk(index: number, code?: string): Promise<RetrievalResult> {
        return new Promise((resolve, reject) => {
            const intervalTimeout = setInterval(() => {
                if (index < this.data.length) {
                    clearInterval(intervalTimeout);
                    resolve({
                        data: this.data[index],
                        isFinished: (index + 1 === this.data.length && this.isCompleted)
                    });
                }
            }, 700);
        });
    }

    public getIterationKeys(): Iterator<number> {
        return this.data.keys();
    }

    public push(arrayDataObject: ArrayDataObject): void {
        this.dataMemorySize += arrayDataObject.dataMemorySize;
        this.computationTime += arrayDataObject.computationTime;
        for (let i: number = 0; i < arrayDataObject.data.length; i++) {
            this.data.push(arrayDataObject.data[i]);
        }
        return;
        // this.data.push(dataChunk);
        // if (dataMemorySize !== undefined) this.dataMemorySize += dataMemorySize;
    }

    public getNumberOfItems(): number {
        let numberOfMembers: number = 0;
        for (let i: number = 0; i < this.data.length; i++) {
            numberOfMembers+= this.data[i].length;
        }
        return numberOfMembers;
    }
}
