import { default as along } from "@turf/along";
import { Feature as TurfFeature, LineString as TurfLineString, Units as TurfUnits} from "@turf/helpers";
import { default as lineSliceAlong } from "@turf/line-slice-along";
import { default as pointToLineDistance } from "@turf/point-to-line-distance";
import { Feature, FeatureSet, Polyline } from "arcgis-rest-api";
import { arcgisToGeoJSON } from "arcgis-to-geojson-utils";
import { Feature as GeoJsonFeature, LineString, MultiLineString, Point } from "geojson";
import { getFeatureByRouteId } from "./FeatureServiceLayer";
import QueryError, { checkForError } from "./QueryError";
import { ensureQueryUrl, objectToSearch } from "./utils";

if (typeof fetch === "undefined") {
    // tslint:disable-next-line:no-var-requires
    require("isomorphic-fetch");
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
