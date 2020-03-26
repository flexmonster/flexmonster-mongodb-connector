import {ClientSideFieldType} from '../../utils/consts/ClientSideFieldType';
import {ClientSideFilterQueries} from '../../utils/consts/ClientSideFilterQueries';
import {MongoQueries} from '../../utils/consts/MongoQueries';
import {IRequestField} from '../../requests/apiRequests/IRequestArgument';

export class FilterQueryBuilder {
    
    constructor() {}

    public buildFilterQuery(query: any) {
        let filterQuery = {};
        for (let i = 0; i < query.length; i++) {
            this._filterField(query[i], filterQuery);
        }
        return filterQuery;
    }

    private _filterField(query: any, filterQuery: any) {
        let field: IRequestField = query["field"];
        if ((field.type == ClientSideFieldType.STRING || field.type == ClientSideFieldType.NUMBER) 
            && query.value == null) {

            this._filterLabelField(query, field, filterQuery);

        } else if (field.type == ClientSideFieldType.DATE 
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
                fieldFilterObject[MongoQueries.REGEXP] = new RegExp("^" + query[ClientSideFilterQueries.BEGIN], FLAGS);
            } else if (query[ClientSideFilterQueries.NOT_BEGIN]) {
                fieldFilterObject[MongoQueries.REGEXP] = new RegExp("^(?!" + query[ClientSideFilterQueries.NOT_BEGIN] + ").*", FLAGS);
            } else if (query[ClientSideFilterQueries.CONTAIN]) {
                fieldFilterObject[MongoQueries.REGEXP] = new RegExp(query[ClientSideFilterQueries.CONTAIN], FLAGS);
            } else if (query[ClientSideFilterQueries.NOT_CONTAIN]) {
                fieldFilterObject[MongoQueries.REGEXP] = new RegExp("^((?!" + query[ClientSideFilterQueries.NOT_CONTAIN] + ").)*$", FLAGS);
            } else if (query[ClientSideFilterQueries.END]) {
                fieldFilterObject[MongoQueries.REGEXP] = new RegExp(query[ClientSideFilterQueries.END] + "$", FLAGS);
            } else if (query[ClientSideFilterQueries.NOT_END]) {
                fieldFilterObject[MongoQueries.REGEXP] = new RegExp("^(?!.*" + query[ClientSideFilterQueries.NOT_END] + "$).*$", FLAGS);
            } else if (query[ClientSideFilterQueries.EQUAL]) {
                fieldFilterObject[MongoQueries.EQUAL] = query[ClientSideFilterQueries.EQUAL];
            } else if (query[ClientSideFilterQueries.NOT_EQUAL]) {
                fieldFilterObject[MongoQueries.NOT] = { 
                        [MongoQueries.EQUAL]: query[ClientSideFilterQueries.NOT_EQUAL]
                };
            } else if (query[ClientSideFilterQueries.GREATER]) {
                fieldFilterObject[MongoQueries.GREATER] = query[ClientSideFilterQueries.GREATER];
            } else if (query[ClientSideFilterQueries.GREATER_EQUAL]) {
                fieldFilterObject[MongoQueries.GREATER_EQUAL] = query[ClientSideFilterQueries.GREATER_EQUAL];
            } else if (query[ClientSideFilterQueries.LESS]) {
                fieldFilterObject[MongoQueries.LESS] = query[ClientSideFilterQueries.LESS];
            } else if (query[ClientSideFilterQueries.LESS_EQUAL]) {
                fieldFilterObject[MongoQueries.LESS_EQUAL] = query[ClientSideFilterQueries.LESS_EQUAL];
            } else if (query[ClientSideFilterQueries.BETWEEN]) {
                fieldFilterObject[MongoQueries.GREATER_EQUAL] = query[ClientSideFilterQueries.BETWEEN][0];
                fieldFilterObject[MongoQueries.LESS_EQUAL] = query[ClientSideFilterQueries.BETWEEN][1];
            } else if (query[ClientSideFilterQueries.NOT_BETWEEN]) {
                fieldFilterObject[MongoQueries.NOT] = {
                    [MongoQueries.GREATER_EQUAL]: query[ClientSideFilterQueries.NOT_BETWEEN][0],
                    [MongoQueries.LESS_EQUAL]: query[ClientSideFilterQueries.NOT_BETWEEN][1]
                };
            }
        } else {
            if (query[ClientSideFilterQueries.INCLUDE]) {
                fieldFilterObject[MongoQueries.INCLUDE] = query[ClientSideFilterQueries.INCLUDE];
            } else if (query[ClientSideFilterQueries.EXCLUDE]) {
                fieldFilterObject[MongoQueries.EXCLUDE] = query[ClientSideFilterQueries.EXCLUDE];
            }
        }

