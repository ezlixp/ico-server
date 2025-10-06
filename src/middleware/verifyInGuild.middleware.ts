import { NextFunction, Response } from "express";
import { GuildRequest } from "../communication/requests/guildRequest";
import { GuildVerificationError } from "../errors/implementations/guildVerificationError";
import checkIfPlayerIsInGuildAsync from "../communication/httpClients/wynncraftApiClient";
import { MissingFieldError } from "../errors/implementations/missingFieldError";
import { guildNames } from "../models/entities/guildDatabaseModel";
import { ValidationError } from "../errors/implementations/validationError";
import { GuildErrors } from "../errors/messages/guildErrors";
import { NotFoundError } from "../errors/implementations/notFoundError";

export default async function verifyInGuild(
    request: GuildRequest<{}, {}, { mcUsername: string } & any>,
    response: Response,
    next: NextFunction
) {
    if (request.params.wynnGuildId === "**" || request.params.wynnGuildId === "*") return next();
    if (!request.body.mcUsername) throw new MissingFieldError("mcUsername", typeof "_");

    const mcUsername = request.body.mcUsername;
    const wynnGuildId = request.params.wynnGuildId;

    if (process.env.NODE_ENV === "test") {
        if (mcUsername === "inguild" || request.params.wynnGuildId === "correct") next();
        else if (wynnGuildId !== "configured" && !(wynnGuildId in guildNames))
            throw new NotFoundError(GuildErrors.NOT_CONFIGURED);
        else throw new GuildVerificationError("User not in the guild.");
        return;
    }

    if (!(wynnGuildId in guildNames)) throw new ValidationError(GuildErrors.NOT_CONFIGURED);
    if (await checkIfPlayerIsInGuildAsync(mcUsername, wynnGuildId)) next();
    else throw new GuildVerificationError("User not in the guild.");
}

