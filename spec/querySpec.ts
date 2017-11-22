import { Polyline } from "arcgis-rest-api";
import {
    findRouteLocation, getAllFeatures, getFeatureByRouteId, getNearestRouteFeature,
    getRoutesNearPoint,
} from "../index";

const layerQueryUrl = "https://data.wsdot.wa.gov/arcgis/rest/services/Shared/StateRoutes/FeatureServer/0/query";

describe("ArcGIS REST API query + TurfJS tests", () => {

    it("Should be able to find a point near a line", async (done) => {
        try {
            const pointCoords = [-121.691053211689, 47.44456446804845];
            const routes = await getRoutesNearPoint(layerQueryUrl, pointCoords);
            expect(routes).not.toBeNull();
            routes.features.forEach((feature) => {
                expect(feature.geometry).not.toBeNull();
            });

            const [routeFeature, distance] = getNearestRouteFeature(pointCoords, routes);
            expect(routeFeature).not.toBeNull();
            expect(routeFeature.geometry).not.toBeNull();
            expect((routeFeature.geometry as Polyline).paths).toBeTruthy();
            expect(routeFeature.attributes.RouteID.length).toBeGreaterThanOrEqual(3);
            expect(distance).toBeGreaterThanOrEqual(0);
            done();
        } catch (ex) {
            done.fail(ex);
        }
    });

    it("should be able get a route by ID", async (done) => {
        try {
            const routeFeature = await getFeatureByRouteId(layerQueryUrl, "009");
            expect((routeFeature.geometry as Polyline).paths).toBeTruthy();
            done();
        } catch (error) {
            done.fail(error);
        }
    });

    it("should be able to locate points and line segments along routes", async (done) => {
        const routeId = "009";
        const [beginM, endM] = [0, 5];
        try {
            const feature = await findRouteLocation(layerQueryUrl, routeId, beginM, endM);
            console.log(JSON.stringify(feature));
            expect(feature.type).toEqual("LineString");
            done();
        } catch (error) {
            done.fail(error);
        }
    });

    xit("should be able to retrieve all features", async (done) => {
        try {
            const featureSet = await getAllFeatures(layerQueryUrl);
            expect(featureSet.geometryType === "esriGeometryPolyline");
            expect(featureSet.features.length).toBeGreaterThan(0);
            done();
        } catch (error) {
            done.fail(error);
        }
    }, 30000);
});
