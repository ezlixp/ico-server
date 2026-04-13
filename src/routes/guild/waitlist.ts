import { Router } from "express";
import validateJwtToken from "../../middleware/jwtTokenValidator.middleware";
import { GuildRequest } from "../../communication/requests/guildRequest";
import { DefaultResponse } from "../../communication/responses/defaultResponse";
import { IWaitlist } from "../../models/schemas/waitlistSchema";
import Services from "../../services/services";

/**
 * Maps all tome-related endpoints
 */
const waitlistRouter = Router();

waitlistRouter.get("/:wynnGuildId", async (request: GuildRequest, response: DefaultResponse<IWaitlist[]>) => {
    response.send(await Services.waitlist.getWaitlist(request.params.wynnGuildId));
});

waitlistRouter.post(
    "/:wynnGuildId",
    validateJwtToken,
    async (request: GuildRequest<{}, {}, { mcUsername: string }>, response: DefaultResponse<IWaitlist>) => {
        response.send(await Services.waitlist.addToWaitlist(request.body.mcUsername, request.params.wynnGuildId));
    },
);

waitlistRouter.delete(
    "/:wynnGuildId/:mcUsername",
    validateJwtToken,
    async (request: GuildRequest<{ mcUsername: string }>, response: DefaultResponse) => {
        await Services.waitlist.removeFromWaitlist(request.params.mcUsername, request.params.wynnGuildId);
        response.send();
    },
);

export default waitlistRouter;
