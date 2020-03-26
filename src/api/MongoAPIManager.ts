import {Db} from 'mongodb';
import {MongoQueryExecutor} from '../query/MongoQueryExecutor';
import {MongoResponseParser} from '../parsers/MongoResponseParser';
import {QueryBuilder} from '../query/builder/QueryBuilder';
import {IDataAPI, CollectionName, PagingInterface} from './IDataAPI';
import {RequestHandler} from '../handler/RequestHandler';
import { APISchema } from '../schema/APISchema';
import {IApiRequest} from "../requests/apiRequests/IApiRequest";
import {MembersApiRequest} from "../requests/apiRequests/impl/MembersApiRequest";
import { AggregationApiRequest } from '../requests/apiRequests/impl/AggregationApiRequest';
import { DrillThroughApiRequest } from '../requests/apiRequests/impl/DrillThroughApiRequest';
import { FlatApiRequest } from '../requests/apiRequests/impl/FlatApiRequest';

export class MongoAPIManager implements IDataAPI{

    private _mongoQueryManager: MongoQueryExecutor;
    private _mongoResponseParser: MongoResponseParser;
    private _queryBuilder: QueryBuilder;
    private _dataLoader: RequestHandler;
    private _mongoResultParser: MongoResponseParser;
    
    constructor() {
        this._mongoQueryManager = new MongoQueryExecutor();
        this._mongoResponseParser = new MongoResponseParser();
        this._mongoResultParser = new MongoResponseParser();
        this._queryBuilder = QueryBuilder.getInstance();
        this._dataLoader = new RequestHandler(this._queryBuilder, this._mongoQueryManager, this._mongoResultParser);
    }

    /**
     * Returns the schema 
     * @method
     * @param {string} index MongoDB's collection name
     * @return {object} returns schema object
     */
    public async getSchema(dbo: Db, index: string): Promise<APISchema> {
        this._mongoQueryManager.injectDBConnection(dbo);
        let document: any = await this._mongoQueryManager.runShemaQuery(index);
        this._mongoResponseParser.parseShemaFromDocument(document);

        return this._mongoResponseParser.parseShemaFromDocument(document).toJSON();
    }

    /**
     * Returns the members of the field 
     * @method
     * @param {string} index MongoDB's collection name
     * @param {any} fieldObject field's name
     * @param {number} page
     * @return {object}
     */
    public async getMembers(dbo: Db, index: CollectionName, fieldObject: any, pagingObject: PagingInterface): Promise<any> {
        let apiRequest: IApiRequest = (pagingObject.pageToken != null && this._dataLoader.isRequestRegistered(pagingObject.pageToken))
            ? this._dataLoader.getRegisteredRequest(pagingObject.pageToken) 
            : new MembersApiRequest({index: index, fieldObject: fieldObject})
        return this._dataLoader.loadData(dbo, apiRequest, pagingObject);
    }

    /**
     * Returns calculations
     * @method
     * @param {string} index MongoDB's collection name
     * @param {object} query 
     * @param {number} page
     * @return {object}
     */
    async getSelectResult(dbo: Db, index: CollectionName, query: any, pagingObject: PagingInterface) {

        let response = null;

        if (query["aggs"] != null && query["fields"] == null) {

            let apiRequest: IApiRequest = (pagingObject.pageToken != null && this._dataLoader.isRequestRegistered(pagingObject.pageToken))
                ? this._dataLoader.getRegisteredRequest(pagingObject.pageToken) 
                : new AggregationApiRequest({index: index, query: query});
            response = this._dataLoader.loadData(dbo, apiRequest, pagingObject);

        } else if (query["aggs"] == null && query["fields"] != null) {//drill-through

            let apiRequest: IApiRequest = (pagingObject.pageToken != null && this._dataLoader.isRequestRegistered(pagingObject.pageToken))
                ? this._dataLoader.getRegisteredRequest(pagingObject.pageToken) 
                : new DrillThroughApiRequest({index: index, query: query})
            response = this._dataLoader.loadData(dbo, apiRequest, pagingObject);
        } else if (query["aggs"] != null && query["fields"] != null) {// flat-form

            let apiRequest: IApiRequest = (pagingObject.pageToken != null && this._dataLoader.isRequestRegistered(pagingObject.pageToken))
                ? this._dataLoader.getRegisteredRequest(pagingObject.pageToken) 
                : new FlatApiRequest({index: index, query: query})
            response = this._dataLoader.loadData(dbo, apiRequest, pagingObject);
        }

        return response;
    }
}