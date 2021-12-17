import {SchemaBuilder} from '../schema/SchemaBuilder';
import {Delimeter} from '../utils/consts/Delimeters';
import {APISchema} from '../schema/APISchema';
import {IRequestField} from '../requests/apiRequests/IRequestArgument';
import {MongoFieldType} from '../utils/consts/MongoFieldType';
import { IQuery } from '../query/IQuery';
import { ArrayDataObject } from '../cache/dataObject/impl/ArrayDataObject';
import { FlatResultDataObject } from '../cache/dataObject/impl/FlatRequestDataObject';
import { MemoryCalculator, MemoryConstants } from '../utils/MemoryCalculator';
import { AggregationApiRequest } from '../requests/apiRequests/impl/AggregationApiRequest';
import { AggregationCursor } from 'mongodb';

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
        let valueParsed = null;
        let dataMemorySize = MemoryConstants.REFERENCE * 2;
        //let regexp = new RegExp(Delimeter.DOTS_DELIMETER, "g");
        for (let key in values) {
            if (key == "_id") continue;
            measure = key.toString().split(Delimeter.FIELD_DELIMETER);
            measureKey = measure[0].replace(this.dotsDelimeterRegExp, '.');
            if (typeof storage[measureKey] === "undefined") {
                storage[measureKey] = {};
                dataMemorySize += MemoryConstants.REFERENCE + MemoryConstants.REFERENCE * 2; // reference to the object memory + minimum required object size
            }
            valueParsed = this.parseValueFromComplexType(values[key]);
            storage[measureKey][measure[1]] = valueParsed.value;
            dataMemorySize += MemoryConstants.REFERENCE + valueParsed.memorySize;
        }
        return {
            "value": storage,
            "memorySize": MemoryCalculator.roundTo8bytes(dataMemorySize)
        };
    }

    public parseCalculationsFromCursor(cursor: Promise<any>, query: IQuery[], dataChunkSize: number, startDate: Date = null,
        aggregationApiRequest: AggregationApiRequest): Promise<ArrayDataObject> {
        return new Promise((resolve, reject) => {
            cursor.then(async (documents: AggregationCursor) => {
                const parsingResult = await this.parseAggregations(documents, query, dataChunkSize, startDate, aggregationApiRequest);
                resolve(new ArrayDataObject(parsingResult.result, parsingResult.startDate, parsingResult.memorySize));
            });
        });
    }

    private async parseAggregations(documents: AggregationCursor, queries: IQuery[], dataChunkSize: number, startDate: Date = null, 
        aggregationApiRequest: AggregationApiRequest): Promise<any> {

        let parsedData: any[] = [];
        let dataChunk: any[] = [];
        let keysParsed: any = null;
        let valuesParsed: any = null;
        let dataMemorySize: number = 0;
        let parseStart: Date = null;

        await documents.forEach((data: any) => {
            //console.log(">>>>>>", data);
            parseStart = new Date();
            aggregationApiRequest.updateLoadingStatus(data);
            let queryDefinition: string = null;
            for (let i = 0; i < queries.length; i++) {
                queryDefinition = queries[i].definition;
                for (let j = 0; j < data[queryDefinition].length; j++) {
                    keysParsed = this.parseDotsFromKeys(data[queryDefinition][j]["_id"]);
                    valuesParsed = this._parseValues(data[queryDefinition][j], {});
                    if (dataChunkSize <= dataChunk.length) {
                        parsedData.push(dataChunk);
                        dataChunk = [];
                        dataMemorySize += 2 * MemoryConstants.REFERENCE;
                    }
                    dataChunk.push({
                        "keys": keysParsed["value"],
                        "values": valuesParsed["value"]
                    });
                    dataMemorySize += 2 * MemoryConstants.REFERENCE + 2 * MemoryConstants.REFERENCE + keysParsed.memorySize + valuesParsed.memorySize;
                }
                data[queryDefinition] = null;
            }
            parsedData.push(dataChunk);
            dataMemorySize += 4 * MemoryConstants.REFERENCE;
        });
        // console.log(">>>>>>>allTime", new Date().getTime() - startDate.getTime());
        // console.log(">>>>>>>>just parsing", new Date().getTime() - parseStart.getTime());
        return {
            startDate: startDate,
            result: parsedData,
            memorySize: dataMemorySize
        };
    }

    public parseMembersFromCursor(cursor: Promise<any>, fieldObject: IRequestField, dataChunkSize: number, startDate: Date): Promise<ArrayDataObject> {
        return new Promise((resolve, reject) => {
            const fieldUniqueName: string = fieldObject.uniqueName;
            let membersMemorySize: number = 0;
            cursor.then((documents: any) => {
                //let startParse = new Date();
                let result: any[] = [];
                let membersChunk: any[] = [];
                let keyWithoutDots: string = fieldUniqueName.replace(/\./g, Delimeter.DOTS_DELIMETER);
                let parsedResult: any = null;
                documents.forEach((data: any) => {
                        let value = data["_id"][keyWithoutDots];
                        
                        if (membersChunk.length >= dataChunkSize) {
                            result.push(membersChunk);
                            membersChunk = [];
                            membersMemorySize += MemoryConstants.REFERENCE * 2; //MemoryCalculator.calculateMemberObjectSize();
                        }

                        parsedResult = this.parseValueFromComplexType(value);
                        const membersObject = {
                            "value": parsedResult.value
                        };
                        membersMemorySize += MemoryConstants.REFERENCE * 2 + MemoryConstants.REFERENCE + parsedResult.memorySize; //MemoryCalculator.calculateMemberObjectSize([membersObject[MEMBERS_KEY]]);
                        membersChunk.push(membersObject);
                    }, () => {
                        result.push(membersChunk);
                        membersMemorySize += MemoryConstants.REFERENCE * 2 + MemoryConstants.REFERENCE * 2;// adding size of internal array plus the array that stores all arrays (result)
                        //console.log(">>>>>>>>parsing", new Date().getTime() - startParse.getTime());

                        resolve(new ArrayDataObject(result, startDate, membersMemorySize));
                });
            });
        });
    }

    public parseFlatFromCursor(cursor: Promise<any>, fields: IRequestField[], queries: IQuery[], dataChunkSize: number, startDate: Date): Promise<FlatResultDataObject> {
        return new Promise((resolve, reject) => {
            const result: any = {
                "fields": [],
                "hits": [],
                "aggs": []
            };
            let hitsChunk: any[] = [];
            let keys = null;
            let values = null;
            let flatDataMemorySize = 0;
            let parsedData = null;
            cursor.then(async (documents: any) => {
                await documents.forEach((data: any) => {

                    let queryDefinition: string = null;
                    for (let i = 0; i < queries.length; i++) {
                        queryDefinition = queries[i].definition;

                        if (queryDefinition === "dataRecords") {
                            const fieldTypes = this.defineFieldTypesFromData(data[queryDefinition][0]);

                            for (let j = 0; j < data[queryDefinition].length; j++) {
                                if (hitsChunk.length >= dataChunkSize) {
                                    result.hits.push(hitsChunk);
                                    flatDataMemorySize += MemoryConstants.REFERENCE * 2;
                                    hitsChunk = [];
                                }
                                parsedData = this.parseDrillThroughHit(data[queryDefinition][j], fields, fieldTypes);
                                flatDataMemorySize += parsedData.hitMemorySize;
                                hitsChunk.push(parsedData.hit);
                            }
                            result.hits.push(hitsChunk);
                            flatDataMemorySize += MemoryConstants.REFERENCE * 4; // also counting references for the root hits array
                        } else {
                            for (let j = 0; j < data[queryDefinition].length; j++) {
                                keys = this.parseDotsFromKeys(data[queryDefinition][j]["_id"]).value;
                                values = this._parseValues(data[queryDefinition][j], {});     
                                result.aggs.push({
                                    "keys": keys,
                                    "values": values.value
                                });
                            }
                        }
                    }
                });

                result["fields"] = this.parseDrillThroughFields(fields);
                flatDataMemorySize += MemoryCalculator.calculateFlatDataSize(result);
                resolve(new FlatResultDataObject(result, flatDataMemorySize, startDate));
            });
        });
    }

    private defineFieldTypesFromData(dataRow: any[]): string[] {
        const fieldTypes: string[] = [];

        for (let i = 0; i < dataRow.length; i++) {
            if (typeof dataRow[i] === "number") {
                fieldTypes.push(MongoFieldType.NUMBER);
            } else {
                fieldTypes.push(MongoFieldType.STRING);
            }
        }

        return fieldTypes;
    }

    public parseDrillThroughFromCursor(cursor: Promise<any>, fields: IRequestField[], dataChunkSize: number, startDate: Date): Promise<FlatResultDataObject> {
        return new Promise((resolve, reject) => {
            cursor.then(async (documents: any) => {
                const parsingResult = await this.parseDrillThroughData(documents, fields, dataChunkSize);
                resolve(new FlatResultDataObject(parsingResult.data, parsingResult.dataMemorySize, startDate));
            });
        });
    }

    private async parseDrillThroughData(documents: AggregationCursor, fields: IRequestField[], dataChunkSize: number): Promise<any> {
        const result: any = {
            "fields": [],
            "hits": []
        };
        let document: any = null;
        let hitsChunk: any[] = [];
        let fieldTypes: string[] = null;
        let drillThroughMemoryDataSize = 0;
        let parsingResult = null;
        await documents.forEach((data: any) => {
            document = data;
            fieldTypes = fieldTypes === null ? this.defineFieldTypesFromData(document) : fieldTypes;

            if (hitsChunk.length >= dataChunkSize) {
                result.hits.push(hitsChunk);
                drillThroughMemoryDataSize += MemoryConstants.REFERENCE * 2;
                hitsChunk = [];
            }
            parsingResult = this.parseDrillThroughHit(document, fields, fieldTypes);
            drillThroughMemoryDataSize += parsingResult.hitMemorySize;
            hitsChunk.push(parsingResult.hit);
        });
        result.hits.push(hitsChunk);        
        result["fields"] = this.parseDrillThroughFields(fields);

        drillThroughMemoryDataSize += MemoryCalculator.calculateFlatDataSize(result);
        drillThroughMemoryDataSize += MemoryConstants.REFERENCE * 4; // also counting references for the root hits array

        return {
            data: result,
            dataMemorySize: drillThroughMemoryDataSize
        };
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

    private parseDrillThroughHit(document: any, fieldsFromQuery: IRequestField[], fieldsTypes: string[]): any {

        const hit: any[] = [];
        let parsedValue = null;
        let hitMemorySize: number = MemoryConstants.REFERENCE * 2;
        for (let i = 0; i < fieldsFromQuery.length; i++) {
            const fieldKey: string = fieldsFromQuery[i].uniqueName;
            parsedValue = this._getNestedObjectValue(fieldKey, document);
            hitMemorySize += parsedValue.memorySize;
            hit.push(parsedValue.value);
        }
        return {
            hit: hit,
            hitMemorySize: hitMemorySize
        };
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
        let memorySize = 0;
        if (value != null && value["_bsontype"] != null && value["_bsontype"] == MongoFieldType.DECIMAL128) {
            resultValue = Number(value);
            memorySize += MemoryConstants.NUMBER;
        } else if (value != null && value["_bsontype"] != null) {
            resultValue = value.toString();
            memorySize += resultValue == null ? MemoryConstants.REFERENCE : resultValue.length * MemoryConstants.CHARACTER;
        } else {
            memorySize += resultValue == null ? MemoryConstants.REFERENCE : (resultValue.length === undefined ? MemoryConstants.NUMBER : resultValue.length * MemoryConstants.CHARACTER);
        }
        //console.log(">>>>>>>>", memorySize, MemoryCalculator.roundTo8bytes(memorySize));
        return {
            "value": resultValue,
            "memorySize": MemoryCalculator.roundTo8bytes(memorySize)
        };
    }

    private dotsDelimeterRegExp: RegExp = new RegExp(Delimeter.DOTS_DELIMETER, "g");
    private parseDotsFromKeys(fieldsKeys: any) {
        let result: any = {};
        let objectMemorySize = MemoryConstants.REFERENCE * 2;
        let keyValue = null;
        let parsedValue = null;
        for (let key in fieldsKeys) {
            keyValue = key.replace(this.dotsDelimeterRegExp, '.');
            parsedValue = this.parseValueFromComplexType(fieldsKeys[key]);
            result[keyValue] = parsedValue.value;//this.parseValueFromComplexType(fieldsKeys[key]);
            objectMemorySize += MemoryConstants.REFERENCE + parsedValue.memorySize;
        }
        return {
            "value": result,
            "memorySize": MemoryCalculator.roundTo8bytes(objectMemorySize)
        };
    }
}