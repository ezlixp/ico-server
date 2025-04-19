﻿import { Request, Router } from "express";
import { JwtTokenHandler } from "../security/jwtHandler.js";
import { DefaultResponse } from "../communication/responses/defaultResponse.js";
import { getToken, getUser } from "../communication/httpClients/discordApiClient.js";
import { UserInfoService } from "../services/userInfoService.js";
import { ValidationError } from "../errors/implementations/validationError.js";
import { usernameToUuid } from "../communication/httpClients/mojangApiClient.js";
import { getPlayersGuildAsync } from "../communication/httpClients/wynncraftApiClient.js";
import { TokenResponse } from "../communication/responses/tokenResponse.js";
import { UserErrors } from "../errors/messages/userErrors.js";

/**
 * Maps all authentication-related endpoints. endpoint: .../auth/
 */
const authenticationRouter = Router({ mergeParams: true });
const tokenHandler = JwtTokenHandler.create();
const userInfoService = UserInfoService.create();

interface IAuthCodeRequest {
    code: string;
    mcUsername: string;
}

interface IRefreshRequest {
    refreshToken: string;
}

const authCodeRequestValidator: (request: Request<unknown>) => asserts request is Request<{}, {}, IAuthCodeRequest> = (
    request
) => {
    if (typeof request !== "object" || request.body === null) {
        throw new ValidationError("Invalid body");
    }

    const maybe = request.body as Record<string, unknown>;

    if (typeof maybe.code !== "string") {
        throw new ValidationError("No code provided");
    }

    if (typeof maybe.mcUsername !== "string") {
        throw new ValidationError("No minecraft account provided");
    }
};

const refreshRequestValidator: (request: Request<unknown>) => asserts request is Request<{}, {}, IRefreshRequest> = (
    request
) => {
    if (typeof request !== "object" || request.body === null) {
        throw new ValidationError("Invalid body");
    }

    const maybe = request.body as Record<string, unknown>;

    if (typeof maybe.refreshToken !== "string") {
        throw new ValidationError("No code provided");
    }
};

const authorizationCode = async (
    request: Request<{}, {}, IAuthCodeRequest>,
    response: DefaultResponse<TokenResponse>
) => {
    const code = request.body.code;
    if (code === process.env.JWT_VALIDATION_KEY) return response.send(await tokenHandler.generateAdminToken());

    const mcUsername = request.body.mcUsername;
    const discordToken = await getToken(code);
    if (!discordToken) throw new ValidationError("error validating discord account");

    const discordUser = await getUser(discordToken.access_token);

    if (!discordUser) throw new ValidationError("could not validate discord account");

    // Checks database to see if mc username is properly linked with logged in discord account
    try {
        const user = await userInfoService.getUser({ discordUuid: discordUser.id });
        if (user.mcUuid === (await usernameToUuid(mcUsername))) {
            user.verified = true;
            const tokenRes = await tokenHandler.generateToken(discordUser.id, await getPlayersGuildAsync(mcUsername));
            user.refreshToken = tokenRes.refreshToken!;
            user.save();
            return response.send(tokenRes);
        } else throw new ValidationError(UserErrors.NOT_LINKED);
    } catch (error) {
        throw new ValidationError(UserErrors.NOT_LINKED);
    }
};

const refreshToken = async (request: Request<{}, {}, IRefreshRequest>, response: DefaultResponse<TokenResponse>) => {
    return response.send(await tokenHandler.refreshToken(request.body.refreshToken));
};

authenticationRouter.post(
    "/get-token",
    async (
        request: Request<{}, {}, { grant_type: string } & (IAuthCodeRequest | IRefreshRequest)>,
        response: DefaultResponse
    ) => {
        const grant_type = request.body.grant_type;
        if (grant_type === "authorization_code") {
            authCodeRequestValidator(request);
            return authorizationCode(request, response);
        } else if (grant_type === "refresh_token") {
            refreshRequestValidator(request);
            return refreshToken(request, response);
        }
        throw new ValidationError("Invalid grant type");
    }
);

export default authenticationRouter;
