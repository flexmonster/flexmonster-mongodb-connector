import { ILogger } from "./ILogger";
import { FlexmonsterLogger } from "./FlexmonsterLogger";

export class LoggingManager {

    private _isEnabled: boolean;
    private logger: ILogger;
    private static instance: LoggingManager = undefined;


    constructor(isEnabled: boolean) {
        this._isEnabled = isEnabled;
        if (this._isEnabled) this.logger = this.getSupportedLoggers();
        if (typeof LoggingManager.instance !== "undefined") throw new Error("Initialization failed: "+
        "use Singleton.getInstance() instead of new.");
        LoggingManager.instance = this;
    }

    public static log(...args: any[]): void {
        if (!LoggingManager.instance._isEnabled) return;
        LoggingManager.instance.logger.log(...args);
    }

    public isLogsEnabled(): boolean {
        return this._isEnabled;
    }

    private getSupportedLoggers(): ILogger {
        return new FlexmonsterLogger();
    }
}