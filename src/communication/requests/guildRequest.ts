import { Request } from "express";

export interface GuildRequest<
    Params = { wynnGuildId: string },
    ResBody = any,
    ReqBody = any,
    ReqQuery = any,
> extends Request<{ wynnGuildId: string } & Params, ResBody, ReqBody, ReqQuery> {}
