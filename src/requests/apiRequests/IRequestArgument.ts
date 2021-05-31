import { Db } from "mongodb";
import { APISchema } from "../../schema/APISchema";

export interface IRequestArgument {

    db: Db
    index: string;
    fieldObject?: IRequestField;
    clientQuery: any;
    schema: APISchema
    //page?: number;

}

export interface IRequestField {
    uniqueName: string,
    interval?: string
}