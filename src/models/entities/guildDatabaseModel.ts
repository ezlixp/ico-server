import { IRepository } from "../../repositories/base/baseRepository";
import { IGuildUser } from "../schemas/guildUserSchema";
import { IRaid } from "../schemas/raidSchema";
import { ITome } from "../schemas/tomeSchema";
import { IWaitlist } from "../schemas/waitlistSchema";

export interface IGuildDatabase {
    GuildUserRepository: IRepository<IGuildUser>;
    RaidRepository: IRepository<IRaid>;
    TomeRepository: IRepository<ITome>;
    WaitlistRepository: IRepository<IWaitlist>;
}

export interface IGuildDatabases {
    [key: string]: IGuildDatabase;
}

/**
 * key: name
 * value: guild id
 */
export const guildIds: { [key: string]: string } = {};

/**
 * key: guild id
 * value: name
 */
export const guildNames: { [key: string]: string } = {};

export const guildDatabases: IGuildDatabases = {};
