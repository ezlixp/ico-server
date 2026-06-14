import mongoose from "mongoose";
import Services from "../../src/services/services";
import { getMessage, registerMessageIndexes } from "../../src/sockets/discord";
import { OnlineStatus } from "../../src/constants/onlineStatus";
import { IWynn2DiscordMessage } from "../../src/types/messageTypes";
import UserModel from "../../src/models/entities/userModel";
import * as wynncraftApiClient from "../../src/communication/httpClients/wynncraftApiClient";
import { guildDatabaseCreator } from "../globalSetup";
import { guildDatabases } from "../../src/models/entities/guildDatabaseModel";

describe("Discord socket events", () => {
    let spy;
    beforeEach(async () => {
        spy = jest
            .spyOn(wynncraftApiClient, "default")
            .mockImplementation(async (username: string, wynnGuildId: string) => username !== "!guild");
        mongoose.connection.dropDatabase();
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
        await UserModel.insertMany([{ mcUuid: "39365bd45c7841de8901c7dc5b7c64c4", discordUuid: "752610633580675176" }]);
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
        it("Should parse raid message 1/2", () => {});
        it("Should parse raid message 2/2", () => {}); // different spacing test here
        it("Should increment rewards for 1 raider");
        it("Should increment rewards for 2 raiders");
        it("Should increment rewards for 3 raiders");
        it("Should increment rewards for 4 raiders");
    });

    describe("RECEIVE tome message", () => {
        beforeEach(async () => {
            await guildDatabaseCreator.dropDatabases();
            await guildDatabaseCreator.registerDatabases();
            guildDatabases["b250f587-ab5e-48cd-bf90-71e65d6dc9e7"].TomeRepository.create({ mcUsername: "pixlze" });
        });
        it("Should clear from tome list if recipient is on the tome list", () => {});
        it("Should do nothing if recipient is not on the tome list", () => {});
    });

    describe("RECEIVE aspect message", () => {
        beforeEach(async () => {
            await guildDatabaseCreator.dropDatabases();
            await guildDatabaseCreator.registerDatabases();
            Services.raid.updateRewards("39365bd45c7841de8901c7dc5b7c64c4", "b250f587-ab5e-48cd-bf90-71e65d6dc9e7", 5);
        });
        it("Should decrement from user rewards if they exist");
        it("Should decrement from user rewards if they don't exist");
    });
});
