import { Request, Router } from "express";
import { JwtTokenHandler } from "../security/jwtHandler";
import { DefaultResponse } from "../communication/responses/defaultResponse";
import { getToken, getUser } from "../communication/httpClients/discordApiClient";
import { ValidationError } from "../errors/implementations/validationError";
import { getPlayersGuildAsync } from "../communication/httpClients/wynncraftApiClient";
import { TokenResponse } from "../communication/responses/tokenResponse";
import { TokenErrors } from "../errors/messages/tokenErrors";
import { usernameToUuid } from "../communication/httpClients/mojangApiClient";

/**
 * Maps all authentication-related endpoints. endpoint: .../auth/
 */
const authenticationRouter = Router({ mergeParams: true });
const tokenHandler = JwtTokenHandler.create();

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
        throw new ValidationError("Invalid body.");
    }

    const maybe = request.body as Record<string, unknown>;

    if (typeof maybe.code !== "string") {
        throw new ValidationError("No code provided.");
    }

    if (typeof maybe.mcUsername !== "string") {
        throw new ValidationError("No minecraft account provided.");
    }
};

const refreshRequestValidator: (request: Request<unknown>) => asserts request is Request<{}, {}, IRefreshRequest> = (
    request
) => {
    if (typeof request !== "object" || request.body === null) {
        throw new ValidationError("Invalid body.");
    }

    const maybe = request.body as Record<string, unknown>;

    if (typeof maybe.refreshToken !== "string") {
        throw new ValidationError(TokenErrors.NO_REFRESH);
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
    return response.send(
        await tokenHandler.generateToken(
            discordUser.id,
            await getPlayersGuildAsync(mcUsername),
            await usernameToUuid(mcUsername)
        )
    );
};

const refreshToken = async (request: Request<{}, {}, IRefreshRequest>, response: DefaultResponse<TokenResponse>) => {
    return response.send(await tokenHandler.refreshToken(request.body.refreshToken));
};

authenticationRouter.post(
    "/token",
    async (
        request: Request<{}, {}, { grantType: string } & (IAuthCodeRequest | IRefreshRequest)>,
        response: DefaultResponse
    ) => {
        const grant_type = request.body.grantType;
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

