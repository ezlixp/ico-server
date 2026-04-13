import { Router } from "express";
import { usernameToUuid } from "../../communication/httpClients/mojangApiClient";
import { GuildRequest } from "../../communication/requests/guildRequest";
import validateAdminJwtToken from "../../middleware/jwtAdminTokenValidator.middleware";
import { DefaultResponse } from "../../communication/responses/defaultResponse";
import { ILeaderboardUser, IRaid, IRaidRewardsResponse } from "../../models/schemas/raidSchema";
import { IGuildUser } from "../../models/schemas/guildUserSchema";
import Services from "../../services/services";

/**
 * Maps all raid-related endpoints. endpoint: .../guilds/raids.
 */
const raidRouter = Router();

raidRouter.get("/:wynnGuildId", async (request: GuildRequest, response: DefaultResponse<IRaid[]>) => {
    response.send(await Services.raid.getRaids(request.params.wynnGuildId));
});

raidRouter.get(
    "/rewards/:wynnGuildId",
    async (request: GuildRequest, response: DefaultResponse<IRaidRewardsResponse[]>) => {
        response.send(await Services.raid.getRewards(request.params.wynnGuildId));
    },
);

raidRouter.post(
    "/rewards/:wynnGuildId",
    validateAdminJwtToken,
    async (
        request: GuildRequest<{}, {}, { mcUsername: string; aspects?: number; emeralds?: number }>,
        response: DefaultResponse<IGuildUser>,
    ) => {
        response.send(
            await Services.raid.updateRewards(
                await usernameToUuid(request.body.mcUsername),
                request.params.wynnGuildId,
                request.body.aspects,
                request.body.emeralds,
            ),
        );
    },
);

raidRouter.get(
    "/rewards/:wynnGuildId/:mcUsername",
    async (request: GuildRequest<{ mcUsername: string }>, response: DefaultResponse<IRaidRewardsResponse>) => {
        response.send(
            await Services.raid.getUserRewards(
                { mcUuid: await usernameToUuid(request.params.mcUsername) },
                request.params.wynnGuildId,
            ),
        );
    },
);

raidRouter.get(
    "/leaderboard/:wynnGuildId",
    async (request: GuildRequest, response: DefaultResponse<ILeaderboardUser[]>) => {
        response.send(await Services.raid.getRaidsLeaderboard(request.params.wynnGuildId));
    },
);

export default raidRouter;
