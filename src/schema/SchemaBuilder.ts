import {APISchema} from './APISchema';
import {SchemaValueObject} from './SchemaValueObject';
import {MongoFieldType} from '../utils/consts/MongoFieldType'
import {ClientSideFieldType} from '../utils/consts/ClientSideFieldType'
import {SupportedAggregations} from '../utils/consts/SupportedAggregations'

export class SchemaBuilder {

    private _shemaObject: APISchema = null;

    private static _instance: SchemaBuilder;

    constructor() {
        if (SchemaBuilder._instance != null) throw new Error("Instantiation failed: "+
        "use Singleton.getInstance() instead of new.");
    }

    public static getInstance(): SchemaBuilder {
        if (this._instance == null) {
            this._instance = new SchemaBuilder();
        }        
        return this._instance;
    }

    public createShemaFromDocument(document: any): APISchema {
        this._shemaObject = new APISchema();
        this._parseDocumentShema(document, "");
        return this._shemaObject;
    }

    private _parseDocumentShema(documentObj: any, folder: string) {
        let element = null;
        let fieldsType = null;
        let fieldsKey: string = "";
        for (let fieldsCaption in documentObj) {
            element = documentObj[fieldsCaption];
            fieldsType = typeof element;
            fieldsKey = this._getKeyFromFolder(folder, fieldsCaption);
            if (MongoFieldType.FUNCTION == fieldsType) {
                continue;
            } else if (MongoFieldType.STRING == fieldsType || MongoFieldType.BOOLEAN == fieldsType || fieldsCaption == "_id" || element === null) {
                this._shemaObject.fields.set(fieldsKey, this._createSchemaObject(fieldsKey, fieldsCaption, ClientSideFieldType.STRING, folder));
            } else if (MongoFieldType.NUMBER == fieldsType) {
                this._shemaObject.fields.set(fieldsKey, this._createSchemaObject(fieldsKey, fieldsCaption, ClientSideFieldType.NUMBER, folder));
            } else if (MongoFieldType.OBJECT == fieldsType && element instanceof Date) {
                this._shemaObject.fields.set(fieldsKey, this._createSchemaObject(fieldsKey, fieldsCaption, ClientSideFieldType.DATE, folder));
            } else if (MongoFieldType.OBJECT == fieldsType && (Array.isArray(element) || element instanceof ArrayBuffer)) {
                continue;
            } else if (MongoFieldType.OBJECT == fieldsType && fieldsCaption != "_id" && element != null
                && element["_bsontype"] != null && element["_bsontype"] == MongoFieldType.DECIMAL128) {
                this._shemaObject.fields.set(fieldsKey, this._createSchemaObject(fieldsKey, fieldsCaption, ClientSideFieldType.NUMBER, folder));
            } else if (MongoFieldType.OBJECT == fieldsType && fieldsCaption != "_id" && element != null && element["_bsontype"] == null) {
                this._parseDocumentShema(element, (folder == "") ? fieldsCaption.toString() : folder + "/" + fieldsCaption.toString());
            }
        }
    }

    private _createSchemaObject(key: string, caption: string , type: string, folder: string) {
        let shemaObject = new SchemaValueObject(key, type, caption);

        if (folder != "") {
            shemaObject.folder = folder;
        }
        if (ClientSideFieldType.NUMBER == type) {
            shemaObject.aggregations = this._getAggregationList(SupportedAggregations.numericFieldAggregations);
        } else if (ClientSideFieldType.DATE == type) {
            shemaObject.aggregations = this._getAggregationList(SupportedAggregations.dateFieldAggregations);
        } else {
            shemaObject.aggregations = this._getAggregationList(SupportedAggregations.nonNumericFieldAggregations);
        }
        return shemaObject;
    }

    private _getAggregationList(supportedAggregations: any) {
        let aggregations = [];
        for (let keys in supportedAggregations) {
            aggregations.push(keys.toString());
        }
        return aggregations;
    }

    private _getKeyFromFolder(folder: string, key: string) {
        return (folder != "") ? folder.replace(/\//g, '.') + '.' + key : key;
    }
}