import {IRequestArgument} from "../IRequestArgument";
import {QueryBuilder} from "../../../query/builder/QueryBuilder";
import {MongoResponseParser} from "../../../parsers/MongoResponseParser";
import { AbstractApiRequest } from "./AbstractApiRequest";
import { APISchema } from "../../../schema/APISchema";

export class MembersApiRequest extends AbstractApiRequest {

    constructor(requestArgument: IRequestArgument) {
        super(requestArgument);
        this._loggingTemplate = "members";
    }

    protected buildMongoQuery(queryBuilder: QueryBuilder, schema: APISchema): any {
        const mongoQuery: any = queryBuilder.buildMembersPipeline({
            "field": this.requestArgument.clientQuery.members["field"],
            "filter": this.requestArgument.clientQuery.members["filter"]
        }, schema);
        //queryBuilder.applyPaging(mongoQuery, {skipNumber: this._currentPageIndex, limitNumber: this.CHUNK_SIZE});
        //this._currentPageIndex += this.CHUNK_SIZE;
        return mongoQuery;
    };

    protected parseQueryResult = async (queryResult: Promise<any>, startDate: Date) => {
        const parsedData = await MongoResponseParser.getInstance().parseMembersFromCursor(queryResult, <any>this.requestArgument.fieldObject, this.CHUNK_SIZE, startDate);
        this.storeMembersNumber(parsedData.getNumberOfItems(), this._schema);
        return parsedData;
    }

    private storeMembersNumber(numberOfMembers: number, schema: APISchema): void {
        const uniqueName: string = this.requestArgument.fieldObject["uniqueName"];
        schema.fields.get(uniqueName).fieldStats.distinctMembersNumber = numberOfMembers;
        return;
    }

    public toJSON(response: any, nextPageToken: string): any {
        const jsonResponse: any = {
            "members": response
        };
        if (nextPageToken != null) jsonResponse["nextPageToken"] = nextPageToken;
        return jsonResponse;
    }
}