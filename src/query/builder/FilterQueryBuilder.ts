import {ClientSideFieldType} from '../../utils/consts/ClientSideFieldType';
import {ClientSideFilterQueries} from '../../utils/consts/ClientSideFilterQueries';
import {MongoFilterQueries} from '../../utils/consts/MongoFilterQueries';
import {IRequestField} from '../../requests/apiRequests/IRequestArgument';
import { APISchema } from '../../schema/APISchema';

export class FilterQueryBuilder {
    
    constructor() {}

    public buildFilterQuery(query: any, schema: APISchema) {
        //console.log(">>>>>>", JSON.stringify(query, null, " "));
        let filterQuery = {};

        if (Array.isArray(query)) {
            this._buildClassicFilter(query, schema, filterQuery);
        } else {
            filterQuery = this._buildAdvancedFilter(query, schema);
        }

        //console.log(">>>>>>Mongo", JSON.stringify(filterQuery, null, " "));
        return filterQuery;
    }

    private _buildClassicFilter(query: any, schema: APISchema, filterQuery: any) {
        for (let i = 0; i < query.length; i++) {
            this._filterField(query[i], schema, filterQuery);
        }
        return;
    }

    private _buildAdvancedFilter(query: any, schema: APISchema) {
        const operationsList: any[] = [];
        const mongoFilterObject: object = {
            [this._getMongoLogicOperator(query["type"])]: operationsList
        };

        this._buildAvancedFilterRecursively(query["value"], schema, operationsList);

        return mongoFilterObject;
    }

    private _buildAvancedFilterRecursively(query: any[], schema: APISchema, operationsList: any[]) {
        for (let i = 0; i < query.length; i++) {
            operationsList.push(this._buildAdvancedFilterItem(query[i], schema));
        }
        return;
    }

    private _buildAdvancedFilterItem(query: any, schema: APISchema): any {
        if (typeof query["type"] !== "undefined") {
            const operationsList: any[] = [];
            const mongoFilterObject: object = {
                [this._getMongoLogicOperator(query["type"])]: operationsList
            };
            
            this._buildAvancedFilterRecursively(query["value"], schema, operationsList);

            return mongoFilterObject;
        } else {
            const mongoFilterObject: object = {};
            this._filterField(query, schema, mongoFilterObject);
            return mongoFilterObject;
        }
    }

    private _getMongoLogicOperator(clientLogicOperator: string): string {
        let mongoLogicOperator: string = "";
        
        if (ClientSideFilterQueries.AND === clientLogicOperator) {
            mongoLogicOperator = MongoFilterQueries.AND;
        } else if (ClientSideFilterQueries.OR === clientLogicOperator) {
            mongoLogicOperator = MongoFilterQueries.OR;
        }

        if (mongoLogicOperator.length === 0) {
            throw new Error("Invalid client filter format");
        }

        return mongoLogicOperator;
    }

    private _filterField(query: any, schema: APISchema, filterQuery: any) {
        let field: IRequestField = query["field"];
        if ((schema.fields.get(field.uniqueName).type == ClientSideFieldType.STRING 
            || schema.fields.get(field.uniqueName).type == ClientSideFieldType.NUMBER) 
            && query.value == null) {

            this._filterLabelField(query, field, filterQuery);

        } else if (schema.fields.get(field.uniqueName).type == ClientSideFieldType.DATE 
            && query.value == null) {

            this._filterDateField(query, field, filterQuery);

        } else if (query.value != null) {}
    }

    private _filterLabelField(query: any, fieldName: IRequestField, filterQueryResult: any) {
        const fieldFilterObject: any = {};
        const FLAGS = "gi";

        if (query["query"]) {
            query = query["query"];

            if (query[ClientSideFilterQueries.BEGIN]) {
                fieldFilterObject[MongoFilterQueries.REGEXP] = new RegExp("^" + query[ClientSideFilterQueries.BEGIN], FLAGS);
            } else if (query[ClientSideFilterQueries.NOT_BEGIN]) {
                fieldFilterObject[MongoFilterQueries.REGEXP] = new RegExp("^(?!" + query[ClientSideFilterQueries.NOT_BEGIN] + ").*", FLAGS);
            } else if (query[ClientSideFilterQueries.CONTAIN]) {
                fieldFilterObject[MongoFilterQueries.REGEXP] = new RegExp(query[ClientSideFilterQueries.CONTAIN], FLAGS);
            } else if (query[ClientSideFilterQueries.NOT_CONTAIN]) {
                fieldFilterObject[MongoFilterQueries.REGEXP] = new RegExp("^((?!" + query[ClientSideFilterQueries.NOT_CONTAIN] + ").)*$", FLAGS);
            } else if (query[ClientSideFilterQueries.END]) {
                fieldFilterObject[MongoFilterQueries.REGEXP] = new RegExp(query[ClientSideFilterQueries.END] + "$", FLAGS);
            } else if (query[ClientSideFilterQueries.NOT_END]) {
                fieldFilterObject[MongoFilterQueries.REGEXP] = new RegExp("^(?!.*" + query[ClientSideFilterQueries.NOT_END] + "$).*$", FLAGS);
            } else if (query[ClientSideFilterQueries.EQUAL]) {
                fieldFilterObject[MongoFilterQueries.EQUAL] = query[ClientSideFilterQueries.EQUAL];
            } else if (query[ClientSideFilterQueries.NOT_EQUAL]) {
                fieldFilterObject[MongoFilterQueries.NOT] = { 
                        [MongoFilterQueries.EQUAL]: query[ClientSideFilterQueries.NOT_EQUAL]
                };
            } else if (query[ClientSideFilterQueries.GREATER]) {
                fieldFilterObject[MongoFilterQueries.GREATER] = query[ClientSideFilterQueries.GREATER];
            } else if (query[ClientSideFilterQueries.GREATER_EQUAL]) {
                fieldFilterObject[MongoFilterQueries.GREATER_EQUAL] = query[ClientSideFilterQueries.GREATER_EQUAL];
            } else if (query[ClientSideFilterQueries.LESS]) {
                fieldFilterObject[MongoFilterQueries.LESS] = query[ClientSideFilterQueries.LESS];
            } else if (query[ClientSideFilterQueries.LESS_EQUAL]) {
                fieldFilterObject[MongoFilterQueries.LESS_EQUAL] = query[ClientSideFilterQueries.LESS_EQUAL];
            } else if (query[ClientSideFilterQueries.BETWEEN]) {
                fieldFilterObject[MongoFilterQueries.GREATER_EQUAL] = query[ClientSideFilterQueries.BETWEEN][0];
                fieldFilterObject[MongoFilterQueries.LESS_EQUAL] = query[ClientSideFilterQueries.BETWEEN][1];
            } else if (query[ClientSideFilterQueries.NOT_BETWEEN]) {
                fieldFilterObject[MongoFilterQueries.NOT] = {
                    [MongoFilterQueries.GREATER_EQUAL]: query[ClientSideFilterQueries.NOT_BETWEEN][0],
                    [MongoFilterQueries.LESS_EQUAL]: query[ClientSideFilterQueries.NOT_BETWEEN][1]
                };
            }
        } else {
            if (query[ClientSideFilterQueries.INCLUDE]) {
                fieldFilterObject[MongoFilterQueries.INCLUDE] = this.parseIncludeExcludeMembers(query[ClientSideFilterQueries.INCLUDE]);
            } else if (query[ClientSideFilterQueries.EXCLUDE]) {
                fieldFilterObject[MongoFilterQueries.EXCLUDE] = this.parseIncludeExcludeMembers(query[ClientSideFilterQueries.EXCLUDE]);
            }
        }

        filterQueryResult[fieldName.uniqueName] = fieldFilterObject;
    }

