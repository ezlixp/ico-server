import UserModel from "../../src/models/entities/userModel";
import { UserErrors } from "../../src/errors/messages/userErrors";
import { API_VERSION } from "../../src/config";
import { authHeader, request } from "../globalSetup";
import mongoose from "mongoose";
import { getMissingFieldMessage } from "../../src/errors/implementations/missingFieldError";
import { ErrorResponse } from "../../src/communication/responses/errorResponse";

describe("User info routes", () => {
    beforeEach(async () => {
        mongoose.connection.dropDatabase();
        await UserModel.insertMany([
            {
                discordUuid: "752610633580675176",
                banned: false,
                blocked: ["pixlze", "pixlze2"],
                mcUuid: "39365bd45c7841de8901c7dc5b7c64c4",
                muted: false,
                refreshToken: "none",
                status: 0,
                verified: true,
            },
            {
                discordUuid: "752610633580675175",
                banned: false,
                blocked: ["pixlze3", "pixlze4"],
                mcUuid: "",
                muted: false,
                refreshToken: "none",
                status: 3,
                verified: true,
            },
        ]);
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
    });

    describe(`GET /api/${API_VERSION}/user/blocked/:mcUuid`, () => {
        it("should return all blocked users", async () => {
            const res = await request
                .get(`/api/${API_VERSION}/user/blocked/39365bd45c7841de8901c7dc5b7c64c4`)
                .set(await authHeader);
            expect(res.status).toBe(200);
            expect(res.body).toStrictEqual(["pixlze", "pixlze2"]);
        });

        it("should handle missing users", async () => {
            const res = await request.get(`/api/${API_VERSION}/user/blocked/missing`).set(await authHeader);
            expect(res.status).toBe(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: UserErrors.NOT_FOUND,
            });

            const res2 = await request.get(`/api/${API_VERSION}/user/blocked/`).set(await authHeader);
            expect(res2.status).toBe(404);
            expect(res2.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: "not found",
            });
        });
    });

    describe(`POST api/${API_VERSION}/user/blocked/:mcUuid`, () => {
        it("should add a blocked user", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/user/blocked/39365bd45c7841de8901c7dc5b7c64c4`)
                .send({ toBlock: "newblocked" })
                .set(await authHeader);
            expect(res.status).toBe(200);
            expect(res.body.blocked).toContain("newblocked");
        });

        it("should handle missing toBlock field", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/user/blocked/39365bd45c7841de8901c7dc5b7c64c4`)
                .set(await authHeader);
            expect(res.status).toBe(400);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 400,
                title: "Error",
                errorMessage: getMissingFieldMessage("toBlock", typeof "_"),
            });
        });

        it("should handle empty toBlock field", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/user/blocked/39365bd45c7841de8901c7dc5b7c64c4`)
                .send({ toBlock: "" })
                .set(await authHeader);
            expect(res.status).toBe(400);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 400,
                title: "Error",
                errorMessage: getMissingFieldMessage("toBlock", typeof "_"),
            });
        });
    });

    describe(`DELETE api/${API_VERSION}/user/blocked`, () => {
        it("should remove a username from the blocked list", async () => {
            const res = await request
                .delete(`/api/${API_VERSION}/user/blocked/39365bd45c7841de8901c7dc5b7c64c4?toRemove=pixlze`)
                .set(await authHeader);
            expect(res.status).toBe(200);
            expect(res.body.blocked).not.toContain("pixlze");
            expect(res.body.blocked).toContain("pixlze2");
        });

        it("should handle attempting to remove a non blocked username", async () => {
            const res = await request
                .delete(`/api/${API_VERSION}/user/blocked/39365bd45c7841de8901c7dc5b7c64c4?toRemove=missing`)
                .set(await authHeader);
            expect(res.status).toBe(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: UserErrors.NOT_IN_BLOCKED_LIST,
            });
        });

        it("should handle missing query param", async () => {
            const res = await request
                .delete(`/api/${API_VERSION}/user/blocked/39365bd45c7841de8901c7dc5b7c64c4`)
                .set(await authHeader)
                .expect(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: UserErrors.NOT_IN_BLOCKED_LIST,
            });
        });
    });

    describe(`GET /api/${API_VERSION}/user/status/:discordUuid`, () => {
        it("should get a user's online status", async () => {
            const res = await request
                .get(`/api/${API_VERSION}/user/status/752610633580675175`)
                .set(await authHeader)
                .expect(200);
            expect(res.body).toBe(3);
        });

        it("should handle missing user", async () => {
            const res = await request
                .get(`/api/${API_VERSION}/user/status/incorrect`)
                .set(await authHeader)
                .expect(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: UserErrors.NOT_FOUND,
            });

            const res2 = await request
                .get(`/api/${API_VERSION}/user/status/`)
                .set(await authHeader)
                .expect(404);
            expect(res2.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: "not found",
            });
        });
    });

    describe(`POST /api/${API_VERSION}/user/status/:discordUuid`, () => {
        it("should change the online status of a user", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/user/status/752610633580675175`)
                .send({
                    status: 0,
                })
                .set(await authHeader)
                .expect(200);
            expect(res.body.status).toBe(0);

            const res2 = await request
                .post(`/api/${API_VERSION}/user/status/752610633580675175`)
                .send({
                    status: 3,
                })
                .set(await authHeader)
                .expect(200);
            expect(res2.body.status).toBe(3);
        });

        it("should handle missing user", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/user/status/`)
                .send({
                    status: 0,
                })
                .set(await authHeader)
                .expect(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: "not found",
            });

            const res2 = await request
                .post(`/api/${API_VERSION}/user/status/incorrect`)
                .send({
                    status: 400,
                })
                .set(await authHeader)
                .expect(404);
            expect(res2.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: UserErrors.NOT_FOUND,
            });
        });

        it("should reject invalid status values", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/user/status/752610633580675175`)
                .send({
                    status: -1,
                })
                .set(await authHeader)
                .expect(500);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 500,
                title: "Error",
                errorMessage: "An error has occurred while performing database actions.",
            });

            const res2 = await request
                .post(`/api/${API_VERSION}/user/status/752610633580675175`)
                .send({
                    status: 4,
                })
                .set(await authHeader)
                .expect(500);
            expect(res2.body).toMatchObject<ErrorResponse>({
                status: 500,
                title: "Error",
                errorMessage: "An error has occurred while performing database actions.",
            });
        });
    });

    describe(`POST api/${API_VERSION}/user/link/:wynnGuildId`, () => {
        it("should link a minecraft account with a discord account", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/user/link/correct`)
                .send({ mcUsername: "0xzy", discordUuid: "752610633580675175" })
                .set(await authHeader);
            expect(res.status).toBe(200);
            expect(res.body.mcUuid).toBe("963269fe6c50435a9ff57dc928c8e521");
        });

        it("should link a minecraft account with a discord account with upsert", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/user/link/correct`)
                .send({ mcUsername: "0xzy", discordUuid: "1234" })
                .set(await authHeader);
            expect(res.status).toBe(200);
            expect(res.body.mcUuid).toBe("963269fe6c50435a9ff57dc928c8e521");
            expect(res.body.discordUuid).toBe("1234");
        });

        it("should handle missing discordUuid and mcUsername", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/user/link/correct`)
                .send({ discordUuid: "e" })
                .set(await authHeader);
            expect(res.status).toBe(400);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 400,
                title: "Error",
                errorMessage: getMissingFieldMessage("mcUsername", typeof ""),
            });

            const res2 = await request
                .post(`/api/${API_VERSION}/user/link/correct`)
                .send({ mcUsername: "wow" })
                .set(await authHeader)
                .expect(400);
            expect(res2.body).toMatchObject<ErrorResponse>({
                status: 400,
                title: "Error",
                errorMessage: getMissingFieldMessage("discordUuid", typeof ""),
            });
        });

        it("should handle user not in guild", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/user/link/configured`)
                .send({ mcUsername: "notin", discordUuid: "_" })
                .set(await authHeader)
                .expect(400);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 400,
                title: "Error",
                errorMessage: "User not in the guild.",
            });
        });
    });

    describe(`POST /api/${API_VERSION}/user/ban/:discordUuid`, () => {
        it("should set ban state of user", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/user/ban/752610633580675176`)
                .send({ banned: true })
                .set(await authHeader);
            expect(res.status).toBe(200);
            expect(res.body.banned).toBe(true);

            const res2 = await request
                .post(`/api/${API_VERSION}/user/ban/752610633580675176`)
                .send({ banned: false })
                .set(await authHeader);
            expect(res2.status).toBe(200);
            expect(res2.body.banned).toBe(false);
        });

        it("should handle unknown user", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/user/ban/unknown`)
                .send({ banned: true })
                .set(await authHeader);
            expect(res.status).toBe(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: UserErrors.NOT_FOUND,
            });
        });
    });
});

