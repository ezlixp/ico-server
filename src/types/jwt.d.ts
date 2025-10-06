import "jsonwebtoken";
declare module "jsonwebtoken" {
    export interface JwtPayload {
        discordUuid: string;
        guildId: string;
    }
}

