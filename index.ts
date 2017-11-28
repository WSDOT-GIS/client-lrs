import { default as along } from "@turf/along";
import { default as lineSliceAlong } from "@turf/line-slice-along";
import { default as pointToLineDistance } from "@turf/point-to-line-distance";
import { Feature, FeatureSet, Polyline } from "arcgis-rest-api";
import { arcgisToGeoJSON } from "arcgis-to-geojson-utils";
import { Feature as GeoJsonFeature, LineString, MultiLineString, Point } from "geojson";

if (typeof fetch === "undefined") {
    // tslint:disable-next-line:no-var-requires
    require("isomorphic-fetch");
}

export interface IErrorResponseInfo {
    code: number;
    message: string;
    details: string[];
}

export interface IErrorResponseJson {
    error: IErrorResponseInfo;
}

export class QueryError extends Error implements IErrorResponseInfo {
    // tslint:disable-next-line:variable-name
    private _code: number;
    // tslint:disable-next-line:variable-name
    private _details: string[];

    public get code(): number {
        return this._code;
    }
    public get details(): string[] {
        return this._details;
    }

    constructor(errorInfo: IErrorResponseInfo) {
        super(errorInfo ? errorInfo.message : undefined);
        if (errorInfo) {
            this._code = errorInfo.code;
            this._details = errorInfo.details;
        }
    }
}

function objectToSearch(searchParams: { [key: string]: any }) {
    const parts = new Array<string>();

    for (const name in searchParams) {
        if (!searchParams.hasOwnProperty(name)) {
            continue;
        }

        let value = (searchParams as any)[name];
        if (value === undefined) {
            continue;
        }
        value = value.toString();

        parts.push([name, value].map(encodeURIComponent).join("="));
    }

    return parts.join("&");
}

/**
 * Add "/query" to the end of the URL if not already present.
 * @param url feature service layer URL
 */
function ensureQueryUrl(url: string) {
    // Add "/query" to the end of the URL if not already present.
    if (!/\/query\/?$/.test(url)) {
        url += "/query";
    }
    return url;
}

/**
 * Checks the response from a query and throws an exception if
 * the property "error" is present in the response object.
 * @param obj Json parsed to object returned from a feature service layer query.
 */
function checkForError(obj: any) {
    if (obj.hasOwnProperty("error")) {
        throw new QueryError(obj.error);
    }
}

/**
 * Get all features from a feature service layer.
 * @param url Feature service layer URL
 * @param outSR Output spatial reference WKID
 * @param outFields Output fields
 * @param returnGeometry Return geometry?
 * @param returnZ Return Z coordinates
 * @param returnM Return M coordinates
 */
export async function getAllFeatures(
    url: string, outSR?: number, outFields: string | string[] = "*", returnGeometry: boolean = true,
    returnZ: boolean = false, returnM: boolean = false) {
    const searchParams = {
        // If fields are in an array, convert to comma-separated string list.
        outFields: Array.isArray(outFields) ? outFields.join(",") : outFields,
        f: "json",
        returnGeometry,
        returnZ,
        returnM,
        outSR,
    };

    const fullUrl = `${ensureQueryUrl(url)}?${objectToSearch(searchParams)}`;

    const response = await fetch(fullUrl);
    const featureSet = await response.json() as FeatureSet;
    checkForError(featureSet);
    return featureSet;
}

/**
 * Find a specific route feature by it's route ID.
 * @param url Feature service layer URL.
 * @param routeId Route ID to search for.
 * @param outSR Output spatial reference WKID
 * @param routeIdField The field that contains unique route ID.
 * @param returnZ Return Z coordinates?
 * @param returnM Return M coordinates?
 */
export async function getFeatureByRouteId(
    url: string, routeId: string, outSR?: number,
    routeIdField: string = "RouteID",
    returnZ: boolean = false,
    returnM: boolean = false) {
    const where = `${routeIdField} = '${routeId}'`;
    const searchParams = {
        where,
        fields: routeIdField,
        returnGeometry: true,
        outFields: routeIdField,
        returnZ,
        returnM,
        outSR,
        f: "json",
    };

    const fullUrl = `${ensureQueryUrl(url)}?${objectToSearch(searchParams)}`;

    const response = await fetch(fullUrl);
    const featureSet = await response.json() as FeatureSet;
    checkForError(featureSet);
    return featureSet.features[0];
}

/**
 * Queries a feature service to find routes within a given search tolerance of a point.
 * @param url URL to a Feature Service layer.
 * @param point XY point coordinates
 * @param inSR Input spatial reference system WKID
 * @param outSR Output spatial reference system WKID
 * @param distance Distance around the point to search for routes.
 * @returns Returns a feature set of the route features that were within the search distance of the point.
 */
