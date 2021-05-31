import {FilterQueryBuilder} from './FilterQueryBuilder';
import {ProjectionQueryBuilder} from './ProjectionQueryBuilder';
import {GroupingQueryBuilder} from './GroupingQueryBuilder';
import { MongoPipelineStages } from '../../utils/consts/MongoPipelineStages';
import { APISchema } from '../../schema/APISchema';
import { IQuery } from '../IQuery';

export class QueryBuilder {

    private static _queryBuilderInstance: QueryBuilder = null;

    private _filterQueryBuilder: FilterQueryBuilder = null;
    private _projectionQueryBuilder: ProjectionQueryBuilder = null;
    private _groupingQueryBuilder: GroupingQueryBuilder = null;

    constructor() {
        if (QueryBuilder._queryBuilderInstance != null) throw new Error("Initialization failed: "+
        "use Singleton.getInstance() instead of new.");

        this._filterQueryBuilder = new FilterQueryBuilder();
        this._projectionQueryBuilder = new ProjectionQueryBuilder(); 
        this._groupingQueryBuilder = new GroupingQueryBuilder();
        QueryBuilder._queryBuilderInstance = this;
    }

    public static getInstance() {
        if (this._queryBuilderInstance == null) {
            this._queryBuilderInstance = new QueryBuilder();
        }
        return this._queryBuilderInstance;
    }

    public buildDrillThroughPipeline(drillThroughQuery: any, schema: APISchema, clientSideLimit: number) {
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


        if (extendedQuery["filter"] != null) {
            pipeline.push({
                [MongoPipelineStages.MATCH]: this._filterQueryBuilder.buildFilterQuery(extendedQuery["filter"], schema)
            });
        }

        delete extendedQuery["filter"];

        pipeline.push({
            [MongoPipelineStages.PROJECT]: this._projectionQueryBuilder.buildProjectionStage(extendedQuery, schema)
        });

        pipeline.push({
            [MongoPipelineStages.LIMIT]: clientSideLimit
        });

        return pipeline;
    }

    // public buildAggregationPipeline(query: any, schema: APISchema) {
    //     if (query == null) throw new Error("Illegal argument exception. Query cannot be null");
    //     const pipeline: any[] = [];

    //     pipeline.push({
    //         [MongoPipelineStages.PROJECT]: this._projectionQueryBuilder.buildProjectionStage(query, schema)
    //     });
    //     if (query["filter"] != null) {
    //         pipeline.push({
    //             "$match": this._filterQueryBuilder.buildFilterQuery(query["filter"], schema)
    //         });
    //     }

    //     const queryCopy: any = JSON.parse(JSON.stringify(query)); 
    //     delete queryCopy["filter"]; //query with no filter;

    //     pipeline.push({
    //         [MongoPipelineStages.PROJECT]: this._projectionQueryBuilder.buildProjectionStage(queryCopy, schema)
    //     });

    //     if (query["aggs"] != null) {
    //         pipeline.push(this._groupingQueryBuilder.buildGroupStage(query["aggs"]));
    //     }
    //     return pipeline;
    // }

