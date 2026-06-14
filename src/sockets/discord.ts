import "../config";
import { IB2SDiscord2WynnMessage, IWynn2DiscordMessage, IWynnMessage } from "../types/messageTypes";
import { decodeItem } from "../utils/wynntilsItemEncoding";
import { getOnlineUsers, isOnline } from "../utils/socketUtils";
import { checkVersion } from "../utils/versionUtils";
import { guildDatabases, guildNames } from "../models/entities/guildDatabaseModel";
import { getChannelFromWynnGuild } from "../utils/serverUtils";
import { io } from "../socket";
import Services from "../services/services";
import { usernameToUuid, uuidToUsername } from "../communication/httpClients/mojangApiClient";
import { OnlineStatus } from "../constants/onlineStatus";
import { Socket } from "socket.io";
import { SocketData } from "../types/socketIOTypes";

const ENCODED_DATA_PATTERN = /([\u{F0000}-\u{FFFFD}]|[\u{100000}-\u{10FFFF}])+/gu;
/** Named groups header and content are taken if they exist for the message sent to discord,
 * if no custom message/custom header function is defined.
 */
const wynnMessagePatterns: IWynnMessage[] = [
    {
        pattern: /^(?<pill>.*)§[38](?<header>.+?)(§[38])?:§[b8] (?<content>.*)$/,
        messageType: 0,
        // §b󏿿󏿿󏿿󏿿󏿿󏿿󏿢§0󐀂§b §3ASingleProton§3:§b nice
    },
    {
        pattern:
            /^§.(?<player1>\S*?)§.(, ?§.(?<player2>\S*?)§.)?(, ?§.(?<player3>\S*?)§.)?(, ?and ?§.(?<player4>\S*?)§.)? ?finished ?§.(?<raid>.*?)§. ?and ?claimed ?§.(?<aspects>\d+)x ?Aspects.*$/,
        messageType: 1,
        customMessage: (matcher, guildId) => {
            let users: string[] = [matcher.groups!.player2];
            const raid = matcher.groups!.raid;
            if (matcher.groups!.player2) users.push(matcher.groups!.player2);
            if (matcher.groups!.player3) users.push(matcher.groups!.player3);
            if (matcher.groups!.player4) users.push(matcher.groups!.player4);
            const aspects = Number.parseInt(matcher.groups!.aspects);
            let outstring = "";
            users.map((user, index) => {
                if (index != 0) {
                    if (index == users.length - 1) outstring += ", and ";
                    else outstring += ", ";
                }
                outstring += user;
            });
            outstring += " completed " + raid;

            // await Services.raid.updateRewards(await usernameToUuid(username), guildId, 0.5, 512, 1);
            guildDatabases[guildId].RaidRepository.create({
                users: users,
                raid,
            })
                .then(async (newRaid) => {
                    let users: (string | null)[] = await Promise.all(
                        newRaid.users.map(async (username) => {
                            try {
                                if (await Services.user.isTakeAspect(await usernameToUuid(username))) {
                                    return username;
                                } else return null;
                            } catch (err) {
                                console.error("raid complete error:", err);
                                return null;
                            }
                        }),
                    );
                    users = users.filter((u): u is string => u !== null);
                    if (users.length == 0) return;
                    const halfAspectsPer = Math.floor((2 * aspects) / users.length);
                    const left = 2 * aspects - halfAspectsPer * users.length;
                    for (let i = users.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [users[i], users[j]] = [users[j], users[i]];
                    }
                    await Promise.all(
                        users.map(async (username, index) => {
                            try {
                                const reward = (halfAspectsPer + (index < left ? 1 : 0)) / 2;
                                await Services.raid.updateRewards(
                                    await usernameToUuid(username!),
                                    guildId,
                                    reward,
                                    0,
                                    1,
                                );
                            } catch (err) {
                                console.error("raid reward error:", err);
                            }
                        }),
                    );
                })
                .catch((error) => {
                    console.error("log raid error:", error);
                });
            return outstring;
        },
        customHeader: "⚠️ Guild Raida",
    },
    {
        pattern: /^§.(?<giver>\S*?)(§.)? rewarded §.an ?Aspect§. ?to ?§.(?<receiver>\S*?)(§.)?$/,
        messageType: 1,
        customMessage: (matcher, guildId) => {
            usernameToUuid(matcher.groups!.receiver)
                .then(async (uuid) => {
                    await Services.raid.updateRewards(uuid, guildId, -1);
                })
                .catch((error) => {
                    console.error("aspect reward error:", error);
                });
            return matcher.groups!.giver + " has given an aspect to " + matcher.groups!.receiver;
        },
        customHeader: "⚠️ Aspect",
    },
    {
        pattern: /^§.(?<giver>\S*?)(§.)? rewarded §.a Guild ?Tome§. ?to ?§.(?<receiver>\S*?)(§.)?$/,
        messageType: 1,
        customMessage: (matcher, guildId) => {
            Services.tome.deleteFromTomeList(matcher.groups!.receiver, guildId).catch((error) => {
                console.error("tome reward error:", error);
            });
            return matcher.groups!.giver + " has given a tome to " + matcher.groups!.receiver;
        },
        customHeader: "⚠️ Tome",
    },
    {
        pattern: /^§.(?<giver>\S*?)(§.)? rewarded §.1024 ?Emeralds§. ?to ?§.(?<receiver>\S*?)(§.)?$/,
        messageType: 1,
        customMessage: (matcher) => matcher.groups!.giver + " has given a 1024 emeralds to " + matcher.groups!.receiver,
        customHeader: "⚠️ 🤑",
    },
    { pattern: /^(?<content>.*)$/, customHeader: "⚠️ Info", messageType: 1 },
    // The battle has begun!
    // You have taken control of Turncoat Turnabout from [Tsd]!Use /guild territory to defend this territory. <-  is this hr or non hr
];
const hrMessagePatterns: IWynnMessage[] = [
    {
        // §3DGtal7§b set §eTower Volley bonus§b to level §e2§b on §3DragonboneGraveyard
        pattern:
            /^(?<content>§.(?<username>\S+?)§. set §.(?<bonus>.+?)§. to level §.(?<level>\d+?)§. on §.(?<territory>.*))$/,
        messageType: 1,
        customHeader: "⚠️ 🤓",
    },
    {
        pattern: /^§.(?<username>\S+?)§. removed §.(?<changed>.+?)§. from §.(?<territory>.*)$/,
        messageType: 1,
        customHeader: "⚠️ 🤓",
    },

    {
        pattern: /^(?<content>§.(?<username>\S+?)§. changed §.(?<amount>\d+) (?<changed>\w+)§. on §3(?<territory>.*))$/,
        messageType: 1,
        customHeader: "⚠️ 🤓",
        // §3DGtal7§b changed §e4 upgrades§b on §3Illuminant Path
        // §3DGtal7§b changed §e6 bonuses§b on §3Rodoroc
    },
    {
        pattern: /^(?<content>Territory §.(?<territory>.+?)§. is \w+ more resources than it can store!)$/,
        messageType: 1,
        customHeader: "⚠️ 🤓",
    },
    {
        pattern: /^§.(?<username>\S+?)§. changed the global tax to §.(?<percent>\d+)%$/,
        // §3_Fai1ure§b changed the global tax to §e70%
        messageType: 1,
        customHeader: "⚠️ 🤓",
    },
    {
        pattern: /^(?<content>Territory §.(?<territory>.+?)§. production has stabilised)$/,
        messageType: 1,
        customHeader: "⚠️ 🤓",
    },
    {
        pattern: /^(?<content>§.(?<username>.+?)§. applied the loadout §(?<loadout>..+?)§. on §.(?<territory>.*))$/,
        messageType: 1,
        customHeader: "⚠️ 🤓",
        // §3ASingleProton§b applied the loadout §3fake med 3/3 res§b on §eFreezing Heights
        // §3ASingleProton§b applied the loadout §3fake ass med§b on §eCraterDescent§b, §3Lava Lakes§b, §3Dogun Ritual Site§b,§3Perilous Grotto§b, §3Perilous Passage§b, §3SecludedPonds§b, §3Burning Airship§b, §3Bandit Cave§b, §3CascadingBasins§b, §3Wayward Split§b, §3Harpy's Haunt South§b,§3Parasitic Slime Mine§b, §3Turncoat Turnabout§b, §3WindingWaters§b, §3Panda Kingdom§b, §3Panda Path§b, §3ElefolkStomping Grounds§b, §3Protector's Pathway§b, and§3Canyon High Path
    },
    {
        pattern:
            /^(?<content>§.(?<username>\S+?)§. (?<action>\w+) §.(?<item>.+?)§. ?(?:to|from) ?the ?Guild ?Bank ?\(§.High ?Ranked§.\))$/,
        messageType: 1,
        customHeader: "⚠️ Info",
    },
    {
        pattern: /^(?<content>§.A Guild Tome§. has been found and added to the Guild Rewards)$/,
        messageType: 1,
        customHeader: "⚠️ Info",
    },
    {
        pattern: /^(?<content>.*)$/,
        messageType: 1,
        customHeader: "⚠️ Info",
    },
];
const discordOnlyPattern = new RegExp("^(?<header>.+?): (?<content>.*)$");

