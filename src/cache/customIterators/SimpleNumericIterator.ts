export class SimpleNumericIterator implements Iterator<number, any, undefined> {
    
    private index: number;

    constructor() {
        this.index = 0;
    }    
    
    next(...args: []): IteratorResult<number, any> {
        const value: number = this.index++;
        const done: boolean = false;
        return {
            done,
            value
        }
    }

}