    public buildFlatPipelineFacet(query: any | IQuery[], schema: APISchema) {
        if (query == null) throw new Error("Illegal argument exception. Query cannot be null");
        const pipeline: any[] = [];
        const grandTotalQuery: IQuery = query.length === 1 ? null : query[0];
        const dataRecords: IQuery = query.length === 1 ? query[0] : query[1];

        const extendedQuery: any = {
            "aggs": {
                "by": {
                    "rows": dataRecords.clientQuery["fields"]
                }
            },
            "filter": dataRecords.clientQuery["filter"]
        };

        if (extendedQuery["filter"] != null) {
            pipeline.push({
                "$match": this._filterQueryBuilder.buildFilterQuery(extendedQuery["filter"], schema)
            });

            //need to test performance with and without this block
            // const queryCopy: any = JSON.parse(JSON.stringify(extendedQuery)); 
            // delete queryCopy["filter"]; //query with no filter;    
            // pipeline.push({
            //     [MongoPipelineStages.PROJECT]: this._projectionQueryBuilder.buildProjectionStage(queryCopy, schema)
            // });
        }
        delete extendedQuery["filter"]; //query with no filter;    

        pipeline.push({
            [MongoPipelineStages.PROJECT]: this._projectionQueryBuilder.buildProjectionStage(extendedQuery, schema)
        });

        const facetStage: any = {};
        if (grandTotalQuery !== null) facetStage[grandTotalQuery.definition] = [this._groupingQueryBuilder.buildGroupStage(grandTotalQuery.clientQuery["aggs"])];
        facetStage[dataRecords.definition] = [pipeline[0]];

        pipeline.push({
            [MongoPipelineStages.FACET]: facetStage
        });

        //console.log(">>>>>pipe", JSON.stringify(pipeline))
        return pipeline;
    }

    public buildAggregationPipelineFacet(queries: any | IQuery[], schema: APISchema, templateQuery?: IQuery, isPaginated?: boolean) {
        if (queries == null) throw new Error("Illegal argument exception. Query cannot be null");
        const pipeline: any[] = [];
        const intersectionQuery: IQuery = templateQuery === undefined ? (<IQuery[]>queries).shift() : JSON.parse(JSON.stringify(templateQuery));


        if (intersectionQuery.clientQuery["filter"] != null) {
            pipeline.push({
                [MongoPipelineStages.MATCH]: this._filterQueryBuilder.buildFilterQuery(intersectionQuery.clientQuery["filter"], schema)
            });

            delete intersectionQuery.clientQuery["filter"]
        }


        pipeline.push({
            [MongoPipelineStages.PROJECT]: this._projectionQueryBuilder.buildProjectionStage(intersectionQuery.clientQuery, schema)
        });

        if (intersectionQuery.clientQuery["aggs"] != null) {
            const facetStage: any = {};
            
            for (let i = 0; i < queries.length; i++) {
                const query: IQuery = queries[i];
                const facet: any[] = [this._groupingQueryBuilder.buildGroupStage(query.clientQuery["aggs"])];
                if (isPaginated !== undefined && isPaginated 
                    && (query.queryStats.chunkToLoad < query.queryStats.expectedNumberOfRecords)) {
                    this.applyPaging(facet, {
                        skipNumber: query.queryStats.sumOfLoadedRecords,
                        limitNumber: query.queryStats.chunkToLoad
                    });
                }
                //console.log(">>>>>Query", JSON.stringify(facet, null, ""));
                facetStage[queries[i].definition] = facet;
            }

            pipeline.push({
                [MongoPipelineStages.FACET]: facetStage
            });
        }

        //console.log(">>>>>>>MongoQuery", JSON.stringify(pipeline, null, ''));
        return pipeline;
    }

    public buildMembersPipeline(fieldObject: any, schema: APISchema): any[] {
        let query: any = {
            "aggs": {
                "by": {
                    "rows": [fieldObject.field]
                }
            }
        };
        let pipeline: any[] = [];

        // pipeline.push({
        //     [MongoPipelineStages.SORT]: {
        //         [field.uniqueName]: 1
        //     }
        // });
        if (fieldObject["filter"] !== undefined) {
            query["filter"] = fieldObject["filter"];
            pipeline.push({
                [MongoPipelineStages.MATCH]: this._filterQueryBuilder.buildFilterQuery(query["filter"], schema)
            });
        }
        
        pipeline.push({
            [MongoPipelineStages.PROJECT]: this._projectionQueryBuilder.buildProjectionStage(query, schema)
        });

        pipeline.push(this._groupingQueryBuilder.buildGroupStage(query["aggs"]));

        return pipeline;
    }

    private applyPaging(pipeline: any[], pagingObject?: PagingObject): void {
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