import {SupportedAggregations} from '../../utils/consts/SupportedAggregations';
import {Delimeter} from '../../utils/consts/Delimeters';
import { MongoPipelineStages } from '../../utils/consts/MongoPipelineStages';
import {IRequestField} from '../../requests/apiRequests/IRequestArgument';
import { ClientSideFieldType } from '../../utils/consts/ClientSideFieldType';

export class GroupingQueryBuilder {

    constructor() {

    }

    public buildGroupStage(query: any) {
        let groupStage: any = {};
        let valuesArray = query.values;
        let key = null;
        let value = null;
        let keyValueField = null;
        let fieldValueObject: IRequestField = null;
        if (valuesArray != null) {
            for (let i = 0; i < valuesArray.length; i++) {
                value = valuesArray[i];
                fieldValueObject = value.field;
                key = SupportedAggregations.numericFieldAggregations[value.func];
                keyValueField = fieldValueObject.uniqueName.replace(/\./g, Delimeter.DOTS_DELIMETER);
                groupStage[keyValueField + Delimeter.FIELD_DELIMETER + value.func] = {};
                groupStage[keyValueField + Delimeter.FIELD_DELIMETER + value.func][key] = value.func == "count" ? 1 : "$" + fieldValueObject.uniqueName;
            }
        }
        groupStage["_id"] = {};
        if (query.by) {
            this._parseRowsColumns(query.by.rows, groupStage["_id"]);
            this._parseRowsColumns(query.by.cols, groupStage["_id"]);
        }

        return {
            [MongoPipelineStages.GROUP]: groupStage
        };
    }

    private _parseRowsColumns(query: IRequestField[], rowColumnsGroupQuery: any) {
        if (query == null) return rowColumnsGroupQuery;
        let key: string = null;
        let fieldValueObject: IRequestField = null;
        for (let i = 0; i < query.length; i++) {
            fieldValueObject = query[i];
            key = fieldValueObject.uniqueName.replace(/\./g, Delimeter.DOTS_DELIMETER);
            rowColumnsGroupQuery[key] = "$" + fieldValueObject.uniqueName;
        }
        return rowColumnsGroupQuery;
    }

}