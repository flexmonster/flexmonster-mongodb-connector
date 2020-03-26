export class SupportedAggregations {

    static numericFieldAggregations: any = {
        "sum": "$sum",
        "average": "$avg",
        "count": "$sum",
        "min": "$min",
        "max": "$max",
        "stdevs": "$stdDevSamp",
        "stdevp": "$stdDevPop"
    }

    static dateFieldAggregations: any = {
        "count": "$sum",
        "min": "$min",
        "max": "$max"
    }

    static nonNumericFieldAggregations: any = {
        "count": "$sum"
    }
}