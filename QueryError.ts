/**
 * Error info from the "error" property of an ArcGIS
 * Server failed request.
 */
export interface IErrorResponseInfo {
    code: number;
    message: string;
    details: string[];
}

/**
 * The JSON response format from a failed ArcGIS
 * Server request (which still has a 200 status code).
 */
export interface IErrorResponseJson {
    error: IErrorResponseInfo;
}

/**
 * Custom error class representing a failed request
 * to ArcGIS Server.
 */
export default class QueryError extends Error implements IErrorResponseInfo {
    // tslint:disable-next-line:variable-name
    private _code: number;
    // tslint:disable-next-line:variable-name
    private _details: string[];

    /** Error code */
    public get code(): number {
        return this._code;
    }
    /** Details about the error. */
    public get details(): string[] {
        return this._details;
    }

    /**
     * Creates a new QueryError
     * @param errorInfo The error returned from the server.
     */
    constructor(errorInfo: IErrorResponseJson | IErrorResponseInfo) {
        const errorContent =
            errorInfo.hasOwnProperty("error") ?
                (errorInfo as IErrorResponseJson).error :
                errorInfo as IErrorResponseInfo;

        super(errorContent ? errorContent.message : undefined);
        if (errorContent) {
            this._code = errorContent.code;
            this._details = errorContent.details;
        }
    }
}

/**
 * Checks the response from a query and throws an exception if
 * the property "error" is present in the response object.
 * @param obj Json parsed to object returned from a feature service layer query.
 */
export function checkForError(obj: any) {
    if (obj.hasOwnProperty("error")) {
        throw new QueryError(obj.error);
    }
}
