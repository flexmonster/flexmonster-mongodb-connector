import {SchemaValueObject} from "./SchemaValueObject";

type FieldUniqueName = string;

export class APISchema {

    private _mapOfSchemaValueObjects: Map<FieldUniqueName, SchemaValueObject> = null;
    private _sorted: boolean = false;
    private _filters: object = {
        "any": {
            "members": true,
            "query": true,
            "valueQuery": false
        }
    };

    constructor (mapOfSchemaValueObjects = new Map<FieldUniqueName, SchemaValueObject>(), sorted = false) {
        this._mapOfSchemaValueObjects = mapOfSchemaValueObjects;
        this._sorted = sorted;
    }

    public get fields(): Map<FieldUniqueName, SchemaValueObject> {
        return this._mapOfSchemaValueObjects;
    }

    public set fields(mapOfSchemaValueObjects: Map<FieldUniqueName, SchemaValueObject>) {
        this._mapOfSchemaValueObjects = mapOfSchemaValueObjects;
    }

    public get sorted (): boolean {
        return this._sorted;
    }

    public set sorted (sorted: boolean) {
        this._sorted = sorted;
    }

    toJSON() {
        let obj: any = {};
        let schemaObjects = [];
        let values = this._mapOfSchemaValueObjects.values();
        for (let value of values) {
            schemaObjects.push(value.toObject());
        }
        obj["fields"] = schemaObjects;
        obj["sorted"] = this._sorted;
        obj["filters"] = this._filters;
        return obj;
    }

}