    private parseIncludeExcludeMembers(members: IFilterMemberObject[]): (string | number)[] {
        if (members == null) return [];
        const membersList: (string | number)[] = [];
        for (let i = 0; i < members.length; i++) {
            membersList.push(members[i].member);
        }
        return membersList;
    }

    private _msDay: number = 24 * 60 * 60 * 1000;
    private _filterDateField(query: any, fieldName: IRequestField, dateFieldFilterQuery: any) {

        const mongoFilterQuery: any = {};
        const dateFieldFilterUniquName = fieldName;
        
        if (query["query"]) {
            query = query["query"];

            if (query[ClientSideFilterQueries.BEFORE]) {
                mongoFilterQuery[MongoFilterQueries.LESS] = query[ClientSideFilterQueries.BEFORE];
            } else if (query[ClientSideFilterQueries.BEFORE_EQUAL]) {
                mongoFilterQuery[MongoFilterQueries.LESS] = query[ClientSideFilterQueries.BEFORE_EQUAL] + this._msDay;
            } else if (query[ClientSideFilterQueries.EQUAL]) {
                mongoFilterQuery[MongoFilterQueries.GREATER_EQUAL] = query[ClientSideFilterQueries.EQUAL];
                mongoFilterQuery[MongoFilterQueries.LESS] = query[ClientSideFilterQueries.EQUAL] + this._msDay; 
            } else if (query[ClientSideFilterQueries.NOT_EQUAL]) {
                mongoFilterQuery[MongoFilterQueries.NOT] = {
                    [MongoFilterQueries.GREATER_EQUAL]: query[ClientSideFilterQueries.NOT_EQUAL],
                    [MongoFilterQueries.LESS]: query[ClientSideFilterQueries.NOT_EQUAL] + this._msDay
                };
            } else if (query[ClientSideFilterQueries.AFTER]) {
                mongoFilterQuery[MongoFilterQueries.GREATER_EQUAL] = query[ClientSideFilterQueries.AFTER] + this._msDay;
            } else if (query[ClientSideFilterQueries.AFTER_EQUAL]) {
                mongoFilterQuery[MongoFilterQueries.GREATER_EQUAL] = query[ClientSideFilterQueries.AFTER_EQUAL];
            } else if (query[ClientSideFilterQueries.BETWEEN]) {
                mongoFilterQuery[MongoFilterQueries.GREATER_EQUAL] = query[ClientSideFilterQueries.BETWEEN][0];
                mongoFilterQuery[MongoFilterQueries.LESS_EQUAL] = query[ClientSideFilterQueries.BETWEEN][1];
            } else if (query[ClientSideFilterQueries.NOT_BETWEEN]) {
                mongoFilterQuery[MongoFilterQueries.NOT] = {
                    [MongoFilterQueries.GREATER_EQUAL]: query[ClientSideFilterQueries.NOT_BETWEEN][0],
                    [MongoFilterQueries.LESS_EQUAL]: query[ClientSideFilterQueries.NOT_BETWEEN][1]
                };
            }
        } else {
            if (query[ClientSideFilterQueries.INCLUDE]) {
                mongoFilterQuery[MongoFilterQueries.INCLUDE] = this.parseIncludeExcludeMembers(query[ClientSideFilterQueries.INCLUDE]);
            } else if (query[ClientSideFilterQueries.EXCLUDE]) {
                mongoFilterQuery[MongoFilterQueries.EXCLUDE] = this.parseIncludeExcludeMembers(query[ClientSideFilterQueries.EXCLUDE]);
            }
        }

        dateFieldFilterQuery[dateFieldFilterUniquName.uniqueName] = mongoFilterQuery;
    }

}

export interface IFilterMemberObject {
    member: string | number;
}