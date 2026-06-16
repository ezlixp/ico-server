import { usernameToUuid } from "../../communication/httpClients/mojangApiClient";
import { guildDatabases } from "../../models/entities/guildDatabaseModel";
import Services from "../../services/services";
import { IS2CDiscord2WynnMessage, IWynn2DiscordMessage, IWynnMessage } from "../../types/messageTypes";
import { SocketData } from "../../types/socketIOTypes";
import { isOnline } from "../../utils/socketUtils";
import { decodeItem } from "../../utils/wynntilsItemEncoding";

const sanitize = (inp: string): string => {
    return inp.replaceAll(/(_|\*|-|~|`|#)/g, "\\$1").replaceAll(/§./g, "");
};

const ENCODED_DATA_PATTERN = /([\u{F0000}-\u{FFFFD}]|[\u{100000}-\u{10FFFF}])+/gu;
const DISCORD_ONLY_PATTERN = new RegExp("^(?<header>.+?): (?<content>.*)$");

/** Named groups header and content are taken if they exist for the message sent to discord,
 * if no custom message/custom header function is defined.
 */
const wynnMessagePatterns: IWynnMessage[] = [
    {
        pattern: /^(?<pill>.*)§.(?<header>.+?)(§.)?:§. ?(?<content>.*)$/,
        messageType: 0,
        // §b󏿿󏿿󏿿󏿿󏿿󏿿󏿢§0󐀂§b §3ASingleProton§3:§b nice
    },
    {
        pattern:
            /^§.(?<player1>\S*?)§.(, ?§.(?<player2>\S*?)§.)?(, ?§.(?<player3>\S*?)§.)?(, ?and ?§.(?<player4>\S*?)§.)? ?finished ?§.(?<raid>.*?)§. ?and ?claimed.*§.(?<aspects>\d+)x ?Aspects.*$/,
        messageType: 1,
        customMessage: (matcher, guildId) => {
            let users: string[] = [matcher.groups!.player1];
            if (matcher.groups!.player2) users.push(matcher.groups!.player2);
            if (matcher.groups!.player3) users.push(matcher.groups!.player3);
            if (matcher.groups!.player4) users.push(matcher.groups!.player4);

            let outstring = "";
            users.map((user, index) => {
                if (index != 0) {
                    if (index == users.length - 1) outstring += ", and ";
                    else outstring += ", ";
                }
                outstring += user;
            });
            outstring += " completed " + matcher.groups!.raid;

            if (process.env.NODE_ENV !== "test")
                completeRaid(guildId, users, matcher.groups!.raid, Number.parseInt(matcher.groups!.aspects));

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
            /^(?<content>§.(?<username>\S+?)§. set ?§.(?<bonus>.+?)§. ?to level ?§.(?<level>\d+?)§. ?on ?§.(?<territory>.*))$/,
        messageType: 1,
        customHeader: "⚠️ 🤓",
    },
    {
        pattern: /^§.(?<username>\S+?)§. removed §.(?<changed>.+?)§. from §.(?<territory>.*)$/,
        messageType: 1,
        customHeader: "⚠️ 🤓",
    },

    {
        pattern:
            /^(?<content>§.(?<username>\S+?)§. changed ?§.(?<amount>\d+) ?(?<changed>\w+)§. ?on ?§3(?<territory>.*))$/,
        messageType: 1,
        customHeader: "⚠️ 🤓",
        // §3DGtal7§b changed §e4 upgrades§b on §3Illuminant Path
        // §3DGtal7§b changed §e6 bonuses§b on §3Rodoroc
    },
    {
        pattern: /^(?<content>Territory §.(?<territory>.+?)§. is \w+ ?more ?resources ?than ?it ?can ?store!)$/,
        messageType: 1,
        customHeader: "⚠️ 🤓",
    },
    {
        pattern: /^§.(?<username>\S+?)§. changed the ?global ?tax ?to ?§.(?<percent>\d+)%$/,
        // §3_Fai1ure§b changed the global tax to §e70%
        messageType: 1,
        customHeader: "⚠️ 🤓",
    },
    {
        pattern: /^(?<content>Territory §.(?<territory>.+?)§. ?production ?has ?stabilised)$/,
        messageType: 1,
        customHeader: "⚠️ 🤓",
    },
    {
        pattern: /^(?<content>§.(?<username>.+?)§. applied the ?loadout ?§(?<loadout>..+?)§. ?on ?§.(?<territory>.*))$/,
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
        pattern: /^(?<content>§.A Guild Tome§. has been found ?and ?added ?to ?the ?Guild ?Rewards)$/,
        messageType: 1,
        customHeader: "⚠️ Info",
    },
    {
        pattern: /^(?<content>.*)$/,
        messageType: 1,
        customHeader: "⚠️ Info",
    },
];

export const completeRaid = async (guildId: string, users: string[], raid: string, aspects: number) => {
    await guildDatabases[guildId]?.RaidRepository.create({
        users: users,
        raid,
    }).catch(() => {});
    let filteredUsers = await Promise.all(
        users.map(async (username) => {
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
    filteredUsers = filteredUsers.filter((u): u is string => u !== null);
    if (filteredUsers.length == 0) return;
    const halfAspectsPer = Math.floor((2 * aspects) / filteredUsers.length);
    const left = 2 * aspects - halfAspectsPer * filteredUsers.length;
    for (let i = filteredUsers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filteredUsers[i], filteredUsers[j]] = [filteredUsers[j], filteredUsers[i]];
    }
    await Promise.all(
        filteredUsers.map(async (username, index) => {
            try {
                const reward = (halfAspectsPer + (index < left ? 1 : 0)) / 2;
                await Services.raid.updateRewards(await usernameToUuid(username!), guildId, reward, 0, 1);
            } catch (err) {
                console.error("raid reward error:", err);
            }
        }),
    );
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

export const getDiscordOnlyMessage = async (
    message: string,
    channel: string,
    socketData: SocketData,
): Promise<[IWynn2DiscordMessage, IS2CDiscord2WynnMessage] | null> => {
    const matcher = DISCORD_ONLY_PATTERN.exec(message);
    if (matcher) {
        const header = matcher.groups!.header;
        const message = matcher.groups!.content.replace(
            ENCODED_DATA_PATTERN,
            (match, _) => `<${decodeItem(match).name}>`,
        );
        console.log(message, "discord only");
        return [
            {
                MessageType: 2,
                HeaderContent: [sanitize(header), socketData.discordUuid],
                TextContent: sanitize(message),
                ListeningChannel: channel,
            },
            {
                DiscordUsername: "@none",
                McUsername: header as string,
                ReplyAuthor: null,
                ReplyContent: null,
                Content: message.replace(/[‌⁤ÁÀ֎]/g, "") as string,
                WynnGuildId: socketData.wynnGuildId,
            },
        ];
    }
    return null;
};
