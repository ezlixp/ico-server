import jwt, { JwtPayload } from "jsonwebtoken";
import "../config";
import { Response, NextFunction, Request } from "express";
import { ValidationError } from "../errors/implementations/validationError";
import { TokenErrors } from "../errors/messages/tokenErrors";
import Services from "../services/services";

// Needs to match the token in the generator. Store it in a .env or .json for reusability.
const secretKey = process.env.JWT_SECRET_KEY as string;

/**
 * Checks if the token provided in the request's headers is valid.
 * If token is invalid, return status code 401 with an error message,
 * else, return void.
 */
function validateJwtToken(
    request: Request<{ wynnGuildId?: string; mcUuid?: string; discordUuid?: string }>,
    response: Response,
    next: NextFunction
) {
    const authorizationHeader = request.headers["authorization"] as string | undefined;

    if (!authorizationHeader) {
        throw new ValidationError(TokenErrors.NO_TOKEN);
    }

    // Get authorization headers and extract token from "Bearer <token>"
    const token = authorizationHeader.split(" ")[1];

    jwt.verify(token, secretKey, async (err, payload) => {
        if (err) {
            throw new ValidationError(TokenErrors.INVALID_TOKEN);
        }

        const p = payload! as JwtPayload;
        if (!p.guildId) {
            throw new ValidationError(TokenErrors.INVALID_TOKEN);
        }
        if (p.guildId !== "*" && request.params.wynnGuildId && p.guildId !== request.params.wynnGuildId) {
            throw new ValidationError(TokenErrors.UNPRIVILEGED_TOKEN);
        }
        if (p.guildId !== "*" && (request.params.discordUuid || request.params.mcUuid)) {
            const discordUuid =
                request.params.discordUuid ||
                (await Services.user.getUser({ mcUuid: request.params.mcUuid?.replaceAll("-", "") })).discordUuid;
            if (request.params.discordUuid && discordUuid !== p.discordUuid) {
                throw new ValidationError(TokenErrors.UNPRIVILEGED_TOKEN);
            }
        }
        next(); // Goes to next step (function execution)
    });
}

export default validateJwtToken;

