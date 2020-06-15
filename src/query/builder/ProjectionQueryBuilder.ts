import {ClientSideFieldType} from '../../utils/consts/ClientSideFieldType';
import {DateParts, DateIntervals} from '../../utils/consts/DateParts';
import { IRequestField } from '../../requests/apiRequests/IRequestArgument';
import { APISchema } from '../../schema/APISchema';

export class ProjectionQueryBuilder {

    constructor () {

    }

    public buildProjectionStage(query: any, schema: APISchema) {
        let aggregationQuery = query["aggs"];
        let filterQuery = query["filter"];
        let projection: any = {};
        if (aggregationQuery["values"] != null) {
            let fieldValueObject: IRequestField = null;
            for (let i = 0; i < aggregationQuery["values"].length; i++) {
                fieldValueObject = aggregationQuery["values"][i]["field"];
                if (schema.fields.get(fieldValueObject.uniqueName).type == ClientSideFieldType.DATE) {
                    this._buildProjectionForDateField(fieldValueObject, projection);
                } else {
                    projection[fieldValueObject.uniqueName] = "$" + fieldValueObject.uniqueName;
                }
            }
        }
        if (aggregationQuery["by"]) {
            this._buildProjectionFromRowsColumns(aggregationQuery["by"]["rows"], schema, projection);
            this._buildProjectionFromRowsColumns(aggregationQuery["by"]["cols"], schema, projection);
        }
        this._buildProjectionFromFilters(filterQuery, schema, projection);
        return projection;
    }

    private _buildProjectionFromFilters(filters: any, schema: APISchema, projectionQuery: any) {
        if (filters == null) return;
        let filterObject: any | IRequestField = null;
        for (let i = 0; i < filters.length; i++) {
            filterObject = filters[i].field;
            if (schema.fields.get(filterObject.uniqueName).type == ClientSideFieldType.DATE) {
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

    private _buildProjectionFromRowsColumns(rowsColumns: any, schema: APISchema, projectionQuery: any) {
        if (rowsColumns == null) return;
        let fieldReference = null;
        let fieldObject: IRequestField = null;
        for (let i = 0; i < rowsColumns.length; i++) {
            fieldObject = rowsColumns[i]
            fieldReference = "$" + fieldObject.uniqueName;
            if (schema.fields.get(fieldObject.uniqueName).type == ClientSideFieldType.DATE) {
                this._buildProjectionForDateField(rowsColumns[i], projectionQuery);
            } else {
                projectionQuery[fieldObject.uniqueName] = fieldReference;
            }
        }
    }

    private _buildProjectionForDateField(fieldValueObject: IRequestField, projectionQuery: any) {
        const fieldUniquename: string = fieldValueObject.uniqueName;
        if (projectionQuery[fieldUniquename] != null) return;

        let timestampObject: any = {};
        if (fieldValueObject.interval == null || !DateIntervals.isValid(fieldValueObject.interval)) {
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