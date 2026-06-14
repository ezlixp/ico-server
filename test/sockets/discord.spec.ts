import mongoose from "mongoose";
import Services from "../../src/services/services";
import { completeRaid, getMessage, registerMessageIndexes } from "../../src/sockets/discord";
import { OnlineStatus } from "../../src/constants/onlineStatus";
import { IWynn2DiscordMessage } from "../../src/types/messageTypes";
import UserModel from "../../src/models/entities/userModel";
import * as mojangApiClient from "../../src/communication/httpClients/mojangApiClient";
import * as wynncraftApiClient from "../../src/communication/httpClients/wynncraftApiClient";
import { guildDatabaseCreator } from "../globalSetup";
import { guildDatabases } from "../../src/models/entities/guildDatabaseModel";

describe("Discord socket events", () => {
    beforeAll(() => {
        jest.spyOn(mojangApiClient, "usernameToUuid").mockImplementation(async (username: string) => username);
        jest.spyOn(mojangApiClient, "uuidToUsername").mockImplementation(async (uuid: string) => uuid);
        jest.spyOn(wynncraftApiClient, "default").mockImplementation(
            async (username: string, wynnGuildId: string) => username !== "!guild",
        );
    });

    beforeEach(async () => {
        mongoose.connection.dropDatabase();
        guildDatabaseCreator.dropDatabases();
        await Services.guildInfo.createNewGuild({
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
        await UserModel.insertMany([{ mcUuid: "pixlze", discordUuid: "752610633580675176", takeAspects: false }]);
        await UserModel.insertMany([{ mcUuid: "pixlze2", discordUuid: "752610633580675175", takeAspects: false }]);
        registerMessageIndexes();
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        jest.clearAllMocks();
    });

    describe("RECEIVE wynn message base", () => {
        it("Should parse a standard message without discord uuid", async () => {
            const res = await getMessage(
                "§b󏿿󏿿󏿿󏿿󏿿󏿿󏿢§0󐀂§b §3ASingleProton§3:§b nice",
                "1290068270963232868",
                {
                    wynnGuildId: "b250f587-ab5e-48cd-bf90-71e65d6dc9e7",
                    messageIndex: 0,
                    hrMessageIndex: 0,
                    onlineStatus: OnlineStatus.ONLINE,
                    username: "pixlze",
                    modVersion: "1.21.1",
                    discordUuid: "752610633580675176",
                    muted: false,
                },
            );
            expect(res).toMatchObject<IWynn2DiscordMessage>({
                MessageType: 0,
                HeaderContent: ["ASingleProton", undefined],
                TextContent: "nice",
                ListeningChannel: "1290068270963232868",
            });
        });
        it("Should parse a standard message with discord uuid", async () => {
            const res = await getMessage("§b󏿿󏿿󏿿󏿿󏿿󏿿󏿢§0󐀂§b §3pixlze§3:§b nice", "1290068270963232868", {
                wynnGuildId: "b250f587-ab5e-48cd-bf90-71e65d6dc9e7",
                messageIndex: 0,
                hrMessageIndex: 0,
                onlineStatus: OnlineStatus.ONLINE,
                username: "pixlze",
                modVersion: "1.21.1",
                discordUuid: "752610633580675176",
                muted: false,
            });
            expect(res).toMatchObject<IWynn2DiscordMessage>({
                MessageType: 0,
                HeaderContent: ["pixlze", "752610633580675176"],
                TextContent: "nice",
                ListeningChannel: "1290068270963232868",
            });
        });
    });

    describe("RECEIVE raid message", () => {
        it("Should parse raid message 1", async () => {
            const res = await getMessage(
                "§eAmiableOne§b, §eEssentuan§b, and §eDoggc§b finished §3The WartornPalace§b and claimed §32x Aspects§b, §32048x Emeralds§b, §3+312m GuildExperience§b, and §3+330 Seasonal Rating",
                "1290068270963232868",
                {
                    wynnGuildId: "b250f587-ab5e-48cd-bf90-71e65d6dc9e7",
                    messageIndex: 0,
                    hrMessageIndex: 0,
                    onlineStatus: OnlineStatus.ONLINE,
                    username: "pixlze",
                    modVersion: "1.21.1",
                    discordUuid: "752610633580675176",
                    muted: false,
                },
            );
            expect(res).toMatchObject<IWynn2DiscordMessage>({
                MessageType: 1,
                HeaderContent: ["⚠️ Guild Raida", undefined],
                TextContent: "AmiableOne, Essentuan, and Doggc completed The WartornPalace",
                ListeningChannel: "1290068270963232868",
            });
        });
        it("Should parse raid message 2", async () => {
            const res = await getMessage(
                "§epixlze§b, §ePickelated§b, §evex710§b, and §eEssentuan§bfinished§3Orphion'sNexus of Light§b and claimed §32048x Emeralds§b, §32x Aspects§b, §3+312m Guild Experience§b, and §3+330 Seasonal Rating",
                "1290068270963232868",
                {
                    wynnGuildId: "b250f587-ab5e-48cd-bf90-71e65d6dc9e7",
                    messageIndex: 0,
                    hrMessageIndex: 0,
                    onlineStatus: OnlineStatus.ONLINE,
                    username: "pixlze",
                    modVersion: "1.21.1",
                    discordUuid: "752610633580675176",
                    muted: false,
                },
            );
            expect(res).toMatchObject<IWynn2DiscordMessage>({
                MessageType: 1,
                HeaderContent: ["⚠️ Guild Raida", undefined],
                TextContent: "pixlze, Pickelated, vex710, and Essentuan completed Orphion'sNexus of Light",
                ListeningChannel: "1290068270963232868",
            });
        });
        it("Should parse raid message 3", async () => {
            const res = await getMessage(
                "§epixlze§b, §ePickelated§b, §evex710§b,and§eEssentuan§bfinished§3Orphion'sNexus ofLight§bandclaimed§32048xEmeralds§b,§32xAspects§b,§3+312m Guild Experience§b, and §3+330 Seasonal Rating",
                "1290068270963232868",
                {
                    wynnGuildId: "b250f587-ab5e-48cd-bf90-71e65d6dc9e7",
                    messageIndex: 0,
                    hrMessageIndex: 0,
                    onlineStatus: OnlineStatus.ONLINE,
                    username: "pixlze",
                    modVersion: "1.21.1",
                    discordUuid: "752610633580675176",
                    muted: false,
                },
            );
            expect(res).toMatchObject<IWynn2DiscordMessage>({
                MessageType: 1,
                HeaderContent: ["⚠️ Guild Raida", undefined],
                TextContent: "pixlze, Pickelated, vex710, and Essentuan completed Orphion'sNexus ofLight",
                ListeningChannel: "1290068270963232868",
            });
        });
        it("Should increment rewards for raiders and aspect bans 1", async () => {
            await completeRaid(
                "b250f587-ab5e-48cd-bf90-71e65d6dc9e7",
                ["pixlze", "Pickelated", "vex710", "Essentuan"],
                "Orphion'sNexus ofLight",
                2,
            );
            const a1 =
                (
                    await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.findOneEmpty({
                        mcUuid: "pixlze",
                    })
                )?.aspects || 0;
            const a2 = (
                await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.findOne({
                    mcUuid: "Pickelated",
                })
            ).aspects;
            const a3 = (
                await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.findOne({
                    mcUuid: "vex710",
                })
            ).aspects;
            const a4 = (
                await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.findOne({
                    mcUuid: "Essentuan",
                })
            ).aspects;
            expect(a1).toBe(0);

            expect(a2).toBeGreaterThanOrEqual(0.5);
            expect(a2).toBeLessThanOrEqual(1.0);
            expect(a3).toBeGreaterThanOrEqual(0.5);
            expect(a3).toBeLessThanOrEqual(1.0);
            expect(a4).toBeGreaterThanOrEqual(0.5);
            expect(a4).toBeLessThanOrEqual(1.0);

            expect(a1 + a2 + a3 + a4).toEqual(2.0);
        });

        it("Should increment rewards for raiders and aspect bans 2", async () => {
            await completeRaid(
                "b250f587-ab5e-48cd-bf90-71e65d6dc9e7",
                ["pixlze", "Pickelated", "pixlze2", "Essentuan"],
                "Orphion'sNexus ofLight",
                2,
            );
            const a1 =
                (
                    await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.findOneEmpty({
                        mcUuid: "pixlze",
                    })
                )?.aspects || 0;
            const a2 = (
                await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.findOne({
                    mcUuid: "Pickelated",
                })
            ).aspects;
            const a3 =
                (
                    await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.findOneEmpty({
                        mcUuid: "pixlze2",
                    })
                )?.aspects || 0;
            const a4 = (
                await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.findOne({
                    mcUuid: "Essentuan",
                })
            ).aspects;
            expect(a1).toBe(0);
            expect(a2).toBe(1);
            expect(a3).toBe(0);
            expect(a4).toBe(1);
        });
        it("Should increment rewards for raiders and aspect bans 3", async () => {
            await completeRaid(
                "b250f587-ab5e-48cd-bf90-71e65d6dc9e7",
                ["cbrt", "Pickelated", "vex710", "Essentuan"],
                "Orphion'sNexus ofLight",
                3.5,
            );
            const a1 = (
                await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.findOne({
                    mcUuid: "cbrt",
                })
            ).aspects;
            const a2 = (
                await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.findOne({
                    mcUuid: "Pickelated",
                })
            ).aspects;
            const a3 = (
                await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.findOne({
                    mcUuid: "vex710",
                })
            ).aspects;
            const a4 = (
                await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.findOne({
                    mcUuid: "Essentuan",
                })
            ).aspects;
            expect(a1).toBeGreaterThanOrEqual(0.5);
            expect(a1).toBeLessThanOrEqual(1.0);
            expect(a2).toBeGreaterThanOrEqual(0.5);
            expect(a2).toBeLessThanOrEqual(1.0);
            expect(a3).toBeGreaterThanOrEqual(0.5);
            expect(a3).toBeLessThanOrEqual(1.0);
            expect(a4).toBeGreaterThanOrEqual(0.5);
            expect(a4).toBeLessThanOrEqual(1.0);

            expect(a1 + a2 + a3 + a4).toEqual(3.5);
        });
        it("Should increment rewards for one fella", async () => {
            await completeRaid("b250f587-ab5e-48cd-bf90-71e65d6dc9e7", ["cbrt"], "Orphion'sNexus ofLight", 53);
            const a1 =
                (
                    await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.findOneEmpty({
                        mcUuid: "cbrt",
                    })
                )?.aspects || 0;
            expect(a1).toBe(53);
        });
        it("Should do nothing if one fella and ban", async () => {
            await completeRaid("b250f587-ab5e-48cd-bf90-71e65d6dc9e7", ["pixlze"], "Orphion'sNexus ofLight", 53);
            const a1 =
                (
                    await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.findOneEmpty({
                        mcUuid: "pixlze",
                    })
                )?.aspects || 0;
            expect(a1).toBe(0);
            expect(
                (await guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].GuildUserRepository.find({})).length,
            ).toBe(0);
        });
    });

    describe("RECEIVE tome message", () => {
        beforeEach(async () => {
            await guildDatabaseCreator.dropDatabases();
            await guildDatabaseCreator.registerDatabases();
            guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].TomeRepository.create({ mcUsername: "pixlze" });
        });
        it.todo("Should clear from tome list if recipient is on the tome list");
        it.todo("Should do nothing if recipient is not on the tome list");
    });

    describe("RECEIVE aspect message", () => {
        beforeEach(async () => {
            await guildDatabaseCreator.dropDatabases();
            await guildDatabaseCreator.registerDatabases();
            Services.raid.updateRewards("39365bd45c7841de8901c7dc5b7c64c4", "b250f587-ab5e-48cd-bf90-71e65d6dc9e7", 5);
        });
        it.todo("Should decrement from user rewards if they exist");
        it.todo("Should decrement from user rewards if they don't exist");
    });
});
