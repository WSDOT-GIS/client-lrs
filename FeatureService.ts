import {
    IFeatureService,
    IFeatureServiceQuery,
    IFeatureServiceQueryResponse,
} from "./FeatureServiceInterfaces";
import { checkForError } from "./QueryError";
import { objectToSearch } from "./utils";

export default class FeatureService {
    // tslint:disable-next-line:variable-name
    private _featureServiceInfo: IFeatureService;
    public get featureServiceInfo(): Promise<IFeatureService> {
        if (this._featureServiceInfo) {
            return new Promise<IFeatureService>((t) => this._featureServiceInfo);
        }

        return fetch(this.url).then((response) => {
            const obj = response.json();
            checkForError(obj);
            return obj;
        });
    }

    public get queryUrl() {
        return `${this.url}/query`;
    }

    constructor(public url: string, featureServiceInfo?: IFeatureService) {
        if (featureServiceInfo) {
            this._featureServiceInfo = featureServiceInfo;
        }
    }

    public async query(queryInfo: IFeatureServiceQuery): Promise<IFeatureServiceQueryResponse> {
        queryInfo.f = "json";
        const searchString = objectToSearch(queryInfo);
        const url = `${this.queryUrl}?${searchString}`;
        const response = await fetch(url);
        const json = await response.json() as IFeatureServiceQueryResponse;
        checkForError(json);
        return json;
    }
}
