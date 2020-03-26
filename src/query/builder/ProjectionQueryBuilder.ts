import {ClientSideFieldType} from '../../utils/consts/ClientSideFieldType';
import {DateParts, DateIntervals} from '../../utils/consts/DateParts';
import { IRequestField } from '../../requests/apiRequests/IRequestArgument';

export class ProjectionQueryBuilder {

    constructor () {

    }

    public buildProjectionStage(query: any, field?: IRequestField) {
        let aggregationQuery = query["aggs"];
        let filterQuery = query["filter"];
        let projection: any = {};
        if (aggregationQuery["values"] != null) {
            let fieldValueObject: IRequestField = null;
            for (let i = 0; i < aggregationQuery["values"].length; i++) {
                fieldValueObject = aggregationQuery["values"][i]["field"];
                if (fieldValueObject.type == ClientSideFieldType.DATE) {
                    this._buildProjectionForDateField(fieldValueObject, projection);
                } else {
                    projection[fieldValueObject.uniqueName] = "$" + fieldValueObject.uniqueName;
                }
            }
        }
        if (aggregationQuery["by"]) {
            this._buildProjectionFromRowsColumns(aggregationQuery["by"]["rows"], projection);
            this._buildProjectionFromRowsColumns(aggregationQuery["by"]["cols"], projection);
        }
        this._buildProjectionFromFilters(filterQuery, projection);
        return projection;
    }

    private _buildProjectionFromFilters(filters: any, projectionQuery: any) {
        if (filters == null) return;
        let filterObject: any | IRequestField = null;
        for (let i = 0; i < filters.length; i++) {
            filterObject = filters[i].field;
            if (filterObject.type == ClientSideFieldType.DATE) {
                this._buildProjectionForDateField(filterObject, projectionQuery);
            } else {
                projectionQuery[filterObject.uniqueName] = "$" + filterObject.uniqueName;
            }

            if (filterObject.hasOwnProperty("value")) {
                const fieldValueObject: IRequestField = filterObject.value.field;
                projectionQuery[fieldValueObject.uniqueName] = "$" + fieldValueObject.uniqueName;
            }
        }
    }

    private _buildProjectionFromRowsColumns(rowsColumns: any, projectionQuery: any) {
        if (rowsColumns == null) return;
        let fieldReference = null;
        let fieldObject: IRequestField = null;
        for (let i = 0; i < rowsColumns.length; i++) {
            fieldObject = rowsColumns[i]
            fieldReference = "$" + fieldObject.uniqueName;
            if (fieldObject.type == ClientSideFieldType.DATE) {
                this._buildProjectionForDateField(rowsColumns[i], projectionQuery);
            } else {
                projectionQuery[fieldObject.uniqueName] = fieldReference;
            }
        }
    }

    private _buildProjectionForDateField(fieldValueObject: IRequestField, projectionQuery: any) {
        let timestampObject: any = {};
        const fieldUniquename: string = fieldValueObject.uniqueName;
        if (fieldValueObject.interval == null) {
            projectionQuery[fieldUniquename] = {"$toLong": "$" + fieldUniquename};
            return;
        } else {
            timestampObject[DateParts.YEAR] = {"$year": "$" + fieldUniquename};
            timestampObject[DateParts.MONTH] = {"$month": "$" + fieldUniquename};
            timestampObject[DateParts.DAY] = {"$dayOfMonth": "$" + fieldUniquename};
        }

        if (fieldValueObject.interval == DateIntervals.HOUR) {
           timestampObject[DateParts.HOUR] = {"$hour": "$" + fieldUniquename}
        } else if (fieldValueObject.interval == DateIntervals.MINUTES) {
            timestampObject[DateParts.HOUR] = {"$hour": "$" + fieldUniquename}
            timestampObject[DateParts.MINUTE] = {"$minute": "$" + fieldUniquename}
        } else if (fieldValueObject.interval == DateIntervals.SECONDS) {
            timestampObject[DateParts.HOUR] = {"$hour": "$" + fieldUniquename}
            timestampObject[DateParts.MINUTE] = {"$minute": "$" + fieldUniquename}
            timestampObject[DateParts.SECOND] = {"$second": "$" + fieldUniquename}
        }

        projectionQuery[fieldUniquename] = {"$toLong": {
            "$dateFromParts": timestampObject
        }};

    }

}