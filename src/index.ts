import {Db} from 'mongodb';
import {CollectionName, IDataAPI, PagingInterface} from './api/IDataAPI';
import {MongoAPIManager} from './api/MongoAPIManager';
import { ConfigInterface } from './config/ConfigInterface';

export {ConfigInterface} from './config/ConfigInterface';
export class MongoDataAPI {

    private _mongoAPIManager: IDataAPI;

    public readonly API_VERSION: string = "2.9.0";

    constructor(config?: ConfigInterface) {
        this._mongoAPIManager = new MongoAPIManager(config, this.API_VERSION);
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
    public async getMembers(mongoDBInstance: Db, index: CollectionName, fieldObject: any, page: PagingInterface): Promise<any> {
        let membersObject = fieldObject;
        if (fieldObject["uniqueName"] !== undefined) {
            membersObject = {
                "field": fieldObject
            }
        }
        return this._mongoAPIManager.getMembers(mongoDBInstance, index, membersObject, page);
    }

    /**
     * Returns calculations
     * @method
     * @param {string} index MongoDB's collection name
     * @param {object} query 
     * @param {number} page
     * @return {object}
     */
    public async getSelectResult(mongoDBInstance: Db, index: CollectionName, query: object, page: PagingInterface): Promise<any> {
        return this._mongoAPIManager.getSelectResult(mongoDBInstance, index, query, page);
    }
}
