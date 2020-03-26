import {Db} from 'mongodb';

export type CollectionName = string;

export interface IDataAPI {

    /**
     * Returns the schema 
     * @method
     * @param {string} index MongoDB's collection name
     * @return {object} returns APISchemaObject
     */
    getSchema(mongoDBInstance: Db, index: CollectionName): Promise<object>;

    /**
     * Returns the members of the field 
     * @method
     * @param {string} index MongoDB's collection name
     * @param {object} fieldObject field's name
     * @param {number} page
     * @return {object}
     */
    getMembers(mongoDBInstance: Db, index: CollectionName, fieldObject: object, page: PagingInterface): Promise<any>


    /**
     * Returns calculations
     * @method
     * @param {string} index MongoDB's collection name
     * @param {object} query 
     * @param {number} page
     * @return {object}
     */
    getSelectResult(mongoDBInstance: Db, index: CollectionName, query: object, page: PagingInterface): Promise<any>;

}

export interface PagingInterface {
    page?: number;
    pageToken?: string;
}