const messageIndexes: { [key: string]: number } = {};
const hrMessageIndexes: { [key: string]: number } = {};

const disconnectTimers: { [key: string]: NodeJS.Timeout | null } = {};

export function registerMessageIndexes() {
    Object.entries(guildNames).forEach((value) => {
        messageIndexes[value[0]] = 0;
        hrMessageIndexes[value[0]] = 0;
    });
}

let botId = "";
const handleError = (error: Error, event: string) => {
    console.error("socket error on event", event, "with error:", error);
};
const errorHandler = (event: string, toHandle: Function) => {
    return (...args: unknown[]) => {
        try {
            const ret = toHandle.apply(this, args);
            if (ret && typeof ret.catch === "function") {
                ret.catch((error: Error) => handleError(error, event));
            }
        } catch (e: any) {
            handleError(e, event);
        }
    };
};

const sanitize = (inp: string): string => {
    return inp.replaceAll(/(_|\*|-|~|`|#)/g, "\\$1").replaceAll(/§./g, "");
};

const loginMessage = (socket: Socket) => {
    getChannelFromWynnGuild(socket.data.wynnGuildId)
        .then((channel) => {
            io.of("/discord")
                .to(botId)
                .emit("wynnMessage", {
                    MessageType: 1,
                    HeaderContent: ["⚠️ Info"],
                    TextContent: socket.data.username + " logged in!",
                    ListeningChannel: channel,
                });
        })
        .catch((error) => {
            handleError(error, "loginMessageSend");
        });
};

const logoutMessage = (socket: Socket) => {
    getChannelFromWynnGuild(socket.data.wynnGuildId)
        .then((channel) => {
            io.of("/discord")
                .to(botId)
                .emit("wynnMessage", {
                    MessageType: 1,
                    HeaderContent: ["⚠️ Info"],
                    TextContent: socket.data.username + " logged out.",
                    ListeningChannel: channel,
                });
        })
        .catch((error) => {
            handleError(error, "logoutMessageSend");
        });
};

export const getMessage = async (
    message: string,
    channel: string,
    socketData: SocketData,
): Promise<IWynn2DiscordMessage | null> => {
    for (let i = 0; i < wynnMessagePatterns.length; i++) {
        const pattern = wynnMessagePatterns[i];
        const matcher = pattern.pattern.exec(message);
        if (matcher) {
            const header = pattern.customHeader ? pattern.customHeader : matcher.groups!.header;
            const rawMessage = pattern.customMessage
                ? pattern.customMessage(matcher, socketData.wynnGuildId)
                : matcher.groups!.content;
            console.log(
                header,
                rawMessage,
                messageIndexes[socketData.wynnGuildId],
                "emitted by:",
                socketData.username,
                "discord:",
                socketData.discordUuid,
                "guild:",
                socketData.wynnGuildId,
            );

            let discordUuid: string | undefined;
            try {
                const uuid = await usernameToUuid(header);
                const user = await Services.user.getUserByMcUuid(uuid);
                discordUuid = user?.discordUuid;
            } catch {}
            const message = sanitize(rawMessage).replace(
                ENCODED_DATA_PATTERN,
                (match, _) => `**__${decodeItem(match).name}__**`,
            );
            const online = await isOnline(header, socketData.wynnGuildId);
            return {
                MessageType: pattern.messageType,
                HeaderContent: [sanitize(header) + (online ? "*" : ""), discordUuid],
                TextContent: message,
                ListeningChannel: channel,
            } as IWynn2DiscordMessage;
        }
    }
    return null;
};
export const getHrMessage = async (
    message: string,
    channel: string,
    socketData: SocketData,
): Promise<IWynn2DiscordMessage | null> => {
    for (let i = 0; i < hrMessagePatterns.length; i++) {
        const pattern = hrMessagePatterns[i];
        const matcher = pattern.pattern.exec(message);
        if (matcher) {
            const header = pattern.customHeader ? pattern.customHeader : matcher.groups!.header;
            const rawMessage = pattern.customMessage
                ? pattern.customMessage(matcher, socketData.wynnGuildId)
                : matcher.groups!.content;
            console.log(
                "hr",
                header,
                rawMessage,
                hrMessageIndexes[socketData.wynnGuildId],
                "emitted by:",
                socketData.username,
                "discord:",
                socketData.discordUuid,
                "guild:",
                socketData.wynnGuildId,
            );
            return {
                MessageType: pattern.messageType,
                HeaderContent: [sanitize(header), undefined],
                TextContent: sanitize(rawMessage),
                ListeningChannel: channel,
            } as IWynn2DiscordMessage;
        }
    }
    return null;
};

io.of(/^\/.*/).on("connect", (socket) => {
    console.log(`New connection attempt:`);
    console.log(`  Namespace: ${socket.nsp.name}`);
    console.log(`  Socket ID: ${socket.id}`);
});
io.of("/discord").on("connection", (socket) => {
    console.log(
        socket.data.username,
        "connected to discord with version:",
        socket.data.modVersion,
        "discord:",
        socket.data.discordUuid,
    );
    if (socket.data.wynnGuildId === "*") {
        botId = socket.id;
    } else {
        if (messageIndexes[socket.data.wynnGuildId] == undefined) {
            messageIndexes[socket.data.wynnGuildId] = 0;
            hrMessageIndexes[socket.data.wynnGuildId] = 0;
        }
        socket.data.messageIndex = messageIndexes[socket.data.wynnGuildId];
        socket.data.hrMessageIndex = hrMessageIndexes[socket.data.wynnGuildId];
        if (disconnectTimers[socket.data.discordUuid] != null) {
            clearTimeout(disconnectTimers[socket.data.discordUuid]!);
            disconnectTimers[socket.data.discordUuid] = null;
        } else {
            if (socket.data.onlineStatus !== OnlineStatus.INVISIBLE) {
                loginMessage(socket);
            }
        }
        socket.join(socket.data.wynnGuildId);
        console.log(socket.data.username, "joined", socket.data.wynnGuildId);
    }

    socket.use((packet, next) => {
        if (socket.data.muted) {
            return next(new Error("You are muted."));
        }
        next();
    });

    socket.on("error", (err) => {
        socket.emit("error", err.message);
    });

    /**
     * Event that gets fired upon a guild message captured by a mod client
     */
    socket.on(
        "wynnMessage",
        errorHandler("wynnMessage", (message: string) => {
            console.log(`"${message}" non hr`);
            if (!checkVersion(socket.data.modVersion)) {
                console.log(`skipping request from outdated mod version: ${socket.data.modVersion}`);
                return;
            }
            getChannelFromWynnGuild(socket.data.wynnGuildId)
                .then((channel) => {
                    if (channel === "none") {
                        console.log("no channel set up for:", socket.data.wynnGuildId);
                        return;
                    }

                    if (socket.data.messageIndex === messageIndexes[socket.data.wynnGuildId]) {
                        ++socket.data.messageIndex;
                        ++messageIndexes[socket.data.wynnGuildId];
                        io.of("/discord").to(socket.data.wynnGuildId).emit("wynnMirror", message);
                        getMessage(message, channel, socket.data).then((out) => {
                            io.of("/discord").to(botId).emit("wynnMessage", out!);
                        });
                    } else {
                        ++socket.data.messageIndex;
                    }
                })
                .catch((error) => {
                    handleError(error, "wynnMessage");
                });
        }),
    );

    /**
     * Event that gets fired upon an hr message captured by a mod client
     */
    socket.on(
        "hrMessage",
        errorHandler("hrMessage", (message: string) => {
            console.log(`"${message}" hr`);
            if (!checkVersion(socket.data.modVersion)) {
                console.log(`skipping request from outdated mod version: ${socket.data.modVersion}`);
                return;
            }
            getChannelFromWynnGuild(socket.data.wynnGuildId)
                .then((channel) => {
                    if (channel === "none") {
                        console.log("no channel set up for:", socket.data.wynnGuildId);
                        return;
                    }

                    if (socket.data.hrMessageIndex === hrMessageIndexes[socket.data.wynnGuildId]) {
                        ++socket.data.hrMessageIndex;
                        ++hrMessageIndexes[socket.data.wynnGuildId];
                        getHrMessage(message, channel, socket.data).then((out) => {
                            io.of("/discord").to(botId).emit("wynnMessage", out!);
                        });
                    } else {
                        ++socket.data.hrMessageIndex;
                    }
                })
                .catch((error) => handleError(error, "hrMessage"));
        }),
    );

    /**
     * Event that gets fired upon a discord only message being sent from a mod client
     */
    socket.on(
        "discordOnlyWynnMessage",
        errorHandler("discordOnlyWynnMessage", async (message: string) => {
            const channel = await getChannelFromWynnGuild(socket.data.wynnGuildId);
            if (channel === "none") {
                console.log("no channel set up for:", socket.data.wynnGuildId);
                return;
            }
            const matcher = discordOnlyPattern.exec(message);
            if (matcher) {
                const header = matcher.groups!.header;
                const message = matcher.groups!.content.replace(
                    ENCODED_DATA_PATTERN,
                    (match, _) => `<${decodeItem(match).name}>`,
                );
                console.log(message, "discord only");
                io.of("/discord")
                    .to(botId)
                    .emit("wynnMessage", {
                        MessageType: 2,
                        HeaderContent: [sanitize(header), socket.data.discordUuid],
                        TextContent: sanitize(message),
                        ListeningChannel: channel,
                    });
                io.of("/discord")
                    .to(socket.data.wynnGuildId)
                    .emit("discordMessage", {
                        DiscordUsername: "@none",
                        McUsername: header as string,
                        ReplyAuthor: null,
                        ReplyContent: null,
                        Content: message.replace(/[‌⁤ÁÀ֎]/g, "") as string,
                        WynnGuildId: socket.data.wynnGuildId,
                    });
            }
        }),
    );

    /**
     * Event that gets fired upon a message that needs to be sent from discord to wynn (including discord only wynn messages)
     */
    socket.on(
        "discordMessage",
        errorHandler("discordMessage", async (message: IB2SDiscord2WynnMessage) => {
            const mcUuid = (await Services.user.getUserByDiscord(message.DiscordUuid))?.mcUuid;
            const mcUsername = mcUuid ? await uuidToUsername(mcUuid) : undefined;
            console.log(message, "mcusername: ", mcUsername);
            io.of("/discord")
                .to(message.WynnGuildId)
                .emit("discordMessage", {
                    ...message,
                    McUsername: mcUsername,
                    Content: message.Content.replace(/[‌⁤ÁÀ֎]/g, ""),
                });
        }),
    );

    /**
     * Event that gets fired upon a new online status configuration update
     */
    socket.on("onlineStatus", (newStatus: number) => {
        console.log(socket.data.username, "changed their online status to:", newStatus);
        if (newStatus === OnlineStatus.INVISIBLE) logoutMessage(socket);
        else if (newStatus === OnlineStatus.ONLINE && socket.data.onlineStatus === OnlineStatus.INVISIBLE)
            loginMessage(socket);
        socket.data.onlineStatus = newStatus;
    });

    socket.on(
        "listOnline",
        errorHandler("listOnline", async (callback: Function) => {
            callback((await getOnlineUsers(socket.data.wynnGuildId)).map((onlineUser) => onlineUser.McUsername));
        }),
    );

    socket.on("sync", (ack) => {
        socket.data.messageIndex = messageIndexes[socket.data.wynnGuildId];
        ack();
    });

    socket.on(
        "disconnect",
        errorHandler("disconnect", (reason: string) => {
            console.log(socket.data.username, "disconnected with reason:", reason);
            io.of("/discord")
                .fetchSockets()
                .then((sockets) => {
                    sockets.forEach((s) => {
                        if (s.data.wynnGuildId === socket.data.wynnGuildId)
                            s.data.messageIndex = messageIndexes[socket.data.wynnGuildId];
                    });
                });
            if (socket.data.discordUuid !== "!bot" && socket.data.onlineStatus !== OnlineStatus.INVISIBLE) {
                disconnectTimers[socket.data.discordUuid] = setTimeout(() => {
                    logoutMessage(socket);
                    disconnectTimers[socket.data.discordUuid] = null;
                }, 10000);
            }
        }),
    );
});
