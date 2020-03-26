/**
 * @class
 * @property {string} uniqueName The uniquename of the field
 * @property {string} type The type of the field
 * @property {string} caption The caption of the field
 * @property {string} folder The path to field Geo/country
 * @property {string[]} aggregations The aggregations which are available for field
 * @property {SchemaValueObject} returns SchemaValueObject object
 */
export class SchemaValueObject {

    public uniqueName = "";
    public type = "";
    public caption = "";
    public folder: string;
    public aggregations: string[];

    constructor(uniqueName: string, type: string, caption: string, folder: string = "", aggregations: string[] = []) {
        this.uniqueName = uniqueName;
        this.type = type;
        this.caption = caption;
        this.folder = folder;
        this.aggregations = aggregations;
    }

    public static fromObject(obj: any) {
        let uniqueName = "";
        let type = "";
        let caption = "";
        let folder = "";
        let aggregations = [];
        if (obj.hasOwnProject("uniqueName")) {
            uniqueName = obj["uniqueName"];
        }
        if (obj.hasOwnProject("type")) {
            type = obj["type"];
        }
        if (obj.hasOwnProject("caption")) {
            caption = obj["caption"]
        }
        if (obj.hasOwnProject("folder")) {
            folder = obj["folder"]
        }
        if (obj.hasOwnProject("aggregations")) {
            aggregations = obj["aggregations"]
        }
        return new SchemaValueObject(uniqueName, type, caption, folder, aggregations);
    }

    toObject() {
        let resultObject: any = {
            "uniqueName": this.uniqueName,
            "type": this.type,
            "caption": this.caption
        };
        if (this.folder != "") {
            resultObject["folder"] = this.folder;
        }
        if (this.aggregations.length > 0) {
            resultObject["aggregations"] = this.aggregations;
        }
        return resultObject;
    }

}