import { IApiRequest } from "../apiRequests/IApiRequest";
import { IRequestArgument } from "../apiRequests/IRequestArgument";
import { RequestType } from "../apiRequests/RequestType";
import { MembersApiRequest } from "../apiRequests/impl/MembersApiRequest";
import { AggregationApiRequest } from "../apiRequests/impl/AggregationApiRequest";
import { DrillThroughApiRequest } from "../apiRequests/impl/DrillThroughApiRequest";
import { FlatApiRequest } from "../apiRequests/impl/FlatApiRequest";

export class RequestFactory {

    public static createRequestInstance(requestArgument: IRequestArgument, requestType: string): IApiRequest {
        let apiRequest: IApiRequest = null;
        switch (requestType) {
            case RequestType.MEMBERS_REQUEST:
                apiRequest = new MembersApiRequest(requestArgument);
                break;
            case RequestType.AGGREGATION_REQUEST:
                apiRequest = new AggregationApiRequest(requestArgument);
                break;
            case RequestType.DRILLTHROUGH_REQUEST:
                apiRequest = new DrillThroughApiRequest(requestArgument);
                break;
            case RequestType.FLAT_REQUEST:
                apiRequest = new FlatApiRequest(requestArgument);
                break;
            default:
                throw new Error("Unexpected request type.");
        }
        return apiRequest;
    }
}