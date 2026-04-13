import { Router } from "express";
import onlineRouter from "./online";
import raidRouter from "./raids";
import tomeRouter from "./tomes";
import waitlistRouter from "./waitlist";
import { GuildRequest } from "../../communication/requests/guildRequest";
import { DefaultResponse } from "../../communication/responses/defaultResponse";
import { guildNames } from "../../models/entities/guildDatabaseModel";
import { NotFoundError } from "../../errors/implementations/notFoundError";

const guildRouter = Router({ mergeParams: true });

guildRouter.get("/:wynnGuildId", async (request: GuildRequest, response: DefaultResponse) => {
    const wynnGuildId = request.params.wynnGuildId;
    if (wynnGuildId in guildNames) {
        response.send({
            guildName: guildNames[wynnGuildId],
            guildId: wynnGuildId,
        });
        return;
    }
    throw new NotFoundError("Guild not found.");
});

// map extras
guildRouter.use("/online", onlineRouter);
guildRouter.use("/raids", raidRouter);
guildRouter.use("/tomes", tomeRouter);
guildRouter.use("/waitlist", waitlistRouter);

export default guildRouter;
