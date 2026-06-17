import "../config";
import { IB2SDiscord2WynnMessage, IC2SPlayerPositionMessage } from "../types/messageTypes";
import { getOnlineUsers } from "../utils/socketUtils";
import { checkVersion } from "../utils/versionUtils";
import { getChannelFromWynnGuild } from "../utils/serverUtils";
import { io } from "../socket";
import Services from "../services/services";
import { uuidToUsername } from "../communication/httpClients/mojangApiClient";
import { OnlineStatus } from "../constants/onlineStatus";
import { Socket } from "socket.io";
import { getDiscordOnlyMessage, getHrMessage, getMessage } from "./model/message";

const disconnectTimers: { [key: string]: NodeJS.Timeout | null } = {};

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
        if (Services.guildInfo.messageIndexes[socket.data.wynnGuildId] == undefined) {
            Services.guildInfo.messageIndexes[socket.data.wynnGuildId] = 0;
            Services.guildInfo.hrMessageIndexes[socket.data.wynnGuildId] = 0;
        }
        socket.data.messageIndex = Services.guildInfo.messageIndexes[socket.data.wynnGuildId];
        socket.data.hrMessageIndex = Services.guildInfo.hrMessageIndexes[socket.data.wynnGuildId];
        if (disconnectTimers[socket.data.discordUuid] != null) {
            clearTimeout(disconnectTimers[socket.data.discordUuid]!);
            disconnectTimers[socket.data.discordUuid] = null;
        } else {
            if (socket.data.onlineStatus !== OnlineStatus.INVISIBLE) {
                loginMessage(socket);
            }
        }
        socket.join(socket.data.wynnGuildId);
        Object.entries(Services.guildInfo.playerPositions[socket.data.wynnGuildId]).map(([username, position]) => {
            io.of("/discord")
                .to(socket.id)
                .emit("playerPosition", { username: username, x: position.x, y: position.y, z: position.z });
        });
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

                    if (socket.data.messageIndex === Services.guildInfo.messageIndexes[socket.data.wynnGuildId]) {
                        ++socket.data.messageIndex;
                        ++Services.guildInfo.messageIndexes[socket.data.wynnGuildId];
                        io.of("/discord").to(socket.data.wynnGuildId).emit("wynnMirror", message);
                        getMessage(message, channel, socket.data, (out) => {
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

                    if (socket.data.hrMessageIndex === Services.guildInfo.hrMessageIndexes[socket.data.wynnGuildId]) {
                        ++socket.data.hrMessageIndex;
                        ++Services.guildInfo.hrMessageIndexes[socket.data.wynnGuildId];
                        getHrMessage(message, channel, socket.data, (out) => {
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
            const res = await getDiscordOnlyMessage(message, channel, socket.data);
            if (res != null) {
                io.of("/discord").to(botId).emit("wynnMessage", res[0]);
                io.of("/discord").to(socket.data.wynnGuildId).emit("discordMessage", res[1]);
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
     * Event that gets fired upon a player notifying the server of their position
     */
    socket.on("playerPosition", (message: string) => {
        const data: IC2SPlayerPositionMessage = JSON.parse(message);
        Services.guildInfo.playerPositions[socket.data.wynnGuildId][socket.data.username] = {
            x: data.x,
            y: data.y,
            z: data.z,
        };
        socket
            .to(socket.data.wynnGuildId)
            .emit("playerPosition", { username: socket.data.username, x: data.x, y: data.y, z: data.z });
    });

    socket.on("requestAllPositions", () => {
        Object.entries(Services.guildInfo.playerPositions[socket.data.wynnGuildId]).map(([username, position]) => {
            io.of("/discord")
                .to(socket.id)
                .emit("playerPosition", { username: username, x: position.x, y: position.y, z: position.z });
        });
    });

    /**
     * Event that gets fired upon a player notifying the server to be hidden
     */
    socket.on("playerHide", () => {
        if (Object.hasOwn(Services.guildInfo.playerPositions[socket.data.wynnGuildId], socket.data.username)) {
            delete Services.guildInfo.playerPositions[socket.data.wynnGuildId][socket.data.username];
            socket.to(socket.data.wynnGuildId).emit("playerHide", socket.data.username);
        }
    });

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
        socket.data.messageIndex = Services.guildInfo.messageIndexes[socket.data.wynnGuildId];
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
                            s.data.messageIndex = Services.guildInfo.messageIndexes[socket.data.wynnGuildId];
                    });
                });
            if (socket.data.discordUuid !== "!bot") {
                if (socket.data.onlineStatus !== OnlineStatus.INVISIBLE) {
                    disconnectTimers[socket.data.discordUuid] = setTimeout(() => {
                        logoutMessage(socket);
                        disconnectTimers[socket.data.discordUuid] = null;
                    }, 10000);
                }
                if (Object.hasOwn(Services.guildInfo.playerPositions[socket.data.wynnGuildId], socket.data.username)) {
                    delete Services.guildInfo.playerPositions[socket.data.wynnGuildId][socket.data.username];
                    io.of("/discord").to(socket.data.wynnGuildId).emit("playerHide", socket.data.username);
                }
            }
        }),
    );
});
