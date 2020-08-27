export interface IRequestArgument {

    index: string;
    fieldObject?: IRequestField;
    clientQuery?: any;
    //page?: number;

}

export interface IRequestField {
    uniqueName: string,
    interval?: string
}