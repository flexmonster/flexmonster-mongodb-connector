import {SchemaBuilder} from '../schema/SchemaBuilder';
import {Delimeter} from '../utils/consts/Delimeters';
import {APISchema} from '../schema/APISchema';
import {IRequestField} from '../requests/apiRequests/IRequestArgument';
import {MongoFieldType} from '../utils/consts/MongoFieldType';
import { Cursor } from 'mongodb';
import { IQuery } from '../query/IQuery';
import { ArrayDataObject } from '../cache/dataObject/impl/ArrayDataObject';
import { MapDataObject } from '../cache/dataObject/impl/MapDataObject';

export class MongoResponseParser {

    private static _responseParserInstance: MongoResponseParser = null;

    constructor() {
        if (MongoResponseParser._responseParserInstance != null) {
            throw new Error("Initialization failed: "+
                "use Singleton.getInstance() instead of new.");
        }

        MongoResponseParser._responseParserInstance = this;
    }

    public static getInstance(): MongoResponseParser {
        if (MongoResponseParser._responseParserInstance == null) {
            MongoResponseParser._responseParserInstance = new MongoResponseParser();
        }
        return MongoResponseParser._responseParserInstance;
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

    public parseCalculationsFromCursor(cursor: Promise<any>, query: IQuery[], startDate: Date = null): Promise<MapDataObject> {
        return new Promise((resolve, reject) => {
            cursor.then(async (documents: any) => {
                resolve(new MapDataObject(await this.parseAggregations(documents, query, startDate)));
            });
        });
    }

    private async parseAggregations(documents: Cursor, queries: IQuery[], startDate: Date = null): Promise<Map<string, any>> {
        let result: Map<string, any> = new Map<string, any>();
        let keys = {};
        let values = {};
        if (startDate != null) console.log(">>>>>>>query", new Date().getTime() - startDate.getTime());
        await documents.forEach((data: any) => {
            //console.log(">>>>>>", data);
            let queryDefinition: string = null;
            for (let i = 0; i < queries.length; i++) {
                queryDefinition = queries[i].definition;
                for (let j = 0; j < data[queryDefinition].length; j++) {
                    keys = this.parseDotsFromKeys(data[queryDefinition][j]["_id"]);
                    values = this._parseValues(data[queryDefinition][j], {});                    
                    result.set(JSON.stringify(keys), {
                        "keys": keys,
                        "values": values
                    });
                }
            }
        });
        if (startDate != null) console.log(">>>>>>>parse", new Date().getTime() - startDate.getTime());
        return result;
    }

    public parseMembersFromCursor(cursor: Promise<any>, fieldObject: IRequestField): Promise<ArrayDataObject> {
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
                        resolve(new ArrayDataObject(result));
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
                    //resolve(this.parseAggregations(documents));
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