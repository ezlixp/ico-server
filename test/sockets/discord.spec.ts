import mongoose from "mongoose";
import Services from "../../src/services/services";
import { getMessage, registerMessageIndexes } from "../../src/sockets/discord";
import { OnlineStatus } from "../../src/constants/onlineStatus";
import { IWynn2DiscordMessage } from "../../src/types/messageTypes";
import UserModel from "../../src/models/entities/userModel";

describe("Discord socket events", () => {
    beforeEach(async () => {
        mongoose.connection.dropDatabase();
        await Services.guildInfo.createNewGuild({
            wynnGuildId: "b250f587ab5e48cdbf9071e65d6dc9e7",
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
    });

    describe("RECEIVE wynn message base", () => {
        it("Should parse a standard message without discord uuid", async () => {
            const res = await getMessage(
                "§b󏿿󏿿󏿿󏿿󏿿󏿿󏿢§0󐀂§b §3ASingleProton§3:§b nice",
                "1290068270963232868",
                {
                    wynnGuildId: "b250f587ab5e48cdbf9071e65d6dc9e7",
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
                wynnGuildId: "b250f587ab5e48cdbf9071e65d6dc9e7",
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
});
