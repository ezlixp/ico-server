import GuildInfoModel from "../models/entities/guildInfoModel";

export async function getChannelFromWynnGuild(wynnGuildId: string) {
    const config = await GuildInfoModel.findOne({
        wynnGuildId: wynnGuildId,
    }).exec();
    if (!config) return "none";
    return config.listeningChannel;
}
