import {QueryBuilder} from "../../query/builder/QueryBuilder";
import { IRequestArgument } from './IRequestArgument';
import { MongoQueryExecutor } from "../../query/MongoQueryExecutor";
import { APISchema } from "../../schema/APISchema";

export interface IApiRequest {
    
    requestArgument: IRequestArgument;
    getData(schema: APISchema, queryBuilder: QueryBuilder, queryExecutor: MongoQueryExecutor): Promise<any>;
    moveNext(): void;
    isFinished(): boolean;
    toJSON(response: any, nextpageToken?: string): any;
    
}