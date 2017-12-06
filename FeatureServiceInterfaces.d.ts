import { Envelope, esriGeometryType, Feature, Field, Geometry, SpatialReference } from "arcgis-rest-api";

export type esriSpatialRel = "esriSpatialRelIntersects" | "esriSpatialRelContains" | "esriSpatialRelCrosses" |
    "esriSpatialRelEnvelopeIntersects" | "esriSpatialRelIndexIntersects" | "esriSpatialRelOverlaps" |
    "esriSpatialRelTouches" | "esriSpatialRelWithin";

export type sqlFormat = "none" | "standard" | "native";

export interface INameIdPair {
    id: number;
    name: string;
}

export interface IFeatureService {
    currentVersion?: number;
    serviceDescription?: string;
    hasVersionedData?: boolean;
    supportsDisconnectedEditing?: boolean;
    hasStaticData?: boolean;
    maxRecordCount?: number;
    /**
     * comma-separated list of supported formats
     * @example "JSON"
     */
    supportedQueryFormats?: string;
    /**
     * comma-separated list of supported formats
     * @example "Query,Create,Delete,Update,Uploads,Editing"
     */
    capabilities?: string;
    description?: string;
    copyrightText?: string;
    spatialReference?: SpatialReference;
    initialExtent?: Envelope;
    fullExtent?: Envelope;
    allowGeometryUpdates?: boolean;
    units?: string; // e.g., "esriDecimalDegrees"
    syncEnabled?: boolean;
    syncCapabilities?: {
        supportsASync?: boolean,
        supportsRegisteringExistingData?: boolean,
        supportsSyncDirectionControl?: boolean,
        supportsPerLayerSync?: boolean,
        supportsPerReplicaSync?: boolean,
        supportsRollbackOnFailure?: boolean,
    };
    editorTrackingInfo?: {
        enableEditorTracking?: boolean,
        enableOwnershipAccessControl?: boolean,
        allowOthersToUpdate?: boolean,
        allowOthersToDelete?: boolean,
    };
    documentInfo?: { [key: string]: any };
    // the feature layers published by this service
    layers?: INameIdPair[];
    // the non-spatial tables published by this service
    tables?: INameIdPair[];
    enableZDefaults?: boolean;
    zDefault?: number;
}

export interface IFeatureServiceQuery {
    f?: "html" | "json" | "amf";
    layerDefs?: string | { [layerId: string]: string } | {
        layerId: number,
        where: string,
        outfields: string,
    };
    geometry?: Geometry | string;
    geometryType?: esriGeometryType;
    inSR?: SpatialReference | number;
    spatialRel?: esriSpatialRel;
    /**
     * Integer representation of time, or string containing
     * comma-separated list of two time integers
     * e.g., (new Date()).getTime()
     */
    time?: number | string;
    gdbVersion?: string;
    historicMoment?: number;
    returnGeometry?: boolean;
    maxAllowableOffset?: number;
    returnIdsOnly?: boolean;
    returnCountOnly?: boolean;
    returnZ?: boolean;
    returnM: boolean;
    geometryPrecision?: number;
    returnTrueCurves?: boolean;
    sqlFormat?: sqlFormat;
}

export interface IFeatureServiceQueryResponseLayer {
    id: number;
    objectIdFieldName: string;
    globalIdFieldName: string;
    geometryType: esriGeometryType; // for layers only
    spatialReference: SpatialReference; // for layers only
    hasZ: boolean;
    hasM: boolean;
    fields: Field[];
    features: Feature[];
}

export interface IFeatureServiceQueryResponseCountOnlyLayer {
    id: number;
    count: number;
}

export interface IFeatureQueryResponseIdsOnlyLayer {
    id: number;
    objectIdFieldName: string;
    objectIds: number[];
}

export interface IFeatureServiceQueryResponse {
    layers: IFeatureServiceQueryResponseLayer[] |
    IFeatureServiceQueryResponseCountOnlyLayer[] |
    IFeatureQueryResponseIdsOnlyLayer[];
}
