import {QueryBuilder} from "../../query/builder/QueryBuilder";
import { IRequestArgument } from './IRequestArgument';
import { MongoQueryExecutor } from "../../query/MongoQueryExecutor";
import { APISchema } from "../../schema/APISchema";
//import { CachedDataInterface } from "../../cache/dataObject/CachedDataInterface";
//import { DataRetrievalInterface } from "../../cache/dataObject/DataRetrievalInterface";
import { AbstractDataObject } from "../../cache/dataObject/impl/AbstractDataObject";

export interface IApiRequest {
    loggingTemplate: string;
    requestArgument: IRequestArgument;
    getData(queryBuilder: QueryBuilder, queryExecutor: MongoQueryExecutor): Promise<AbstractDataObject>;
    moveNext(): void;
    isFinished(): boolean;
    toJSON(response: any, nextpageToken?: string): any;
    
}