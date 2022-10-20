import {Db} from 'mongodb';
import {MongoQueryExecutor} from '../query/MongoQueryExecutor';
import {MongoResponseParser} from '../parsers/MongoResponseParser';
import {QueryBuilder} from '../query/builder/QueryBuilder';
import {IDataAPI, CollectionName, PagingInterface} from './IDataAPI';
import { APISchema } from '../schema/APISchema';
import { DataManager } from '../cache/DataManager';
import { ConfigInterface } from '../config/ConfigInterface';
import { ConfigManager } from '../config/ConfigManager';
import { LoggingManager } from '../logging/LoggingManager';
import { RequestType } from '../requests/apiRequests/RequestType';

export class MongoAPIManager implements IDataAPI{

    private _mongoQueryManager: MongoQueryExecutor;
    private _mongoResponseParser: MongoResponseParser;
    private _dataManager: DataManager;
    private _queryBuilder: QueryBuilder;
    private _schemaCache: {[index: string]: APISchema};
    private _configManager: ConfigManager;
    private _apiVersion: string
    
    constructor(config: ConfigInterface, apiVersion: string) {

        this._apiVersion = apiVersion;
        this.initializeComponents(config);
    }

    /**
     * Returns the schema 
     * @method
     * @param {string} index MongoDB's collection name
     * @return {object} returns schema object
     */
    public async getSchema(dbo: Db, index: string): Promise<object> {
        const apiSchema = await this._getSchema(dbo, index);
        return apiSchema.toJSON();
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
        const apiSchema = await this._getSchema(dbo, index);
        return this._dataManager.getData({
                index: index, 
                fieldObject: fieldObject["field"], 
                clientQuery: {"members": fieldObject}, 
                db: dbo, 
                schema: apiSchema
            }, 
            RequestType.MEMBERS_REQUEST, pagingObject);
    }

    /**
     * Returns calculations
     * @method
     * @param {string} index MongoDB's collection name
     * @param {object} query 
     * @param {number} page
     * @return {object}
     */
    public async getSelectResult(dbo: Db, index: CollectionName, query: any, pagingObject: PagingInterface): Promise<any> {

        let response = null;
        const apiSchema = await this._getSchema(dbo, index);

        if (query["aggs"] != null && query["fields"] == null) {
            
            response = this._dataManager.getData({
                    index: index,
                    clientQuery: query,
                    db: dbo,
                    schema: apiSchema
                }, 
                RequestType.AGGREGATION_REQUEST, pagingObject);

        } else if (query["aggs"] == null && query["fields"] != null) {//drill-through

            response = this._dataManager.getData({
                    index: index,
                    clientQuery: query,
                    db: dbo,
                    schema: apiSchema
                }, 
                RequestType.DRILLTHROUGH_REQUEST, pagingObject);
        } else if (query["aggs"] != null && query["fields"] != null) {// flat-form

            response = this._dataManager.getData({
                    index: index,
                    clientQuery: query,
                    db: dbo,
                    schema: apiSchema
                }, 
                RequestType.FLAT_REQUEST, pagingObject);
        }

        return response;
    }

    /**
     * Returns the schema 
     * @method
     * @param {string} index MongoDB's collection name
     * @return {APISchema} returns APISchema object
     */
    private async _getSchema(dbo: Db, index: string): Promise<APISchema> {
        if (typeof index != 'string') throw new Error("Incorrect index format");
        this._mongoQueryManager.injectDBConnection(dbo);
        const dbName: string = dbo.databaseName;
        if (this._schemaCache[`${dbName}_${index}`] == null) {
            //console.log(">>>>>>", index, dbo);
            let document: any = await this._mongoQueryManager.runShemaQuery(index);
            this._schemaCache[`${dbName}_${index}`] = this._mongoResponseParser.parseShemaFromDocument(document);
            LoggingManager.log(`Quering database ${dbName} to get schema of index ${index}`);
        } else {
            LoggingManager.log(`Getting schema of index ${index} of database ${dbName} from cache`);
        }
        return this._schemaCache[`${dbName}_${index}`];
    }

    private initializeComponents(config: ConfigInterface): void {
        this._configManager = ConfigManager.getInstance(config);
        this._mongoQueryManager = new MongoQueryExecutor();
        this._mongoResponseParser = MongoResponseParser.getInstance();
        new LoggingManager(this._configManager.currentConfig.logsEnabled);

        this._queryBuilder = QueryBuilder.getInstance();
        this._dataManager = new DataManager(this._queryBuilder, this._mongoQueryManager);

        this._schemaCache = {};
        LoggingManager.log("Version:", this._apiVersion);
        LoggingManager.log("Started with the following config", this._configManager);
    } 

}