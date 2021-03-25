import { Db } from "mongodb";

export interface IRequestArgument {

    db: Db
    index: string;
    fieldObject?: IRequestField;
    clientQuery: any;
    //page?: number;

}

export interface IRequestField {
    uniqueName: string,
    interval?: string
}