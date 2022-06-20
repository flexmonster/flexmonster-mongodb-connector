import {ClientSideFieldType} from '../../utils/consts/ClientSideFieldType';
import {ClientSideFilterQueries} from '../../utils/consts/ClientSideFilterQueries';
import {MongoFilterQueries} from '../../utils/consts/MongoFilterQueries';
import {IRequestField} from '../../requests/apiRequests/IRequestArgument';
import { APISchema } from '../../schema/APISchema';
import { DateIntervals } from '../../utils/consts/DateParts';

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

    private _buildClassicFilter(queryList: any, schema: APISchema, filterQuery: any) {
        for (let i = 0; i < queryList.length; i++) {
            const field: IRequestField = queryList[i]["field"];
            filterQuery[field.uniqueName] = this._filterField(queryList[i], schema)[field.uniqueName];
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
        //console.log(">>>>>filter", JSON.stringify(query));
        if (typeof query["type"] !== "undefined") {
            const operationsList: any[] = [];
            const mongoFilterObject: object = {
                [this._getMongoLogicOperator(query["type"])]: operationsList
            };
            
            this._buildAvancedFilterRecursively(query["value"], schema, operationsList);

            return mongoFilterObject;
        } else {
            let mongoFilterQuery = this._filterField(query, schema);
            //console.log(">>>>>AdvancedFilterItem", JSON.stringify(query));
            if (mongoFilterQuery[0] !== undefined && Array.isArray(mongoFilterQuery[0])) {
                const lastQuery: any = mongoFilterQuery.length > 1 && !Array.isArray(mongoFilterQuery[mongoFilterQuery.length - 1]) ? mongoFilterQuery.pop() : undefined;
                const listOfOrConditions: any[] = lastQuery === undefined ? [] : [lastQuery];
                const clientMemberFilterQuery: string = query[ClientSideFilterQueries.INCLUDE] !== undefined ? ClientSideFilterQueries.INCLUDE : ClientSideFilterQueries.EXCLUDE;
                const negation: boolean = clientMemberFilterQuery === ClientSideFilterQueries.EXCLUDE;

                const resultORQuery = {
                    [this._getMongoLogicOperator(ClientSideFilterQueries.OR, negation)]: listOfOrConditions
                }

                for (let i: number = 0; i < mongoFilterQuery.length; i++) {
                    listOfOrConditions.push({
                        [this._getMongoLogicOperator(ClientSideFilterQueries.AND, negation)]: mongoFilterQuery[i]
                    })
                }
                mongoFilterQuery = resultORQuery;
            } else if (query["query"] !== undefined) {
                const resultQuery = {
                    [query["field"]["uniqueName"]]: mongoFilterQuery
                }
                mongoFilterQuery = resultQuery;
            }
            return mongoFilterQuery;
        }
    }

    private _getMongoLogicOperator(clientLogicOperator: string, negation: boolean = false): string {
        let mongoLogicOperator: string = "";
        
        if (ClientSideFilterQueries.AND === clientLogicOperator) {
            mongoLogicOperator = !negation ? MongoFilterQueries.AND : MongoFilterQueries.OR;
        } else if (ClientSideFilterQueries.OR === clientLogicOperator) {
            mongoLogicOperator = !negation ? MongoFilterQueries.OR : MongoFilterQueries.AND;
        }

        if (mongoLogicOperator.length === 0) {
            throw new Error("Invalid client filter format");
        }

        return mongoLogicOperator;
    }

    private _filterField(query: any, schema: APISchema /*, filterQuery: any*/): any {
        let field: IRequestField = query["field"];
        if ((schema.fields.get(field.uniqueName).type == ClientSideFieldType.STRING 
            || schema.fields.get(field.uniqueName).type == ClientSideFieldType.NUMBER) 
            && query.value == null) {

            return this._filterLabelField(query, schema, field /*, filterQuery*/);

        } else if (schema.fields.get(field.uniqueName).type == ClientSideFieldType.DATE 
            && query.value == null) {

            return this._filterDateField(query, schema, field /*, filterQuery*/);

        } else if (query.value != null) {}

        return;
    }

    private _filterLabelField(query: any, schema: APISchema, fieldName: IRequestField /*, filterQueryResult: any*/): any {
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
                return this.parseIncludeExcludeMembers(query[ClientSideFilterQueries.INCLUDE], ClientSideFilterQueries.INCLUDE, fieldName, schema, false);
            } else if (query[ClientSideFilterQueries.EXCLUDE]) {
                return this.parseIncludeExcludeMembers(query[ClientSideFilterQueries.EXCLUDE], ClientSideFilterQueries.EXCLUDE, fieldName, schema, false);
            }
        }

        //filterQueryResult[fieldName.uniqueName] = 
        return fieldFilterObject;
    }

    private parseIncludeExcludeMembers(members: IFilterMemberObject[], membersFilterQuery: string, fieldName: IRequestField, schema: APISchema, isDate: boolean): any {
        if (members == null) return [];
        const result: any = [];
        const membersList: (string | number | Date)[] = [];
        let member: string | number | Date = null;
        for (let i = 0; i < members.length; i++) {
            member = isDate ? new Date((<number>members[i].member)) : members[i].member;
            if (members[i].filter === undefined) {
                membersList.push(member);
            } else {
                const mongofilterQueryChunk = {
                    [fieldName.uniqueName]: {
                        [this.getMongoGroupMemberFilter(membersFilterQuery)]: [member]
                    }
                }
                result.push(this.resolveRecursiveFilter(schema, mongofilterQueryChunk, members[i].filter, membersFilterQuery === ClientSideFilterQueries.EXCLUDE));
            }
        }
        const queryFromMembersList = {
            [fieldName.uniqueName]: {
                [this.getMongoGroupMemberFilter(membersFilterQuery)]: membersList
            }
        }
        if (result.length === 0) {
            return queryFromMembersList;
        } else {
            if (membersList.length > 0) result.push(queryFromMembersList);
            return result;
        }
    }

    private getMongoGroupMemberFilter(membersFilterQuery: string, negation: boolean = false): string {
        if (ClientSideFilterQueries.INCLUDE === membersFilterQuery) {
            return !negation ? MongoFilterQueries.INCLUDE : MongoFilterQueries.EXCLUDE;
        } else {
            return !negation ? MongoFilterQueries.EXCLUDE : MongoFilterQueries.INCLUDE;
        }
    }

    private resolveRecursiveFilter(schema: APISchema, mongofilterQueryChunk: any, filterQuery: IRecursiveFilterMemberObject, negation: boolean): any[] {
        //console.log(">>>>ResolveRecursive", JSON.stringify(filterQuery));
        const listOfMongoFilterChunks: any[] = [mongofilterQueryChunk];
        let reference = filterQuery;
        while (reference !== undefined) {
            const mongoFilterChunk = {};
            reference = this.reduceFilterItemRecurcion(reference, schema, mongoFilterChunk, negation);
            listOfMongoFilterChunks.push(mongoFilterChunk);
        }
        //console.log(">>>>ResolveRecursive_END", JSON.stringify(listOfMongoFilterChunks));
        return listOfMongoFilterChunks;
    }

    private reduceFilterItemRecurcion(filterQuery: IRecursiveFilterMemberObject, schema: APISchema, mongoFilterChunk: any, negation: boolean): IRecursiveFilterMemberObject {
        let clientMemberQuery: string = filterQuery.include !== undefined ? ClientSideFilterQueries.INCLUDE : ClientSideFilterQueries.EXCLUDE;
        const members: IFilterMemberObject[] = filterQuery.include !== undefined ? filterQuery.include : filterQuery.exclude;
        const isDate: boolean = schema.fields.get(filterQuery.field.uniqueName).type === ClientSideFieldType.DATE;
        mongoFilterChunk[filterQuery.field.uniqueName] = {
            [this.getMongoGroupMemberFilter(clientMemberQuery, negation)]: [isDate ? new Date(members[0].member) : members[0].member]
        }
        return members[0].filter;
    }

    private _msDay: number = 24 * 60 * 60 * 1000;
    private _filterDateField(query: any, schema: APISchema, fieldName: IRequestField /*, dateFieldFilterQuery: any*/): any {

        const mongoFilterQuery: any = {};
        const isIntervalDefined: boolean = this.isDateIntervalDefined(fieldName.interval);

        if (query["query"]) {
            query = query["query"];

            if (query[ClientSideFilterQueries.BEFORE]) {
                mongoFilterQuery[MongoFilterQueries.LESS] = this.adjustDateFormat(query[ClientSideFilterQueries.BEFORE], isIntervalDefined);
            } else if (query[ClientSideFilterQueries.BEFORE_EQUAL]) {
                mongoFilterQuery[MongoFilterQueries.LESS] = this.adjustDateFormat(query[ClientSideFilterQueries.BEFORE_EQUAL] + this._msDay, isIntervalDefined);
            } else if (query[ClientSideFilterQueries.EQUAL]) {
                mongoFilterQuery[MongoFilterQueries.GREATER_EQUAL] = this.adjustDateFormat(query[ClientSideFilterQueries.EQUAL], isIntervalDefined);
                mongoFilterQuery[MongoFilterQueries.LESS] = this.adjustDateFormat(query[ClientSideFilterQueries.EQUAL] + this._msDay, isIntervalDefined); // query[ClientSideFilterQueries.EQUAL] + this._msDay; 
            } else if (query[ClientSideFilterQueries.NOT_EQUAL]) {
                mongoFilterQuery[MongoFilterQueries.NOT] = {
                    [MongoFilterQueries.GREATER_EQUAL]: this.adjustDateFormat(query[ClientSideFilterQueries.NOT_EQUAL], isIntervalDefined),
                    [MongoFilterQueries.LESS]: this.adjustDateFormat(query[ClientSideFilterQueries.NOT_EQUAL] + this._msDay, isIntervalDefined)
                };
            } else if (query[ClientSideFilterQueries.AFTER]) {
                mongoFilterQuery[MongoFilterQueries.GREATER_EQUAL] = this.adjustDateFormat(query[ClientSideFilterQueries.AFTER], isIntervalDefined);
            } else if (query[ClientSideFilterQueries.AFTER_EQUAL]) {
                mongoFilterQuery[MongoFilterQueries.GREATER_EQUAL] = this.adjustDateFormat(query[ClientSideFilterQueries.AFTER_EQUAL], isIntervalDefined);
            } else if (query[ClientSideFilterQueries.BETWEEN]) {
                mongoFilterQuery[MongoFilterQueries.GREATER_EQUAL] = this.adjustDateFormat(query[ClientSideFilterQueries.BETWEEN][0], isIntervalDefined);
                mongoFilterQuery[MongoFilterQueries.LESS_EQUAL] = this.adjustDateFormat(query[ClientSideFilterQueries.BETWEEN][1], isIntervalDefined);
            } else if (query[ClientSideFilterQueries.NOT_BETWEEN]) {
                mongoFilterQuery[MongoFilterQueries.NOT] = {
                    [MongoFilterQueries.GREATER_EQUAL]: this.adjustDateFormat(query[ClientSideFilterQueries.NOT_BETWEEN][0], isIntervalDefined),
                    [MongoFilterQueries.LESS_EQUAL]: this.adjustDateFormat(query[ClientSideFilterQueries.NOT_BETWEEN][1], isIntervalDefined)
                };
            }
        } else {
            if (query[ClientSideFilterQueries.INCLUDE]) {
                return this.parseIncludeExcludeMembers(query[ClientSideFilterQueries.INCLUDE], ClientSideFilterQueries.INCLUDE, fieldName, schema, true);
            } else if (query[ClientSideFilterQueries.EXCLUDE]) {
                return this.parseIncludeExcludeMembers(query[ClientSideFilterQueries.EXCLUDE], ClientSideFilterQueries.EXCLUDE, fieldName, schema, true);
            }
        }

        //dateFieldFilterQuery[dateFieldFilterUniquName.uniqueName] = 
        return mongoFilterQuery;
    }

    private adjustDateFormat(timestamp: number, isIntervalDefined: boolean): Date | number {
        return isIntervalDefined ? new Date(timestamp) : timestamp;
    }

    private isDateIntervalDefined(interval: string): boolean {
        return interval !== undefined && DateIntervals.isValid(interval)
    }

}

export interface IFilterMemberObject {
    member: string | number;
    filter?: any;
}

export interface IRecursiveFilterMemberObject {
    field: IRequestField,
    include?: IFilterMemberObject[],
    exclude?: IFilterMemberObject[]
}