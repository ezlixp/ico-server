import { Request, Router } from "express";
import validateJwtToken from "../middleware/jwtTokenValidator.middleware";
import { IUser } from "../models/entities/userModel";
import { DefaultResponse } from "../communication/responses/defaultResponse";
import validateAdminJwtToken from "../middleware/jwtAdminTokenValidator.middleware";
import verifyInGuild from "../middleware/verifyInGuild.middleware";
import { usernameToUuid } from "../communication/httpClients/mojangApiClient";
import { GuildRequest } from "../communication/requests/guildRequest";
import { HydratedDocument } from "mongoose";
import Services from "../services/services";
import { kickUser } from "../utils/socketUtils";

/**
 * Maps all endpoints related to user information. endpoint: .../user/
 */

const userInfoRouter = Router();
userInfoRouter.use(validateJwtToken);

// TODO: validate token for uuid being updated
userInfoRouter.get(
    "/blocked/:mcUuid",
    async (request: Request<{ mcUuid: string }>, response: DefaultResponse<string[]>) => {
        const mcUuid = request.params.mcUuid.replaceAll("-", "");
        const blockedList = await Services.user.getBlockedList({ mcUuid: mcUuid });

        response.status(200).send(blockedList);
    }
);

userInfoRouter.post(
    "/blocked/:mcUuid",
    async (request: Request<{ mcUuid: string }, {}, { toBlock: string }>, response: DefaultResponse<IUser>) => {
        const toBlock = request.body.toBlock;
        const uuid = request.params.mcUuid.replaceAll("-", "");
        const updatedUser = await Services.user.addToBlockedList({ mcUuid: uuid }, toBlock);

        response.status(200).send(updatedUser);
    }
);

userInfoRouter.delete(
    "/blocked/:mcUuid",
    async (request: Request<{ mcUuid: string }, {}, {}, { toRemove: string }>, response: DefaultResponse<IUser>) => {
        const uuid = request.params.mcUuid.replaceAll("-", "");
        const toRemove = request.query.toRemove;

        const updatedUser = await Services.user.removeFromBlockedList({ mcUuid: uuid }, toRemove);

        response.send(updatedUser);
    }
);

userInfoRouter.get(
    "/onlineStatus/:mcUuid",
    async (request: Request<{ mcUuid: string }>, response: DefaultResponse<number>) => {
        const uuid = request.params.mcUuid.replaceAll("-", "");
        response.send((await Services.user.getUser({ mcUuid: uuid })).onlineStatus);
    }
);

userInfoRouter.post(
    "/onlineStatus/:mcUuid",
    async (request: Request<{ mcUuid: string }, {}, { onlineStatus: number }>, response: DefaultResponse<IUser>) => {
        const uuid = request.params.mcUuid.replaceAll("-", "");
        const updatedUser = await Services.user.updateUser(
            { mcUuid: uuid },
            { onlineStatus: request.body.onlineStatus }
        );

        response.send(updatedUser);
    }
);

userInfoRouter.post(
    "/link/:wynnGuildId",
    verifyInGuild,
    validateAdminJwtToken,
    async (
        request: GuildRequest<{}, {}, { mcUsername: string; discordUuid: string }>,
        response: DefaultResponse<HydratedDocument<IUser>>
    ) => {
        response.status(200).send(
            await Services.user.linkUser({
                discordUuid: request.body.discordUuid,
                mcUuid: request.body.mcUsername ? await usernameToUuid(request.body.mcUsername) : "",
            })
        );
    }
);

userInfoRouter.post(
    "/ban/:discordUuid",
    validateAdminJwtToken,
    async (request: Request<{ discordUuid: string }, {}, { banned: boolean }>, response: DefaultResponse) => {
        if (request.body.banned) kickUser(request.params.discordUuid);
        response.send(
            await Services.user.updateUser({ discordUuid: request.params.discordUuid }, { banned: request.body.banned })
        );
    }
);

export default userInfoRouter;

