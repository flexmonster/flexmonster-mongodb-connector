import {Db} from 'mongodb';
import {CollectionName} from '../api/IDataAPI';

export class MongoQueryExecutor {

    private _mongoDBInstance: Db;

    constructor() {}

    public injectDBConnection(mongoDBInstance: Db) {
        this._mongoDBInstance = mongoDBInstance;
    }

    async runShemaQuery(collection: CollectionName) {
        return this._mongoDBInstance.collection(collection).findOne(null);
    }

    async runAggregateQuery(collection: CollectionName, pipeline: any[]) {
        return this._mongoDBInstance.collection(collection).aggregate(pipeline, { 
            allowDiskUse: true
        });
    }
}