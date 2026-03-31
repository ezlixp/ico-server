import { guildDatabases, IGuildDatabases } from "../../models/entities/guildDatabaseModel";
import { BaseGuildServiceValidator } from "./baseGuildServiceValidator";
import { ILeaderboardUser, IRaid, IRaidRewardsResponse } from "../../models/schemas/raidSchema";
import { uuidToUsername } from "../../communication/httpClients/mojangApiClient";
import { FilterQuery, HydratedDocument } from "mongoose";
import { IGuildUser } from "../../models/schemas/guildUserSchema";
import { RaidErrors } from "../../errors/messages/raidErrors";
import { MissingFieldError } from "../../errors/implementations/missingFieldError";

export class RaidService {
    private readonly databases: IGuildDatabases;
    private readonly validator: RaidServiceValidator;
    private constructor() {
        this.databases = guildDatabases;
        this.validator = new RaidServiceValidator();
    }

    static create(): RaidService {
        return new RaidService();
    }

    async getRaids(wynnGuildId: string): Promise<IRaid[]> {
        this.validator.validateGuild(wynnGuildId);
        return await this.databases[wynnGuildId].RaidRepository.find({});
    }

    async getRewards(wynnGuildId: string): Promise<IRaidRewardsResponse[]> {
        this.validator.validateGuild(wynnGuildId);
        const users = await this.databases[wynnGuildId].GuildUserRepository.find({
            $or: [{ aspects: { $gte: 1 } }, { emeralds: { $gt: 0 } }],
        });
        const res: IRaidRewardsResponse[] = [];
        for (var i = 0; i < users.length; ++i) {
            res.push({
                mcUsername: await uuidToUsername(users[i].mcUuid),
                raids: users[i].raids,
                aspects: users[i].aspects,
                liquidEmeralds: users[i].emeralds / 4096,
            });
        }
        return res;
    }

    /**
     *
     * @param update query of which document to update
     * @param aspects number of aspects to increment by
     * @param emeralds number of emeralds to increment by
     * @param wynnGuildId
     * @returns
     */
    async updateRewards(
        mcUuid: string,
        wynnGuildId: string,
        aspects?: number,
        emeralds?: number,
    ): Promise<HydratedDocument<IGuildUser>> {
        this.validator.validateGuild(wynnGuildId);
        this.validator.validateUpdateRewards(mcUuid);

        return await this.databases[wynnGuildId].GuildUserRepository.updateWithUpsert(
            { mcUuid: mcUuid },
            { $inc: { aspects: aspects || 0, emeralds: emeralds || 0, raids: 1 } },
        );
    }

    async getUserRewards(filter: FilterQuery<IGuildUser>, wynnGuildId: string): Promise<IRaidRewardsResponse> {
        this.validator.validateGuild(wynnGuildId);
        const user = await this.databases[wynnGuildId].GuildUserRepository.findOne(
            filter,
            undefined,
            undefined,
            RaidErrors.NOT_IN_RAID_LIST,
        );

        const res: IRaidRewardsResponse = {
            mcUsername: await uuidToUsername(user.mcUuid),
            raids: user.raids,
            aspects: user.aspects,
            liquidEmeralds: user.emeralds / 4096,
        };
        return res;
    }

    async getRaidsLeaderboard(wynnGuildId: string): Promise<ILeaderboardUser[]> {
        this.validator.validateGuild(wynnGuildId);
        const users = await this.databases[wynnGuildId].GuildUserRepository.find(
            { raids: { $gt: 0 } },
            {},
            { sort: { raids: "descending" } },
        );
        let formattedTopUsers: ILeaderboardUser[] = [];
        // TODO implement mojang api bulk uuid to username call
        for (let i = 0; i < users.length; i++) {
            formattedTopUsers.push({
                mcUsername: await uuidToUsername(users[i].mcUuid),
                raids: users[i].raids,
            });
        }
        return formattedTopUsers;
    }
}

class RaidServiceValidator extends BaseGuildServiceValidator {
    public constructor() {
        super();
    }

    validateUpdateRewards(mcUuid: string): asserts mcUuid is string {
        if (typeof mcUuid !== "string") throw new MissingFieldError("mcUuid", "string");
    }
}

