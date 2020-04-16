import {SchemaBuilder} from '../schema/SchemaBuilder';
import {Delimeter} from '../utils/consts/Delimeters';
import {APISchema} from '../schema/APISchema';
import {IRequestField} from '../requests/apiRequests/IRequestArgument';
import {MongoFieldType} from '../utils/consts/MongoFieldType';
import { Cursor } from 'mongodb';

export class MongoResponseParser {

    constructor() {
        if (MongoResponseParser._responseParser != null) {
            throw new Error("Instantiation failed: "+
                "use Singleton.getInstance() instead of new.");
        }
    }

    private static _responseParser: MongoResponseParser;

    public static getInstance(): MongoResponseParser {
        if (MongoResponseParser._responseParser == null) {
            MongoResponseParser._responseParser = new MongoResponseParser();
        }
        return MongoResponseParser._responseParser;
    }

    public parseShemaFromDocument(document: Promise<any>): APISchema {
        return SchemaBuilder.getInstance().createShemaFromDocument(document);
    }

    private _parseValues(values: any, storage: any) {
        let measure = null;
        let measureKey = null;
        let regexp = new RegExp(Delimeter.DOTS_DELIMETER, "g");
        for (let key in values) {
            if (key == "_id") continue;
            measure = key.toString().split(Delimeter.FIELD_DELIMETER);
            measureKey = measure[0].replace(regexp, '.');
            if (storage[measureKey] == null) storage[measureKey] = {};
            storage[measureKey][measure[1]] = this.parseValueFromComplexType(values[key])
        }
        return storage;
    }

    public parseCalculationsFromCursor(cursor: Promise<any>): Promise<any[]> {
        return new Promise((resolve, reject) => {
            cursor.then((documents: any) => {
                resolve(this.parseAggregations(documents));
            });
        });
    }

    private async parseAggregations(documents: Cursor): Promise<any> {
        let result: any[] = [];
        let keys = {};
        let values = {};
        await documents.forEach((data: any) => {
            keys = this.parseDotsFromKeys(data["_id"]);
            values = this._parseValues(data, {});
            result.push({
                "keys": keys,
                "values": values
            });
        });
        return {
            "aggs": result
        };
    }

    public parseMembersFromCursor(cursor: Promise<any>, fieldObject: IRequestField): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const fieldUniqueName: string = fieldObject.uniqueName;
            cursor.then((documents: any) => {
                let result: any[] = [];
                let keyWithoutDots: string = fieldUniqueName.replace(/\./g, Delimeter.DOTS_DELIMETER);
                documents.forEach((data: any) => {
                        let value = data["_id"][keyWithoutDots];
                        result.push({
                            "value": this.parseValueFromComplexType(value)
                        });
                    }, () => {
                        resolve(result);
                });
            });
        });
    }

    public parseFlatFromCursor(cursor: Promise<any>, fields: IRequestField[], isGrandTotal: boolean): Promise<any[]> {
        return new Promise((resolve, reject) => {
            cursor.then(async (documents: Cursor) => {
                if (!isGrandTotal) {
                    resolve(this.parseDrillThroughData(documents, fields));
                } else {
                    resolve(this.parseAggregations(documents));
                }
            });
        });
    }

    public parseDrillThroughFromCursor(cursor: Promise<any>, fields: IRequestField[]): Promise<any[]> {
        return new Promise((resolve, reject) => {
            cursor.then((documents: any) => {
                resolve(this.parseDrillThroughData(documents, fields));
            });
        });
    }

    private async parseDrillThroughData (documents: Cursor, fields: IRequestField[]): Promise<any> {
        const result: any = {
            "fields": [],
            "hits": []
        };
        let document: any = null;
        await documents.forEach((data: any) => {
            document = data;
            result["hits"].push(this.parseDrillThroughHit(document, fields));
        });
        result["fields"] = this.parseDrillThroughFields(fields);
        return result;
    }

    private parseDrillThroughFields(fieldsFromQuery: IRequestField[]): any[] {
        const fields: any[] = [];
        for (let i = 0; i < fieldsFromQuery.length; i++) {
            fields.push({
               "uniqueName": fieldsFromQuery[i].uniqueName
            });
        }
        return fields;
    }

    private parseDrillThroughHit(document: any, fieldsFromQuery: IRequestField[]): any[] {
        const hit: any[] = [];
        for (let i = 0; i < fieldsFromQuery.length; i++) {
            const fieldKey: string = fieldsFromQuery[i].uniqueName;
            hit.push(this._getNestedObjectValue(fieldKey, document));
        }
        return hit;
    }

    private _getNestedObjectValue(key: string, data: any) {
        let keyItems = key.split('.');
        let value = null;
        let i = 0;
        while (i < keyItems.length) {
            data = data[keyItems[i]];
            i++;
        }
        value = data;
        return this.parseValueFromComplexType(value);
    }

    private parseValueFromComplexType(value: any): any {
        let resultValue = value;
        if (value != null && value["_bsontype"] != null && value["_bsontype"] == MongoFieldType.DECIMAL128) {
            resultValue = parseFloat(value.toString());
        } else if (value != null && value["_bsontype"] != null) {
            resultValue = value.toString();
        }
        return resultValue;
    }

    private parseDotsFromKeys(fieldsKeys: any) {
        let result: any = {};
        let keyValue = null;
        let regexp = new RegExp(Delimeter.DOTS_DELIMETER, "g");
        for (let key in fieldsKeys) {
            keyValue = key.replace(regexp, '.');
            result[keyValue] = this.parseValueFromComplexType(fieldsKeys[key]);
        }
        return result;
    }
}