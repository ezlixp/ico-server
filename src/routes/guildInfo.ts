import { NextFunction, Request, Router } from "express";
import { IGuildInfo, IGuildInfoOptionals } from "../models/entities/guildInfoModel";
import { DefaultResponse } from "../communication/responses/defaultResponse";
import validateAdminJwtToken from "../middleware/jwtAdminTokenValidator.middleware";
import Services from "../services/services";
import { setMuteUser } from "../utils/socketUtils";

interface InfoRequest<Params = Record<string, any>, ResBody = any, ReqBody = any, ReqQuery = any> extends Request<
    Params & { discordGuildId: string },
    ResBody,
    ReqBody,
    ReqQuery
> {}

function clearUnsafe(request: InfoRequest<{}, {}, Partial<IGuildInfo>>, response: any, next: NextFunction) {
    request.body.discordGuildId = undefined;
    request.body.wynnGuildName = undefined;
    request.body.wynnGuildId = undefined;
    next();
}

/**
 * Maps all server config related endpoints. endpoing: .../config
 */
const infoRouter = Router();
const guildInfoRouter = Router({ mergeParams: true });

// Register all middlewares.
infoRouter.use(validateAdminJwtToken);
infoRouter.use("/:discordGuildId", guildInfoRouter);

infoRouter.post("/", async (request: InfoRequest<{}, {}, IGuildInfo>, response: DefaultResponse<IGuildInfo>) => {
    response.send(await Services.guildInfo.createNewGuild(request.body));
});

guildInfoRouter.get("/", async (request: InfoRequest, response: DefaultResponse<IGuildInfo>) => {
    response.send(await Services.guildInfo.getGuildByDiscord(request.params.discordGuildId));
});

guildInfoRouter.delete("/", async (request: InfoRequest, response: DefaultResponse) => {
    await Services.guildInfo.deleteGuild({ discordGuildId: request.params.discordGuildId });
    response.status(204).send();
});

guildInfoRouter.patch(
    "/",
    clearUnsafe,
    async (request: InfoRequest<{}, {}, Partial<IGuildInfoOptionals>>, response: DefaultResponse<IGuildInfo>) => {
        response.send(await Services.guildInfo.updateGuildInfo(request.params.discordGuildId, request.body));
    },
);

guildInfoRouter.post(
    "/mute",
    async (request: InfoRequest<{}, {}, { discordUuid: string }>, response: DefaultResponse<IGuildInfo>) => {
        setMuteUser(request.body.discordUuid, true);
        response.send(await Services.guildInfo.mute(request.params.discordGuildId, request.body.discordUuid));
    },
);

guildInfoRouter.delete(
    "/mute",
    async (request: InfoRequest<{}, {}, { discordUuid: string }>, response: DefaultResponse<IGuildInfo>) => {
        setMuteUser(request.body.discordUuid, false);
        response.send(await Services.guildInfo.unmute(request.params.discordGuildId, request.body.discordUuid));
    },
);

export default infoRouter;

