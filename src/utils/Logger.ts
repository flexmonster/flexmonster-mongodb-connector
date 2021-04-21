export class Logger {

    private static _logger: Logger = undefined;
    private _isEnabled: boolean;
    private _currentTimer: NodeJS.Timeout = undefined;

    constructor(isEnabled: boolean = false) {
        if (typeof Logger._logger !== 'undefined') {
            throw new Error("Initialization failed: "+
            "use Singleton.getInstance() instead of new.");
        }
        this._isEnabled = isEnabled;
        Logger._logger = this;
        this.flushHandler();
    }

    public static getInstance(): Logger {
        return Logger._logger;
    }

    private flushHandler: () => void = () => {
        if (!this._isEnabled) return;
        if (typeof this._currentTimer !== "undefined") clearTimeout(this._currentTimer);
        this._currentTimer = setTimeout(() => {
            this.flushLogs();
        }, 1000);
    }

    private _logsStash: LogItemInterface[] = [];

    public log(...args: any[]): void {
        if (!this._isEnabled) return;
        let message: string = "";

        args.forEach((item) => {
            message += item.toString() + " ";
        });

        this._logsStash.push({ 
            message,
            timestamp: new Date()
        });
        return;
    }

    private readonly messageTemplate: string = "Flexmonster MongoDB Connector"
    private formatMessage(logItem: LogItemInterface): string {
        return logItem.timestamp.toISOString() + "|" + this.messageTemplate + "|" + logItem.message;
    }

    private flushLogs(): void {
        if (!this._isEnabled) return;

        this._logsStash.forEach((item: LogItemInterface) => {
            console.log(this.formatMessage(item));
        });

        this._logsStash = [];

        this.flushHandler();
    }
}

interface LogItemInterface {
    timestamp: Date;
    message: string;
}