export async function getRoutesNearPoint(
    url: string, point: number[], routeIdField: string = "RouteID",
    inSR: number = 4326,
    outSR: number = 4326, distance: number = 50) {

    url = ensureQueryUrl(url);

    const searchParams = {
        geometry: point.map((n) => n.toString(10)).join(","),
        geometryType: "esriGeometryPoint",
        distance,
        spatialRel: "esriSpatialRelIndexIntersects",
        units: "esriSRUnit_Foot",
        outFields: routeIdField,
        returnGeometry: true,
        // returnZ: false,
        // returnM: true,
        inSR,
        outSR,
        f: "json",
    };

    const fullUrl = `${url}?${objectToSearch(searchParams)}`;

    const response = await fetch(fullUrl);
    const featureSet = await response.json() as FeatureSet;
    checkForError(featureSet);
    return featureSet;
}

/**
 * Given the result feature set from the {@link getRoutesNearPoint} function,
 * returns the feature with the shortest distance between the input point and
 * the route feature.
 * @param point
 * @param routesNearPointFeatureSet
 * @returns an array where the first element is the nearest {@link Feature} and
 * the second is the distance.
 */
export function getNearestRouteFeature(point: number[], routesNearPointFeatureSet: FeatureSet): [Feature, number] {
    const geoJsonPoint: Point = {
        type: "Point",
        coordinates: point,
    };
    let shortestDistance: number | undefined;
    let closestRouteFeature: Feature | undefined;

    for (const feature of routesNearPointFeatureSet.features) {
        const lineString = arcgisToGeoJSON(feature.geometry) as GeoJSON.LineString;
        const distanceInMilies = pointToLineDistance(geoJsonPoint, lineString, { units: "miles" });

        if (shortestDistance === undefined || distanceInMilies < shortestDistance) {
            shortestDistance = distanceInMilies;
            closestRouteFeature = feature;
        }
    }

    if (shortestDistance === undefined || closestRouteFeature === undefined) {
        throw new Error("Could not find nearest route feature");
    }

    return [closestRouteFeature, shortestDistance];
}

/**
 * Finds a point or a line segment along a route.
 * @param url Feature Service Layer URL.
 * @param routeId Route identifier
 * @param measure Measure.
 * @param outSR Output spatial reference
 * @param routeIdField Specifies the route ID field
 */
export async function findPointAlongRoute(
    url: string, routeId: string, measure: number,
    outSR?: number, routeIdField: string = "RouteID") {

    const routeFeature = await getFeatureByRouteId(url, routeId, outSR, routeIdField);
    const geometry = arcgisToGeoJSON(routeFeature.geometry) as GeoJSON.LineString | GeoJSON.MultiLineString;
    let lineString: LineString | undefined;
    let multiLineString: MultiLineString | undefined;

    if (geometry.type === "MultiLineString") {
        if (geometry.coordinates.length === 1) {
            lineString = {
                type: "LineString",
                coordinates: geometry.coordinates[0],
            };
        } else {
            // // TODO: iterate through each part of the linestring geometries using iterator.
            // throw new Error("Route is a MultiLineString");
            multiLineString = {
                type: "MultiLineString",
                coordinates: geometry.coordinates,
            };
        }
    } else {
        lineString = geometry as LineString;
    }

    if (lineString) {
            return along(lineString, measure, { units: "miles" });
    } else if (multiLineString) {
        for (const lsCoords of multiLineString.coordinates) {
            lineString = {
                type: "LineString",
                coordinates: lsCoords,
            };
            let pointFeature: GeoJsonFeature<Point, any>;
            try {
                pointFeature = along(lineString, measure, { units: "miles" });
            } catch (err) {
                throw err;
            }
            if (pointFeature) {
                return pointFeature;
            }
        }
    }

    throw TypeError("Unsupported geometry type");
}

/**
 * Finds a point or a line segment along a route.
 * @param url Feature Service Layer URL.
 * @param routeId Route identifier
 * @param beginMeasure Begin measure. (Only measure for points.)
 * @param endMeasure End measure. (Line segments only.)
 * @param outSR Output spatial reference
 * @param routeIdField Specifies the route ID field
 */
export async function findRouteSegment(
    url: string, routeId: string, beginMeasure: number, endMeasure: number,
    outSR?: number, routeIdField: string = "RouteID") {

    const routeFeature = await getFeatureByRouteId(url, routeId, outSR, routeIdField);
    const geometry = arcgisToGeoJSON(routeFeature.geometry) as GeoJSON.LineString | GeoJSON.MultiLineString;
    let lineString: LineString | undefined;
    let multiLineString: MultiLineString | undefined;

    if (geometry.type === "MultiLineString") {
        if (geometry.coordinates.length === 1) {
            lineString = {
                type: "LineString",
                coordinates: geometry.coordinates[0],
            };
        } else {
            // // TODO: iterate through each part of the linestring geometries using iterator.
            // throw new Error("Route is a MultiLineString");
            multiLineString = {
                type: "MultiLineString",
                coordinates: geometry.coordinates,
            };
        }
    } else {
        lineString = geometry as LineString;
    }

    if (lineString) {
        return lineSliceAlong(lineString, beginMeasure, endMeasure, { units: "miles" });
    } else if (multiLineString) {
        throw new TypeError("Unsupported: Route is not contiguous.");
    } else {
        throw TypeError("Unsupported geometry type");
    }

}