        filterQueryResult[fieldName.uniqueName] = fieldFilterObject;
    }

    private _msDay: number = 24 * 60 * 60 * 1000;
    private _filterDateField(query: any, fieldName: IRequestField, dateFieldFilterQuery: any) {
        const mongoFilterQuery: any = {};
        const dateFieldFilterUniquName = fieldName;
        
        if (query["query"]) {
            query = query["query"];

            if (query[ClientSideFilterQueries.BEFORE]) {
                mongoFilterQuery[MongoQueries.LESS] = query[ClientSideFilterQueries.BEFORE];
            } else if (query[ClientSideFilterQueries.BEFORE_EQUAL]) {
                mongoFilterQuery[MongoQueries.LESS] = query[ClientSideFilterQueries.BEFORE_EQUAL] + this._msDay;
            } else if (query[ClientSideFilterQueries.EQUAL]) {
                mongoFilterQuery[MongoQueries.GREATER_EQUAL] = query[ClientSideFilterQueries.EQUAL];
                mongoFilterQuery[MongoQueries.LESS] = query[ClientSideFilterQueries.EQUAL] + this._msDay; 
            } else if (query[ClientSideFilterQueries.NOT_EQUAL]) {
                mongoFilterQuery[MongoQueries.NOT] = {
                    [MongoQueries.GREATER_EQUAL]: query[ClientSideFilterQueries.NOT_EQUAL],
                    [MongoQueries.LESS]: query[ClientSideFilterQueries.NOT_EQUAL] + this._msDay
                };
            } else if (query[ClientSideFilterQueries.AFTER]) {
                mongoFilterQuery[MongoQueries.GREATER_EQUAL] = query[ClientSideFilterQueries.AFTER] + this._msDay;
            } else if (query[ClientSideFilterQueries.AFTER_EQUAL]) {
                mongoFilterQuery[MongoQueries.GREATER_EQUAL] = query[ClientSideFilterQueries.AFTER_EQUAL];
            } else if (query[ClientSideFilterQueries.BETWEEN]) {
                mongoFilterQuery[MongoQueries.GREATER_EQUAL] = query[ClientSideFilterQueries.BETWEEN][0];
                mongoFilterQuery[MongoQueries.LESS_EQUAL] = query[ClientSideFilterQueries.BETWEEN][1];
            } else if (query[ClientSideFilterQueries.NOT_BETWEEN]) {
                mongoFilterQuery[MongoQueries.NOT] = {
                    [MongoQueries.GREATER_EQUAL]: query[ClientSideFilterQueries.NOT_BETWEEN][0],
                    [MongoQueries.LESS_EQUAL]: query[ClientSideFilterQueries.NOT_BETWEEN][1]
                };
            }
        } else {
            if (query[ClientSideFilterQueries.INCLUDE]) {
                mongoFilterQuery[MongoQueries.INCLUDE] = query[ClientSideFilterQueries.INCLUDE];
            } else if (query[ClientSideFilterQueries.EXCLUDE]) {
                mongoFilterQuery[MongoQueries.EXCLUDE] = query[ClientSideFilterQueries.EXCLUDE];
            }
        }

        dateFieldFilterQuery[dateFieldFilterUniquName.uniqueName] = mongoFilterQuery;
    }

}