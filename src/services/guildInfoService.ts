import { FilterQuery, HydratedDocument, UpdateQuery } from "mongoose";
import { ValidationError } from "../errors/implementations/validationError";
import { IGuildInfo, IGuildInfoOptionals } from "../models/entities/guildInfoModel";
import { GuildInfoRepository } from "../repositories/guildInfoRepository";
import { GuildDatabaseCreator } from "./guild/guildDatabaseCreator";
import { NotFoundError } from "../errors/implementations/notFoundError";
import { GuildErrors } from "../errors/messages/guildErrors";

export class GuildInfoService {
    private readonly guildDatabaseCreator: GuildDatabaseCreator;
    private readonly validator: GuildInfoServiceValidator;
    private readonly repository: GuildInfoRepository;

    private constructor() {
        this.guildDatabaseCreator = GuildDatabaseCreator.create();
        this.validator = new GuildInfoServiceValidator();
        this.repository = new GuildInfoRepository();
    }

    public static create() {
        return new GuildInfoService();
    }

    public async createNewGuild(
        guildRequest: { discordGuildId: string; wynnGuildId: string } & Partial<IGuildInfo>,
    ): Promise<HydratedDocument<IGuildInfo>> {
        await this.checkDuplicateGuild(guildRequest.discordGuildId, guildRequest.wynnGuildId);

        const newGuild = await this.repository.create(guildRequest);
        this.guildDatabaseCreator.createNewDatabase(newGuild.wynnGuildName, newGuild.wynnGuildId);

        return newGuild;
    }

    public async getGuildByDiscord(discordGuildId: string): Promise<HydratedDocument<IGuildInfo>> {
        const guild = await this.repository.findOne(
            { discordGuildId: discordGuildId },
            undefined,
            undefined,
            GuildErrors.NOT_CONFIGURED,
        );

        return guild;
    }

    public async deleteGuild(filter: FilterQuery<IGuildInfo>) {
        const guild = await this.repository.deleteOne(filter);
        this.validator.validateDeleteGuild(guild);
    }

    public async updateGuildInfo(
        discordGuildId: string,
        update: UpdateQuery<IGuildInfoOptionals>,
    ): Promise<HydratedDocument<IGuildInfo>> {
        const { privilegedRoles = [], mutedUuids = [], ...rest } = update;

        return await this.repository.update(
            { discordGuildId: discordGuildId },
            {
                ...rest,
                ...{ $addToSet: { privilegedRoles: { $each: privilegedRoles }, mutedUuids: { $each: mutedUuids } } },
            },
            GuildErrors.NOT_CONFIGURED,
        );
    }

    public async mute(discordGuildId: string, mutedUuid: string) {
        return await this.repository.update(
            { discordGuildId: discordGuildId },
            { $addToSet: { mutedUuids: mutedUuid } },
            GuildErrors.NOT_CONFIGURED,
        );
    }

    public async unmute(discordGuildId: string, mutedUuid: string) {
        return await this.repository.update(
            { discordGuildId: discordGuildId },
            { $pull: { mutedUuids: mutedUuid } },
            GuildErrors.NOT_CONFIGURED,
        );
    }

    public async isUserMuted(wynnGuildId: string, mcUuid: string) {
        const guild = await this.repository.findOne(
            { wynnGuildId: wynnGuildId },
            undefined,
            undefined,
            GuildErrors.NOT_CONFIGURED,
        );

        return guild.mutedUuids.includes(mcUuid);
    }

    public async checkDuplicateGuild(discordGuildId: string, wynnGuildId: string) {
        if (await this.repository.guildExists(discordGuildId, wynnGuildId)) {
            throw new ValidationError("A guild with the same Id is already registered.");
        }
    }

    public async getAll() {
        return await this.repository.getAll();
    }
}

class GuildInfoServiceValidator {
    validateDeleteGuild(guild: HydratedDocument<IGuildInfo> | null): asserts guild is HydratedDocument<IGuildInfo> {
        if (!guild) throw new NotFoundError(GuildErrors.NOT_DELETED);
    }
}

