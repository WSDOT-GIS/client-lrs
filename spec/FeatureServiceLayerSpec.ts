import { Polyline } from "arcgis-rest-api";
import FeatureServiceLayer from "../FeatureServiceLayer";

const layerQueryUrl = "https://data.wsdot.wa.gov/arcgis/rest/services/Shared/StateRoutes/FeatureServer/0/";

describe("Feature Service Layer Query", () => {

    const layer = new FeatureServiceLayer(layerQueryUrl);

    it("should be able get a route by ID", async (done) => {
        try {
            const routeFeature = await layer.getFeatureByRouteId("009");
            expect((routeFeature.geometry as Polyline).paths).toBeTruthy();
            done();
        } catch (error) {
            done.fail(error);
        }
    });

    it("should be able to retrieve all features", async (done) => {
        try {
            const featureSet = await layer.getAllFeatures();
            expect(featureSet.geometryType === "esriGeometryPolyline");
            expect(featureSet.features.length).toBeGreaterThan(0);
            done();
        } catch (error) {
            done.fail(error);
        }
    }, 30000);
});
