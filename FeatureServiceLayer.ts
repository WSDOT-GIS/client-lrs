import { Feature, FeatureSet } from "arcgis-rest-api";
import { checkForError } from "./QueryError";
import { ensureQueryUrl, objectToSearch } from "./utils";

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
 * Represents a layer of an ArcGIS Server Feature Service.
 */
export default class FeatureServiceLayer {

    // tslint:disable-next-line:variable-name
    private _url: string;
    /**
     * Gets the "url" property.
     */
    public get url(): string {
        return this._url;
    }
    /**
     * Sets the "url" property.
     * @throws Error - Throws an error if the URL that is being assigned is not validly formatted.
     */
    public set url(v: string) {
        const urlRe = /.+\/FeatureServer\/\d+/i;
        const match = v.match(urlRe);
        if (!match) {
            throw Error(`Invalid Feature Service Layer URL: ${v}`);
        }
        this._url = match[0];
    }

    /**
     * Creates a new instance of this class.
     * @param url URL to the feature service layer.
     */
    constructor(url: string) {
        this.url = url;
    }
    /**
     * Queries a feature service to find routes within a given search tolerance of a point.
     * @param point XY point coordinates
     * @param inSR Input spatial reference system WKID
     * @param outSR Output spatial reference system WKID
     * @param distance Distance around the point to search for routes.
     * @returns Returns a feature set of the route features that were within the search distance of the point.
     */
    public async getRoutesNearPoint(
        point: number[], routeIdField: string = "RouteID",
        inSR: number = 4326,
        outSR: number = 4326, distance: number = 50) {
        return getRoutesNearPoint(this.url, point, routeIdField, inSR, outSR, distance);
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
    public async getFeatureByRouteId(
        routeId: string, outSR?: number,
        routeIdField: string = "RouteID",
        returnZ: boolean = false,
        returnM: boolean = false) {
        return getFeatureByRouteId(this.url, routeId, outSR, routeIdField, returnZ, returnM);
    }
    /**
     * Get all features from a feature service layer.
     * @param outSR Output spatial reference WKID
     * @param outFields Output fields
     * @param returnGeometry Return geometry?
     * @param returnZ Return Z coordinates
     * @param returnM Return M coordinates
     */
    public async getAllFeatures(
        outSR?: number, outFields: string | string[] = "*", returnGeometry: boolean = true,
        returnZ: boolean = false, returnM: boolean = false) {
        return getAllFeatures(this.url, outSR, outFields, returnGeometry, returnZ, returnM);
    }
}
