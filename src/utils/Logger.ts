export class Logger {

    private static _logger: Logger = undefined;
    private _isEnabled: boolean;

    constructor(isEnabled: boolean = false) {
        if (typeof Logger._logger !== 'undefined') {
            throw new Error("Initialization failed: "+
            "use Singleton.getInstance() instead of new.");
        }
        this._isEnabled = isEnabled;
        Logger._logger = this;
    }

    public static getInstance(): Logger {
        return Logger._logger;
    }

    public log(dataMessage: any): void {
        console.log(dataMessage);
        return;
    }
}