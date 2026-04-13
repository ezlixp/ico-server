import { Router } from "express";
import { GuildRequest } from "../../communication/requests/guildRequest";
import { getOnlineUsers, IOnlineUser } from "../../utils/socketUtils";
import { DefaultResponse } from "../../communication/responses/defaultResponse";

/**
 * Maps all wynn related endpoints. endpoint: .../online/
 */
const onlineRouter = Router();

onlineRouter.get("/:wynnGuildId", async (request: GuildRequest, response: DefaultResponse<IOnlineUser[]>) => {
    response.send(await getOnlineUsers(request.params.wynnGuildId));
});

export default onlineRouter;
