export class MongoFilterQueries {
    
    public static REGEXP: string = "$regex";
    public static EQUAL: string = "$eq";
    public static NOT: string = "$not";
    public static GREATER: string = "$gt";
    public static GREATER_EQUAL: string = "$gte";
    public static LESS: string = "$lt";
    public static LESS_EQUAL: string = "$lte";
    public static INCLUDE: string = "$in";
    public static EXCLUDE: string = "$nin";
    public static AND: string = "$and";
    public static OR: string = "$or";
}