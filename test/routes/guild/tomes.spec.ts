import mongoose from "mongoose";
import { API_VERSION } from "../../../src/config";
import { guildDatabases } from "../../../src/models/entities/guildDatabaseModel";
import Services from "../../../src/services/services";
import { authHeader, guildDatabaseCreator, request } from "../../globalSetup";
import { ErrorResponse } from "../../../src/communication/responses/errorResponse";
import { GuildErrors } from "../../../src/errors/messages/guildErrors";
import { ITome } from "../../../src/models/schemas/tomeSchema";
import { TomeErrors } from "../../../src/errors/messages/tomeErrors";

describe("Tomes routes", () => {
    beforeAll(async () => {
        await Services.guildInfo.createNewGuild({
            wynnGuildId: "b250f587-ab5e-48cd-bf90-71e65d6dc9e7",
            wynnGuildName: "Idiot+Co",
            discordGuildId: "810258030201143328",
        });
    });

    beforeEach(async () => {
        await guildDatabaseCreator.dropDatabases();
        await guildDatabaseCreator.registerDatabases();
        await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].TomeRepository.create({ mcUsername: "pixlze1" });
        await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].TomeRepository.create({ mcUsername: "pixlze2" });
    });

    afterAll(async () => {
        await guildDatabaseCreator.dropDatabases();
        await mongoose.connection.dropDatabase();
    });

    describe(`GET /api/${API_VERSION}/guilds/tomes/:wynnGuildId`, () => {
        it("should list users on tome list", async () => {
            const res = await request
                .get(`/api/${API_VERSION}/guilds/tomes/b250f587-ab5e-48cd-bf90-71e65d6dc9e7`)
                .expect(200);
            expect(res.body.length).toBe(2);
            expect(res.body[0].mcUsername).toBe("pixlze1");
            expect(res.body[1].mcUsername).toBe("pixlze2");
        });

        it("should handle not found guild", async () => {
            const res = await request.get(`/api/${API_VERSION}/guilds/tomes/notfound`);
            expect(res.status).toBe(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: GuildErrors.NOT_CONFIGURED,
            });
        });

        it.todo("test works after a few database actions");
    });

    describe(`POST /api/${API_VERSION}/guilds/tomes/:wynnGuildId`, () => {
        it("should add a tome to the tome list", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/guilds/tomes/b250f587-ab5e-48cd-bf90-71e65d6dc9e7`)
                .send({ mcUsername: "inguild" })
                .set(await authHeader)
                .expect(200);
            expect(res.body).toMatchObject<Partial<ITome>>({
                mcUsername: "inguild",
            });
        });

        it("should handle not in guild", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/guilds/tomes/b250f587-ab5e-48cd-bf90-71e65d6dc9e7`)
                .send({ mcUsername: "not in guild" })
                .set(await authHeader)
                .expect(400);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 400,
                title: "Error",
                errorMessage: "User not in the guild.",
            });
        });

        it("should handle not found guild", async () => {
            const res = await request
                .post(`/api/${API_VERSION}/guilds/tomes/notfound`)
                .send({ mcUsername: "_" })
                .set(await authHeader)
                .expect(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: GuildErrors.NOT_CONFIGURED,
            });
        });
    });

    describe(`GET /api/${API_VERSION}/guilds/tomes/:wynnGuildId/:mcUsername`, () => {
        it("should get the position of a specific user on the tome list", async () => {
            const res1 = await request
                .get(`/api/${API_VERSION}/guilds/tomes/b250f587-ab5e-48cd-bf90-71e65d6dc9e7/pixlze1`)
                .expect(200);
            const res2 = await request
                .get(`/api/${API_VERSION}/guilds/tomes/b250f587-ab5e-48cd-bf90-71e65d6dc9e7/pixlze2`)
                .expect(200);
            expect(res1.body).toMatchObject({
                mcUsername: "pixlze1",
                position: 1,
            });
            expect(res2.body).toMatchObject({
                mcUsername: "pixlze2",
                position: 2,
            });
        });

        it("should handle user not in tome list", async () => {
            const res = await request
                .get(`/api/${API_VERSION}/guilds/tomes/b250f587-ab5e-48cd-bf90-71e65d6dc9e7/notin`)
                .expect(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: "Selected resource could not be found.",
            });
        });

        it("should handle not found guild", async () => {
            const res = await request.get(`/api/${API_VERSION}/guilds/tomes/notfound/notin`).expect(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: GuildErrors.NOT_CONFIGURED,
            });
        });
    });

    describe(`DELETE /api/${API_VERSION}/guilds/tomes/b250f587-ab5e-48cd-bf90-71e65d6dc9e7/:mcUsername`, () => {
        it("should remove a specific username from the tomelist", async () => {
            const _ = await request
                .delete(`/api/${API_VERSION}/guilds/tomes/b250f587-ab5e-48cd-bf90-71e65d6dc9e7/pixlze1`)
                .set(await authHeader)
                .expect(204);
        });

        it("should handle not found usernames", async () => {
            const res = await request
                .delete(`/api/${API_VERSION}/guilds/tomes/b250f587-ab5e-48cd-bf90-71e65d6dc9e7/notfound`)
                .set(await authHeader)
                .expect(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: TomeErrors.TOME_NOT_FOUND,
            });
        });

        it("should handle not found guild", async () => {
            const res = await request
                .delete(`/api/${API_VERSION}/guilds/tomes/notfound/pixlze1`)
                .set(await authHeader)
                .expect(404);
            expect(res.body).toMatchObject<ErrorResponse>({
                status: 404,
                title: "Error",
                errorMessage: GuildErrors.NOT_CONFIGURED,
            });
        });
    });
});
