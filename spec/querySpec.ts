import { Polyline } from "arcgis-rest-api";
import { getRoutesNearPoint } from "../FeatureServiceLayer";
import { findPointAlongRoute, findRouteSegment, getNearestRouteFeature } from "../index";

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

    describe("linear referencing", () => {

        it("should be able to locate points and line segments along routes", async (done) => {
            const routeId = "101";
            const m = 0;
            try {
                const feature = await findPointAlongRoute(layerQueryUrl, routeId, m);
                // console.log(JSON.stringify(feature));
                expect(feature.type).toEqual("Feature");
                const geometry = feature.geometry;
                expect(geometry).not.toBeNull();
                if (geometry) {
                    expect(geometry.type).toEqual("Point");
                    expect(geometry.coordinates.length).toEqual(2);
                }
                done();
            } catch (error) {
                done.fail(error);
            }

            try {
                const endM = 5;
                const feature = await findRouteSegment(layerQueryUrl, routeId, m, endM);
                expect(feature.type).toEqual("Feature");
                const geometry = feature.geometry;
                expect(geometry).not.toBeNull();
                if (geometry) {
                    expect(geometry.type).toEqual("LineString");
                    expect(Array.isArray(geometry.coordinates)).toEqual(true);
                    for (const pointCoords of geometry.coordinates) {
                        for (const n of pointCoords) {
                            expect(typeof n).toBe("number");
                        }
                    }
                }
                done();
            } catch (error) {
                done.fail(error);
            }
        });
        it("should be able to locate route segment", async (done) => {
            const routeId = "009";
            const [beginM, endM] = [0, 5];
            let feature: GeoJSON.Feature<GeoJSON.LineString>;
            try {
                feature = await findRouteSegment(layerQueryUrl, routeId, beginM, endM);
            } catch (err) {
                if (err instanceof TypeError) {
                    expect(() => { throw err; }).toThrowError("Unsupported: Route is not contiguous.");
                    done();
                } else {
                    done.fail(err);
                }
            }
            done();
            // try {
            //     const feature = await findRouteSegment(layerQueryUrl, routeId, beginM, endM);
            //     console.log(JSON.stringify(feature));
            //     expect(feature.type).toEqual("LineString");
            //     done();
            // } catch (error) {
            //     done.fail(error);
            // }
        });
    });
});
