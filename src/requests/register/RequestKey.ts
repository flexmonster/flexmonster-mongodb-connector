import {HashGenerator} from '../../utils/HashGenerator';
import {IKeyRegister} from './IKeyRegister';

export class RequestKey implements IKeyRegister {

    fmQuery: any;
    private readonly _hash: string;

    constructor(fmQuery: any) {
        this.fmQuery = fmQuery;
        this._hash = HashGenerator.createHashFromString(JSON.stringify(this.fmQuery) + new Date().getTime().toString());
    }

    hash: () => string = () => {
        return this._hash;
    };

}