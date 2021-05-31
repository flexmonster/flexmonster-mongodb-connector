import { ConfigInterface } from "./ConfigInterface";

export class ConfigManager {

    private static _instance: ConfigManager = undefined;
    private _currentConfig: ConfigInterface = undefined;
    private _defaultConfig: ConfigInterface = {
        cacheMemoryLimit: 0, //no limit; in MB
        cacheEnabled: true,
        cacheTimeToLive: 0, //data in cache does not get outdated (in minutes) (cacheTimeToLive)
        logsEnabled: false
    };

    constructor(config?: ConfigInterface) {
        if (ConfigManager._instance !== undefined) throw new Error("Initialization failed: "+
        "use Singleton.getInstance() instead of new.");

        this._currentConfig = this.validateConfig(config);
    }

    public static getInstance(config?: ConfigInterface): ConfigManager {
        if (this._instance === undefined) {
            this._instance = new ConfigManager(config);
        }
        return this._instance;
    }

    private validateConfig(config: ConfigInterface): ConfigInterface {
        if (config === undefined) return this._defaultConfig;
        let currentConfig: ConfigInterface = {};

        if (config.cacheMemoryLimit !== undefined || config.cacheMemoryLimit !== null) {
            currentConfig.cacheMemoryLimit = !isNaN(config.cacheMemoryLimit) && config.cacheMemoryLimit > 0 
                ? config.cacheMemoryLimit 
                : this._defaultConfig.cacheMemoryLimit;
        }
        if (config.cacheTimeToLive !== undefined || config.cacheTimeToLive !== null) {
            currentConfig.cacheTimeToLive = !isNaN(config.cacheTimeToLive) && config.cacheTimeToLive > 0
                ? config.cacheTimeToLive
                : this._defaultConfig.cacheTimeToLive;
        }
        currentConfig.cacheEnabled = (config.cacheEnabled !== undefined || config.cacheEnabled !== null)
            ? (typeof config.cacheEnabled === "boolean" ? config.cacheEnabled : this._defaultConfig.cacheEnabled)
            : this._defaultConfig.cacheEnabled
        currentConfig.logsEnabled = config.logsEnabled !== undefined || config.logsEnabled !== null
            ? (typeof config.logsEnabled === "boolean" ? config.logsEnabled : this._defaultConfig.logsEnabled)
            : this._defaultConfig.logsEnabled;


        return currentConfig;
    }

    public get currentConfig(): ConfigInterface {
        return this._currentConfig;
    }

    public toString(): string {
        return JSON.stringify(this.currentConfig);
    }
}