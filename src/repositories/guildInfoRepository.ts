import { BaseRepository } from "./base/baseRepository";
import GuildInfoModel, { IGuildInfo } from "../models/entities/guildInfoModel";
import { AppError } from "../errors/base/appError";

export class GuildInfoRepository extends BaseRepository<IGuildInfo> {
    constructor() {
        super(GuildInfoModel);
    }

    async guildExists(discordGuildId: string, wynnGuildId: string): Promise<boolean> {
        try {
            await super.findOne({
                $or: [{ wynnGuildId: wynnGuildId }, { discordGuildId: discordGuildId }],
            });
        } catch (err) {
            if (err instanceof AppError && err.statusCode === 404) return false;
        }
        return true;
    }

    async getAll(): Promise<IGuildInfo[]> {
        return await super.find({});
    }
}
