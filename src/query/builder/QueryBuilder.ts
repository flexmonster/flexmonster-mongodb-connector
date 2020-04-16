import {FilterQueryBuilder} from './FilterQueryBuilder';
import {ProjectionQueryBuilder} from './ProjectionQueryBuilder';
import {GroupingQueryBuilder} from './GroupingQueryBuilder';
import {IRequestField} from '../../requests/apiRequests/IRequestArgument';
import { MongoPipelineStages } from '../../utils/consts/MongoPipelineStages';
import { APISchema } from '../../schema/APISchema';

export class QueryBuilder {

    private static _queryBuilderInstance: QueryBuilder = null;

    private _filterQueryBuilder: FilterQueryBuilder = null;
    private _projectionQueryBuilder: ProjectionQueryBuilder = null;
    private _groupingQueryBuilder: GroupingQueryBuilder = null;

    constructor() {
        if (QueryBuilder._queryBuilderInstance != null) throw new Error("Instantiation failed: "+
        "use Singleton.getInstance() instead of new.");

        this._filterQueryBuilder = new FilterQueryBuilder();
        this._projectionQueryBuilder = new ProjectionQueryBuilder(); 
        this._groupingQueryBuilder = new GroupingQueryBuilder();
    }

    public static getInstance() {
        if (this._queryBuilderInstance == null) {
            this._queryBuilderInstance = new QueryBuilder();
        }
        return this._queryBuilderInstance;
    }

    public buildDrillThroughPipeline(drillThroughQuery: any, schema: APISchema) {
        if (drillThroughQuery == null) throw new Error("Illegal argument exception. Query cannot be null");

        const pipeline: any[] = [];

        const extendedQuery: any = {
            "aggs": {
                "by": {
                    "rows": drillThroughQuery["fields"]
                }
            },
            "filter": drillThroughQuery["filter"]
        };

        pipeline.push({
            [MongoPipelineStages.PROJECT]: this._projectionQueryBuilder.buildProjectionStage(extendedQuery, schema)
        });

        if (extendedQuery["filter"] != null) {
            pipeline.push({
                [MongoPipelineStages.MATCH]: this._filterQueryBuilder.buildFilterQuery(extendedQuery["filter"], schema)
            });
        }

        delete extendedQuery["filter"];
        pipeline.push({
            [MongoPipelineStages.PROJECT]: this._projectionQueryBuilder.buildProjectionStage(extendedQuery, schema)
        });

        return pipeline;
    }

    public buildAggregationPipeline(query: any, schema: APISchema) {
        if (query == null) throw new Error("Illegal argument exception. Query cannot be null");
        const pipeline: any[] = [];

        pipeline.push({
            [MongoPipelineStages.PROJECT]: this._projectionQueryBuilder.buildProjectionStage(query, schema)
        });
        if (query["filter"] != null) {
            pipeline.push({
                "$match": this._filterQueryBuilder.buildFilterQuery(query["filter"], schema)
            });
        }

        const queryCopy: any = JSON.parse(JSON.stringify(query)); 
        delete queryCopy["filter"]; //query with no filter;

        pipeline.push({
            [MongoPipelineStages.PROJECT]: this._projectionQueryBuilder.buildProjectionStage(queryCopy, schema)
        });

        if (query["aggs"] != null) {
            pipeline.push(this._groupingQueryBuilder.buildGroupStage(query["aggs"]));
        }
        return pipeline;
    }

    public buildMembersPipeline(field: IRequestField, schema: APISchema): any[] {
        let query = {
            "aggs": {
                "by": {
                    "rows": [field]
                }
            }
        };

        let pipeline: any[] = [];

        pipeline.push({
            [MongoPipelineStages.PROJECT]: this._projectionQueryBuilder.buildProjectionStage(query, schema)
        });
        pipeline.push(this._groupingQueryBuilder.buildGroupStage(query["aggs"]));

        return pipeline;
    }

    public applyPaging(pipeline: any[], pagingObject?: PagingObject): void {
        if (pagingObject != null) {
            pipeline.push({
                [MongoPipelineStages.SKIP]: pagingObject.skipNumber
            });
            pipeline.push({
                [MongoPipelineStages.LIMIT]: pagingObject.limitNumber
            });
        }
    }

}

export interface PagingObject {
    skipNumber: number;
    limitNumber: number;    
}