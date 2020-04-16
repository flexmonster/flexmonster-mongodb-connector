export class DateParts {

    public static YEAR: string = "year";
    public static MONTH: string = "month";
    public static DAY: string = "day";
    public static HOUR: string = "hour";
    public static MINUTE: string = "minute";
    public static SECOND: string = "second";
    public static TIMESTAMP: string = "timestamp";

}

export class DateIntervals {

    public static DAY: string = "d";
    public static HOUR: string = "h";
    public static MINUTES: string = "m";
    public static SECONDS: string = "s";
    
    public static isValid(interval: string): boolean {
        return DateIntervals.DAY == interval || DateIntervals.HOUR == interval 
            || DateIntervals.MINUTES == interval || DateIntervals.SECONDS == interval;
    }
}