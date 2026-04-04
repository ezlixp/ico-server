import { API_VERSION } from "../../src/config";
import { request } from "../globalSetup";

describe("HEAD /", () => {
    it("should pass", async () => {
        const res = await request.head(`/api/${API_VERSION}/`);
        expect(res.status).toBe(200);
    });
});

