import mongoose, { Schema } from "mongoose";
import { BaseModel } from "./baseModel";

export interface IGuildInfoOptionals extends BaseModel {
    tomeChannel: string;
    layoffsChannel: string;
    raidsChannel: string;
    warChannel: string;
    privilegedRoles: string[];
    mutedUuids: string[];
    listeningChannel: string;
    broadcastingChannel: string;
}

export interface IGuildInfo extends IGuildInfoOptionals {
    wynnGuildId: string;
    wynnGuildName: string;
    discordGuildId: string;
}

export class GuildInfoImpl implements IGuildInfo {
    public wynnGuildId: string;
    public wynnGuildName: string;
    public discordGuildId: string;
    public tomeChannel: string;
    public layoffsChannel: string;
    public raidsChannel: string;
    public warChannel: string;
    public privilegedRoles: string[];
    public mutedUuids: string[];
    public listeningChannel: string;
    public broadcastingChannel: string;
    public constructor(
        wynnGuildId: string,
        wynnGuildName: string,
        discordGuildId: string,
        {
            tomeChannel = "0",
            layoffsChannel = "0",
            raidsChannel = "0",
            warChannel = "0",
            privilegedRoles = [],
            mutedUuids = [],
            listeningChannel = "0",
            broadcastingChannel = "0",
        }: Partial<IGuildInfoOptionals> = {},
    ) {
        this.wynnGuildId = wynnGuildId;
        this.wynnGuildName = wynnGuildName;
        this.discordGuildId = discordGuildId;
        this.tomeChannel = tomeChannel;
        this.layoffsChannel = layoffsChannel;
        this.raidsChannel = raidsChannel;
        this.warChannel = warChannel;
        this.privilegedRoles = privilegedRoles;
        this.mutedUuids = mutedUuids;
        this.listeningChannel = listeningChannel;
        this.broadcastingChannel = broadcastingChannel;
    }
}

const guildInfoSchema: Schema<IGuildInfo> = new Schema({
    wynnGuildId: { type: String, required: true },
    wynnGuildName: { type: String, required: true },
    discordGuildId: { type: String, required: true },
    tomeChannel: { type: String, required: true, default: "0" },
    layoffsChannel: { type: String, required: true, default: "0" },
    raidsChannel: { type: String, required: true, default: "0" },
    warChannel: { type: String, required: true, default: "0" },
    privilegedRoles: {
        type: [String],
        required: true,
        validate: {
            validator: function (arr) {
                return (
                    Array.isArray(arr) &&
                    arr.every((item) => typeof item === "string" && item !== null && !isNaN(Number(item)))
                );
            },
        },
        default: [],
    },
    mutedUuids: {
        type: [String],
        required: true,
        validate: {
            validator: function (arr) {
                return (
                    Array.isArray(arr) &&
                    arr.every((item) => typeof item === "string" && item !== null && !isNaN(Number(item)))
                );
            },
        },
        default: [],
    },
    listeningChannel: { type: String, required: true, default: "0" },
    broadcastingChannel: { type: String, required: true, default: "0" },
});

/**
 * @property {string} wynnGuildId         - The guild id a server is connected to.
 * @property {string} wynnGuildName       - The guild name a server is connected to.
 * @property {string} discordGuildId      - The server id a guild is connected to.
 * @property {string} tomeChannel         - The channel id for tomes, or -1 if not specified.
 * @property {string} layoffsChannel      - The channel id for layoffs, or -1 if not specified.
 * @property {string} raidsChannel        - The channel id for raids, or -1 if not specified.
 * @property {string} warChannel          - The channel id for wars, or -1 if not specified.
 * @property {string[]} privilegedRoles   - The roles in the discord server with additional permissions.
 * @property {string[]} mutedUuids        - The uuids of discord users muted in chat bridging.
 * @property {string} listeningChannel    - The channel ids that are listening for messages.
 * @property {string} broadcastingChannel - The channel ids to broadcast bridge messages to, not necessarily in the same server.
 */
const GuildInfoModel = mongoose.model("Guild Info", guildInfoSchema);

export default GuildInfoModel;
