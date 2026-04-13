import mongoose from "mongoose";
import { guildDatabases } from "../../../src/models/entities/guildDatabaseModel";
import Services from "../../../src/services/services";
import { authHeader, guildDatabaseCreator, request } from "../../globalSetup";
import { API_VERSION } from "../../../src/config";
import { IRaid, IRaidRewardsResponse } from "../../../src/models/schemas/raidSchema";
import { ErrorResponse } from "../../../src/communication/responses/errorResponse";
import { GuildErrors } from "../../../src/errors/messages/guildErrors";
import * as mojangApiClient from "../../../src/communication/httpClients/mojangApiClient";
import { getMissingFieldMessage } from "../../../src/errors/implementations/missingFieldError";
import { RaidErrors } from "../../../src/errors/messages/raidErrors";

describe("Raids routes", () => {
    let spy;

    beforeAll(async () => {
        await Services.guildInfo.createNewGuild({
            wynnGuildId: "b250f587-ab5e-48cd-bf90-71e65d6dc9e7",
            wynnGuildName: "Idiot+Co",
            discordGuildId: "810258030201143328",
        });
    });

    beforeEach(async () => {
        spy = jest.spyOn(mojangApiClient, "usernameToUuid").mockImplementation(async (username: string) => username);
        spy = jest.spyOn(mojangApiClient, "uuidToUsername").mockImplementation(async (uuid: string) => uuid);
        await guildDatabaseCreator.dropDatabases();
        await guildDatabaseCreator.registerDatabases();
        await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].RaidRepository.create({
            users: ["pixlze", "pixlze1", "pixlze2", "pixlze3"],
            raid: "Nexus of Light",
        });
        await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.create({
            mcUuid: "1",
            aspects: 69,
            raids: 1500,
            emeralds: 4096,
        });
        await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.create({
            mcUuid: "2",
            aspects: 0,
            raids: 1500,
            emeralds: 4095,
        });
        await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.create({
            mcUuid: "3",
            aspects: 0.5,
            raids: 2000,
            emeralds: 0,
        });
        await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.create({
            mcUuid: "4",
            aspects: 0.5,
            raids: 2000,
            emeralds: 8192,
        });
        await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.create({
            mcUuid: "5",
            aspects: -1000,
            raids: 2000,
            emeralds: -100000,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await guildDatabaseCreator.dropDatabases();
        await mongoose.connection.dropDatabase();
    });

    describe(`GET /api/${API_VERSION}/guilds/raids/:wynnGuildId`, () => {
        it("should get all raids of a guild", async () => {
            const res = await request
                .get(`/api/${API_VERSION}/guilds/raids/b250f587-ab5e-48cd-bf90-71e65d6dc9e7`)
                .expect(200);
            expect(res.body).toEqual([
                expect.objectContaining<Partial<IRaid>>({
                    users: ["pixlze", "pixlze1", "pixlze2", "pixlze3"],
                    raid: "Nexus of Light",
                }),
            ]);
        });

        it("should handle not found guild", async () => {
            const res = await request.get(`/api/${API_VERSION}/guilds/raids/notfound`).expect(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: GuildErrors.NOT_CONFIGURED,
            });
        });
    });

    describe(`GET /api/${API_VERSION}/guilds/raids/rewards/:wynnGuildId`, () => {
        it("should get raid rewards of a guild that are non zero", async () => {
            const res = await request
                .get(`/api/${API_VERSION}/guilds/raids/rewards/b250f587-ab5e-48cd-bf90-71e65d6dc9e7`)
                .expect(200);
            expect(res.body).toEqual([
                {
                    mcUsername: "1",
                    raids: 1500,
                    aspects: 69,
                    liquidEmeralds: 1,
                },
                {
                    mcUsername: "2",
                    raids: 1500,
                    aspects: 0,
                    liquidEmeralds: expect.closeTo(0.999755859375),
                },
                {
                    mcUsername: "4",
                    raids: 2000,
                    aspects: 0.5,
                    liquidEmeralds: 2,
                },
            ]);
        });

        it("should handle not found guild", async () => {
            const res = await request.get(`/api/${API_VERSION}/guilds/raids/rewards/notfound`).expect(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: GuildErrors.NOT_CONFIGURED,
            });
        });
    });

    describe(`POST /api/${API_VERSION}/guilds/raids/rewards/:wynnGuildId`, () => {
        it("should update the rewards of an mc user", async () => {
            let res = await request
                .post(`/api/${API_VERSION}/guilds/raids/rewards/b250f587-ab5e-48cd-bf90-71e65d6dc9e7`)
                .send({
                    mcUsername: "1",
                })
                .set(await authHeader)
                .expect(200);
            expect(res.body).toEqual(
                expect.objectContaining({
                    mcUuid: "1",
                    aspects: 69,
                    emeralds: 4096,
                    raids: 1500,
                }),
            );
            res = await request
                .post(`/api/${API_VERSION}/guilds/raids/rewards/b250f587-ab5e-48cd-bf90-71e65d6dc9e7`)
                .send({
                    mcUsername: "1",
                    aspects: 1,
                    emeralds: -1,
                })
                .set(await authHeader)
                .expect(200);
            expect(res.body).toEqual(
                expect.objectContaining({
                    mcUuid: "1",
                    aspects: 70,
                    emeralds: 4095,
                    raids: 1500,
                }),
            );
            res = await request
                .post(`/api/${API_VERSION}/guilds/raids/rewards/b250f587-ab5e-48cd-bf90-71e65d6dc9e7`)
                .send({
                    mcUsername: "1",
                    emeralds: -1.5,
                })
                .set(await authHeader)
                .expect(200);
            expect(res.body).toEqual(
                expect.objectContaining({
                    mcUuid: "1",
                    aspects: 70,
                    emeralds: 4093.5,
                    raids: 1500,
                }),
            );
            res = await request
                .post(`/api/${API_VERSION}/guilds/raids/rewards/b250f587-ab5e-48cd-bf90-71e65d6dc9e7`)
                .send({
                    mcUsername: "1",
                    aspects: 1.5,
                })
                .set(await authHeader)
                .expect(200);
            expect(res.body).toEqual(
                expect.objectContaining({
                    mcUuid: "1",
                    aspects: 71.5,
                    emeralds: 4093.5,
                    raids: 1500,
                }),
            );
        });

        it("should handle missing mcUsername", async () => {
            let res = await request
                .post(`/api/${API_VERSION}/guilds/raids/rewards/b250f587-ab5e-48cd-bf90-71e65d6dc9e7`)
                .send()
                .set(await authHeader)
                .expect(400);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 400,
                title: "Error",
                errorMessage: getMissingFieldMessage("mcUuid", "string"),
            });

            res = await request
                .post(`/api/${API_VERSION}/guilds/raids/rewards/b250f587-ab5e-48cd-bf90-71e65d6dc9e7`)
                .send({
                    aspects: 2,
                    emeralds: 5,
                })
                .set(await authHeader)
                .expect(400);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 400,
                title: "Error",
                errorMessage: getMissingFieldMessage("mcUuid", "string"),
            });
        });

        it("should handle not found guild", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/guilds/raids/rewards/notfound`)
                .set(await authHeader)
                .expect(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: GuildErrors.NOT_CONFIGURED,
            });
        });
    });

    describe(`GET /api/${API_VERSION}/guilds/raids/rewards/:wynnGuildId/:mcUsername`, () => {
        it("should get the rewards of a specific user", async () => {
            let res = await request
                .get(`/api/${API_VERSION}/guilds/raids/rewards/b250f587-ab5e-48cd-bf90-71e65d6dc9e7/1`)
                .expect(200);
            expect(res.body).toMatchObject<IRaidRewardsResponse>({
                mcUsername: "1",
                raids: 1500,
                aspects: 69,
                liquidEmeralds: 1,
            });

            res = await request
                .get(`/api/${API_VERSION}/guilds/raids/rewards/b250f587-ab5e-48cd-bf90-71e65d6dc9e7/2`)
                .expect(200);
            expect(res.body).toMatchObject<IRaidRewardsResponse>({
                mcUsername: "2",
                raids: 1500,
                aspects: 0,
                liquidEmeralds: expect.closeTo(0.999755859375),
            });

            res = await request
                .get(`/api/${API_VERSION}/guilds/raids/rewards/b250f587-ab5e-48cd-bf90-71e65d6dc9e7/3`)
                .expect(200);
            expect(res.body).toMatchObject<IRaidRewardsResponse>({
                mcUsername: "3",
                raids: 2000,
                aspects: 0.5,
                liquidEmeralds: 0,
            });

            res = await request
                .get(`/api/${API_VERSION}/guilds/raids/rewards/b250f587-ab5e-48cd-bf90-71e65d6dc9e7/5`)
                .expect(200);
            expect(res.body).toMatchObject<IRaidRewardsResponse>({
                mcUsername: "5",
                aspects: -1000,
                raids: 2000,
                liquidEmeralds: expect.closeTo(-24.4140625),
            });
        });

        it("should handle not found guild", async () => {
            const res = await request.get(`/api/${API_VERSION}/guilds/raids/rewards/notfound/3`).expect(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: GuildErrors.NOT_CONFIGURED,
            });
        });

        it("should handle not found user with found guild", async () => {
            const res = await request
                .get(`/api/${API_VERSION}/guilds/raids/rewards/b250f587-ab5e-48cd-bf90-71e65d6dc9e7/42`)
                .expect(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: RaidErrors.NOT_IN_RAID_LIST,
            });
        });
    });

    describe(`GET /api/${API_VERSION}/guilds/raids/leaderboard/:wynnGuildId`, () => {
        it("should get the raid leaderboard for a specific guild", async () => {
            const res = await request
                .get(`/api/${API_VERSION}/guilds/raids/leaderboard/b250f587-ab5e-48cd-bf90-71e65d6dc9e7`)
                .expect(200);
            expect(res.body).toEqual([
                { mcUsername: "3", raids: 2000 },
                { mcUsername: "4", raids: 2000 },
                { mcUsername: "5", raids: 2000 },
                { mcUsername: "1", raids: 1500 },
                { mcUsername: "2", raids: 1500 },
            ]);
        });

        it("should handle not found guild", async () => {
            const res = await request.get(`/api/${API_VERSION}/guilds/raids/leaderboard/notfound`).expect(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: GuildErrors.NOT_CONFIGURED,
            });
        });
    });
});
