import { pointOnFeature, pointToLineDistance } from "@turf/turf";
import { Feature, FeatureSet, Polyline } from "arcgis-rest-api";
import { arcgisToGeoJSON } from "arcgis-to-geojson-utils";
import { Point } from "geojson";

if (typeof fetch === "undefined") {
    // tslint:disable-next-line:no-var-requires
    require("isomorphic-fetch");
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

function ensureQueryUrl(url: string) {
    // Add "/query" to the end of the URL if not already present.
    if (!/\/query\/?$/.test(url)) {
        url += "/query";
    }
    return url;
}

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

    return featureSet;
}

export async function getFeatureByRouteId(url: string, routeId: string, outSR?: number,
                                          routeIdField: string = "RouteID",
                                          returnGeometry: boolean = true, returnZ: boolean = false,
                                          returnM: boolean = false) {
    const where = `${routeIdField} = '${routeId}'`;
    const searchParams = {
        where,
        fields: routeIdField,
        returnGeometry,
        returnZ,
        returnM,
        outSR,
        f: "json",
    };

    const fullUrl = `${ensureQueryUrl(url)}?${objectToSearch(searchParams)}`;

    const response = await fetch(fullUrl);
    const featureSet = await response.json() as FeatureSet;
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

    const featureSet = await fetch(fullUrl).then((resp) => resp.json()) as FeatureSet;

    return featureSet;
}

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
