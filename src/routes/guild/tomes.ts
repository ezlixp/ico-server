import validateJwtToken from "../../middleware/jwtTokenValidator.middleware";
import { Router } from "express";
import verifyInGuild from "../../middleware/verifyInGuild.middleware";
import { ITome } from "../../models/schemas/tomeSchema";
import { GuildRequest } from "../../communication/requests/guildRequest";
import { DefaultResponse } from "../../communication/responses/defaultResponse";
import Services from "../../services/services";

/**
 * Maps all tome-related endpoints. endpoint: .../guilds/tomes/
 */
const tomeRouter = Router();

tomeRouter.get("/:wynnGuildId", async (request: GuildRequest, response: DefaultResponse<ITome[]>) => {
    console.log(request.params.wynnGuildId);
    console.log(await Services.tome.getTomeList(request.params.wynnGuildId));
    response.send(await Services.tome.getTomeList(request.params.wynnGuildId));
});

tomeRouter.post(
    "/:wynnGuildId",
    validateJwtToken,
    verifyInGuild,
    async (request: GuildRequest<{}, {}, { mcUsername: string }>, response: DefaultResponse<ITome>) => {
        response.send(await Services.tome.addToTomeList(request.body.mcUsername, request.params.wynnGuildId));
    },
);

tomeRouter.get(
    "/:wynnGuildId/:mcUsername",
    async (
        request: GuildRequest<{ mcUsername: string }>,
        response: DefaultResponse<{ mcUsername: string; position: number }>,
    ) => {
        response.send(
            await Services.tome.getTomeListPosition(
                { mcUsername: request.params.mcUsername },
                request.params.wynnGuildId,
            ),
        );
    },
);

tomeRouter.delete(
    "/:wynnGuildId/:mcUsername",
    validateJwtToken,
    async (request: GuildRequest<{ mcUsername: string }>, response: DefaultResponse) => {
        await Services.tome.deleteFromTomeList(request.params.mcUsername, request.params.wynnGuildId);
        response.status(204).send();
    },
);

export default tomeRouter;
