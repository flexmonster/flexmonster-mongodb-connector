export interface IRequestArgument {

    index: string;
    fieldObject?: IRequestField;
    query?: any;
    //page?: number;

}

export interface IRequestField {
    uniqueName: string,
    type: string,
    interval?: string
}