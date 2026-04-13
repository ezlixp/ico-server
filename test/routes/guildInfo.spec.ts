import mongoose from "mongoose";
import GuildInfoModel from "../../src/models/entities/guildInfoModel";
import { API_VERSION } from "../../src/config";
import { authHeader, request } from "../globalSetup";

describe("Guild info routes", () => {
    beforeEach(async () => {
        mongoose.connection.dropDatabase();
        await GuildInfoModel.insertMany([
            {
                wynnGuildId: "b250f587-ab5e-48cd-bf90-71e65d6dc9e7",
                wynnGuildName: "Idiot Co",
                discordGuildId: "810258030201143328",
                tomeChannel: "1125517737188409364",
                layoffsChannel: "1135296640803147806",
                raidsChannel: "1272044811771449365",
                warChannel: "863553410813001759",
                privilegedRoles: ["1290068312528519228", "810680738843721738"],
                listeningChannel: "1290068270963232868",
                broadcastingChannel: "1290068270963232868",
                mutedUuids: ["1"],
            },
        ]);
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
    });
    describe(`POST /api/${API_VERSION}/config`, () => {
        it("should add a new guild", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/config`)
                .send({
                    wynnGuildId: "6424ca09-11d7-43cc-aba2-3057aa21fed6",
                    wynnGuildName: "Opus Maximus",
                    discordGuildId: "755501363701481542",
                })
                .set(await authHeader);
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                wynnGuildId: "6424ca09-11d7-43cc-aba2-3057aa21fed6",
                wynnGuildName: "Opus Maximus",
                discordGuildId: "755501363701481542",
                tomeChannel: "0",
                layoffsChannel: "0",
                raidsChannel: "0",
                warChannel: "0",
                privilegedRoles: [],
                mutedUuids: [],
                listeningChannel: "0",
                broadcastingChannel: "0",
            });
        });

        it("should add a new guild with partial information", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/config`)
                .send({
                    wynnGuildId: "6424ca09-11d7-43cc-aba2-3057aa21fed6",
                    wynnGuildName: "Opus Maximus",
                    discordGuildId: "755501363701481542",
                    tomeChannel: "1",
                    layoffsChannel: "2",
                    privilegedRoles: ["123", "456"],
                    mutedUuids: "1",
                })
                .set(await authHeader);
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                wynnGuildId: "6424ca09-11d7-43cc-aba2-3057aa21fed6",
                wynnGuildName: "Opus Maximus",
                discordGuildId: "755501363701481542",
                tomeChannel: "1",
                layoffsChannel: "2",
                raidsChannel: "0",
                warChannel: "0",
                privilegedRoles: ["123", "456"],
                mutedUuids: ["1"],
                listeningChannel: "0",
                broadcastingChannel: "0",
            });
        });

        it("should handle extra values", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/config`)
                .send({
                    wynnGuildId: "6424ca09-11d7-43cc-aba2-3057aa21fed6",
                    wynnGuildName: "Opus Maximus",
                    discordGuildId: "755501363701481542",
                    extra: "wow",
                    extra2: ["wow"],
                })
                .set(await authHeader);
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                wynnGuildId: "6424ca09-11d7-43cc-aba2-3057aa21fed6",
                wynnGuildName: "Opus Maximus",
                discordGuildId: "755501363701481542",
            });
        });

        it("should handle missing mandetory fields", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/config`)
                .send({
                    wynnGuildId: "6424ca09-11d7-43cc-aba2-3057aa21fed6",
                    wynnGuildName: "Opus Maximus",
                    // discordGuildId: "755501363701481542",
                })
                .set(await authHeader);
            expect(res.status).toBe(500);
            expect(res.body).toMatchObject({
                errorMessage: "An error has occurred while performing database actions.",
                status: 500,
                title: "Error",
            });
        });
    });

    describe(`GET /api/${API_VERSION}/config/:discordGuildId`, () => {
        it("should fetch guild info", async () => {
            const res = await request.get(`/api/${API_VERSION}/config/810258030201143328`).set(await authHeader);
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                wynnGuildId: "b250f587-ab5e-48cd-bf90-71e65d6dc9e7",
                wynnGuildName: "Idiot Co",
                discordGuildId: "810258030201143328",
                tomeChannel: "1125517737188409364",
                layoffsChannel: "1135296640803147806",
                raidsChannel: "1272044811771449365",
                warChannel: "863553410813001759",
                privilegedRoles: ["1290068312528519228", "810680738843721738"],
                listeningChannel: "1290068270963232868",
                broadcastingChannel: "1290068270963232868",
                mutedUuids: ["1"],
            });
        });

        it("should handle not found guilds", async () => {
            const res = await request.get(`/api/${API_VERSION}/config/notfound`).set(await authHeader);
            expect(res.status).toBe(404);
            expect(res.body).toMatchObject({
                errorMessage: "This guild is not configured. In order to configure a guild, contact a developer.",
                status: 404,
                title: "Error",
            });
        });
    });

    describe(`DELETE /api/${API_VERSION}/config/:discordGuildId`, () => {
        it("should delete a guild", async () => {
            const res = await request.delete(`/api/${API_VERSION}/config/810258030201143328`).set(await authHeader);
            expect(res.status).toBe(204);
            expect((await GuildInfoModel.find()).length).toBe(0);
        });

        it("should handle not found guild", async () => {
            const res = await request.delete(`/api/${API_VERSION}/config/notfound`).set(await authHeader);
            expect(res.status).toBe(404);
            expect(res.body).toMatchObject({
                status: 404,
                title: "Error",
                errorMessage: "Could not find guild to delete.",
            });
        });
    });

    describe(`PATCH /api/${API_VERSION}/config/:discordguildId`, () => {
        it("should update existing configs", async () => {
            const res = await request
                .patch(`/api/${API_VERSION}/config/810258030201143328`)
                .send({
                    wynnGuildId: "shouldn't change",
                    wynnGuildName: "shouldn't change",
                    discordGuildId: "shouldn't change",
                    tomeChannel: "2",
                    // layoffsChannel: "3",
                    // raidsChannel: "4",
                    warChannel: "5",
                    privilegedRoles: ["6", "7"],
                    listeningChannel: "8",
                    broadcastingChannel: "9",
                    // mutedUuids: [],
                })
                .set(await authHeader);
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                discordGuildId: "810258030201143328",
                tomeChannel: "2",
                layoffsChannel: "1135296640803147806",
                raidsChannel: "1272044811771449365",
                warChannel: "5",
                privilegedRoles: ["1290068312528519228", "810680738843721738", "6", "7"],
                mutedUuids: ["1"],
                listeningChannel: "8",
                broadcastingChannel: "9",
            });
        });
        it("should handle not found guild", async () => {
            const res = await request
                .patch(`/api/${API_VERSION}/config/notfound`)
                .send({
                    wynnGuildId: "0",
                    wynnGuildName: "newname",
                    discordGuildId: "1",
                    tomeChannel: "2",
                    // layoffsChannel: "3",
                    // raidsChannel: "4",
                    warChannel: "5",
                    privilegedRoles: ["6", "7"],
                    listeningChannel: "8",
                    broadcastingChannel: "9",
                    // mutedUuids: [],
                })
                .set(await authHeader);
            expect(res.status).toBe(404);
            expect(res.body).toMatchObject({
                errorMessage: "This guild is not configured. In order to configure a guild, contact a developer.",
                status: 404,
                title: "Error",
            });
        });
    });

    describe(`POST /api/${API_VERSION}/config/:discordGuildId/mute`, () => {
        it("should add a muted uuid", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/config/810258030201143328/mute`)
                .send({
                    discordUuid: "2",
                })
                .set(await authHeader);
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                mutedUuids: ["1", "2"],
            });
        });

        it("should handle not found guild", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/config/notfound/mute`)
                .send({
                    discordUuid: "2",
                })
                .set(await authHeader);
            expect(res.status).toBe(404);
            expect(res.body).toMatchObject({
                errorMessage: "This guild is not configured. In order to configure a guild, contact a developer.",
                status: 404,
                title: "Error",
            });
        });
    });

    describe(`DELETE /api/${API_VERSION}/config/:discordGuildId/mute`, () => {
        it("should remove a muted uuid", async () => {
            const res = await request
                .delete(`/api/${API_VERSION}/config/810258030201143328/mute`)
                .send({
                    discordUuid: "1",
                })
                .set(await authHeader);
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                mutedUuids: [],
            });
        });

        it("should handle not found guild", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/config/notfound/mute`)
                .send({
                    discordUuid: "2",
                })
                .set(await authHeader);
            expect(res.status).toBe(404);
            expect(res.body).toMatchObject({
                errorMessage: "This guild is not configured. In order to configure a guild, contact a developer.",
                status: 404,
                title: "Error",
            });
        });
    });
});
