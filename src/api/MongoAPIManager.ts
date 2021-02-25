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
import { DataManager } from '../cache/DataManager';
import { LocalDataCache } from '../cache/impl/LocalDataCache';
import { IDataCache } from '../cache/IDataCache';

export class MongoAPIManager implements IDataAPI{

    private _mongoQueryManager: MongoQueryExecutor;
    private _mongoResponseParser: MongoResponseParser;
    private _cacheManager: IDataCache<string, any>;
    private _dataManager: DataManager;
    private _queryBuilder: QueryBuilder;
    private _dataLoader: RequestHandler;
    private _schemaCache: {[index: string]: APISchema};
    
    constructor() {
        this._mongoQueryManager = new MongoQueryExecutor();
        this._mongoResponseParser = MongoResponseParser.getInstance();
        //this._cacheManager = LocalDataCache.getInstance();
        this._queryBuilder = QueryBuilder.getInstance();
        this._dataManager = new DataManager(this._queryBuilder, this._mongoQueryManager);
        this._dataLoader = new RequestHandler(this._queryBuilder, this._mongoQueryManager, this._dataManager);
        this._schemaCache = {};
    }

    /**
     * Returns the schema 
     * @method
     * @param {string} index MongoDB's collection name
     * @return {object} returns schema object
     */
    public async getSchema(dbo: Db, index: string): Promise<APISchema> {
        if (typeof index != 'string') throw new Error("Incorrect index format");
        this._mongoQueryManager.injectDBConnection(dbo);
        const dbName: string = dbo.databaseName;
        if (this.getIndexSchema(dbName, index) == null) {
            //console.log(">>>>>>", index, dbo);
            let document: any = await this._mongoQueryManager.runShemaQuery(index);
            this.setIndexSchema(dbName, index ,this._mongoResponseParser.parseShemaFromDocument(document));
        }
        return this.getIndexSchema(dbName, index).toJSON();
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
        let apiRequest: IApiRequest = /*(pagingObject.pageToken != null && this._dataLoader.isRequestRegistered(pagingObject.pageToken))
            ? this._dataLoader.getRegisteredRequest(pagingObject.pageToken) 
            :*/ new MembersApiRequest({index: index, fieldObject: fieldObject, clientQuery: {"members": fieldObject}})
        return this._dataLoader.loadData(dbo, this.getIndexSchema(dbo.databaseName, index), apiRequest, pagingObject);
    }

    /**
     * Returns calculations
     * @method
     * @param {string} index MongoDB's collection name
     * @param {object} query 
     * @param {number} page
     * @return {object}
     */
    public async getSelectResult(dbo: Db, index: CollectionName, query: any, pagingObject: PagingInterface) {

        let response = null;

        if (query["aggs"] != null && query["fields"] == null) {

            let apiRequest: IApiRequest = /* (pagingObject.pageToken != null && this._dataLoader.isRequestRegistered(pagingObject.pageToken))
                ? this._dataLoader.getRegisteredRequest(pagingObject.pageToken) 
                :*/ new AggregationApiRequest({index: index, clientQuery: query});
            response = this._dataLoader.loadData(dbo, this.getIndexSchema(dbo.databaseName, index), apiRequest, pagingObject);

        } else if (query["aggs"] == null && query["fields"] != null) {//drill-through

            let apiRequest: IApiRequest = /* (pagingObject.pageToken != null && this._dataLoader.isRequestRegistered(pagingObject.pageToken))
                ? this._dataLoader.getRegisteredRequest(pagingObject.pageToken) 
                :*/ new DrillThroughApiRequest({index: index, clientQuery: query})
            response = this._dataLoader.loadData(dbo, this.getIndexSchema(dbo.databaseName, index), apiRequest, pagingObject);
        } else if (query["aggs"] != null && query["fields"] != null) {// flat-form

            let apiRequest: IApiRequest = /*(pagingObject.pageToken != null && this._dataLoader.isRequestRegistered(pagingObject.pageToken))
                ? this._dataLoader.getRegisteredRequest(pagingObject.pageToken) 
                :*/ new FlatApiRequest({index: index, clientQuery: query})
            response = this._dataLoader.loadData(dbo, this.getIndexSchema(dbo.databaseName, index), apiRequest, pagingObject);
        }

        return response;
    }

    private getIndexSchema(dbName: string, index: string): APISchema {
        return this._schemaCache[`${dbName}_${index}`];
    }

    private setIndexSchema(dbName: string, index: string, apiSchema: APISchema): void {
        this._schemaCache[`${dbName}_${index}`] = apiSchema;
    }
}