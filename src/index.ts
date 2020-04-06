import {Db} from 'mongodb';
import {CollectionName, IDataAPI, PagingInterface} from './api/IDataAPI';
import {MongoAPIManager} from './api/MongoAPIManager';

export class MongoDataAPI {

    private _mongoAPIManager: IDataAPI;

    public readonly API_VERSION: string = "2.8.4";

    constructor() {
        this._mongoAPIManager = new MongoAPIManager();
    }

    /**
     * Returns the schema 
     * @method
     * @param {string} index MongoDB's collection name
     * @return {APISchemaObject} returns APISchemaObject
     */
    public async getSchema(mongoDBInstance: Db, index: CollectionName): Promise<any> {
        return this._mongoAPIManager.getSchema(mongoDBInstance, index);
    }

    /**
     * Returns the members of the field 
     * @method
     * @param {string} index MongoDB's collection name
     * @param {any} fieldObject field's name
     * @param {number} page
     * @return {object}
     */
    public async getMembers(mongoDBInstance: Db, index: CollectionName, fieldObject: any, page: PagingInterface) {
        return this._mongoAPIManager.getMembers(mongoDBInstance, index, fieldObject, page);
    }

    /**
     * Returns calculations
     * @method
     * @param {string} index MongoDB's collection name
     * @param {object} query 
     * @param {number} page
     * @return {object}
     */
    public async getSelectResult(mongoDBInstance: Db, index: CollectionName, query: object, page: PagingInterface) {
        return this._mongoAPIManager.getSelectResult(mongoDBInstance, index, query, page);
    }
}
