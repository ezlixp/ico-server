import { Request, Router } from "express";
import validateAdminJwtToken from "../middleware/jwtAdminTokenValidator.middleware";
import { DefaultResponse } from "../communication/responses/defaultResponse";
import { AddGuildRequest } from "../communication/requests/addGuildRequest";
import Services from "../services/services";
import { GuildInfoImpl, IGuildInfo } from "../models/entities/guildInfoModel";

/**
 * Maps all admin related routes. endpoint: .../admin/
 * */
const adminRouter = Router();

// TODO move to guildinfo.ts
adminRouter.post(
    "/new-guild",
    validateAdminJwtToken,
    async (request: Request<{}, {}, AddGuildRequest>, response: DefaultResponse<IGuildInfo>) => {
        const guildObj = new GuildInfoImpl(
            request.body.validationKey,
            request.body.wynnGuildId,
            request.body.wynnGuildName
        );

        const newGuild = await Services.guildInfo.createNewGuild(guildObj);

        response.status(200).send(newGuild);
    }
);

export default adminRouter;

