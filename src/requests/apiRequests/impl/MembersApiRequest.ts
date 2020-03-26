import {IRequestArgument} from "../IRequestArgument";
import {QueryBuilder} from "../../../query/builder/QueryBuilder";
import {MongoResponseParser} from "../../../parsers/MongoResponseParser";
import { AbstractApiRequest } from "./AbstractApiRequest";

export class MembersApiRequest extends AbstractApiRequest {

    constructor(requestArgument: IRequestArgument) {
        super(requestArgument);
    }

    protected buildMongoQuery(queryBuilder: QueryBuilder): any {
        const mongoQuery: any = queryBuilder.buildMembersPipeline(this.requestArgument.fieldObject);
        queryBuilder.applyPaging(mongoQuery, {skipNumber: this._currentPageIndex, limitNumber: this.CHUNK_SIZE});
        this._currentPageIndex += this.CHUNK_SIZE;
        return mongoQuery;
    };

    protected parseQueryResult = (queryResult: Promise<any>) => 
        MongoResponseParser.getInstance().parseMembersFromCursor(queryResult, this.requestArgument.fieldObject);

    public toJSON(response: any, nextPageToken: string): any {
        const jsonResponse: any = {
            "members": response
        };
        if (nextPageToken != null) jsonResponse["nextPageToken"] = nextPageToken;
        return jsonResponse;
    }
}