import { guildDatabases } from "../../models/entities/guildDatabaseModel";
import { GuildErrors } from "../../errors/messages/guildErrors";
import { NotFoundError } from "../../errors/implementations/notFoundError";

export abstract class BaseGuildServiceValidator {
    protected constructor() {}

    validateGuild(wynnGuildId: string) {
        if (!(wynnGuildId in guildDatabases) && wynnGuildId !== "*") {
            throw new NotFoundError(GuildErrors.NOT_CONFIGURED);
        }
    }
}
