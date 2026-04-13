import jwt, { JwtPayload } from "jsonwebtoken";
import "../config";
import { TokenResponse } from "../communication/responses/tokenResponse";
import { TokenError } from "../errors/implementations/tokenError";
import { getUuidGuildAsync, IWynnGuild } from "../communication/httpClients/wynncraftApiClient";
import { ValidationError } from "../errors/implementations/validationError";
import { UserErrors } from "../errors/messages/userErrors";
import { HydratedDocument } from "mongoose";
import { IUser } from "../models/entities/userModel";
import { TokenErrors } from "../errors/messages/tokenErrors";
import Services from "../services/services";

export class JwtTokenHandler {
    private readonly secretKey: string;
    private readonly refreshKey: string;
    private readonly options: jwt.SignOptions;

    private constructor() {
        this.secretKey = process.env.JWT_SECRET_KEY!;
        this.refreshKey = process.env.JWT_REFRESH_SECRET_KEY!;
        this.options = { expiresIn: "12h" };
    }

    static create() {
        return new JwtTokenHandler();
    }

    async generateAdminToken() {
        return this.signJwtToken("!bot", "*");
    }

    async generateTestToken() {
        if (process.env.NODE_ENV !== "test")
            throw new Error("Do not use this function outside of a testing environment.");
        return this.signJwtToken("1234", "testguilduuid");
    }

    async refreshToken(refreshToken: string): Promise<TokenResponse> {
        try {
            const payload = jwt.verify(refreshToken, this.refreshKey);
            const p = payload! as JwtPayload;
            if (!p.discordUuid) throw new ValidationError(TokenErrors.INVALID_REFRESH);

            if (p.discordUuid === "!bot" && p.guildUuid === "*") {
                return await this.generateAdminToken();
            }

            const user = await Services.user.getUser({
                discordUuid: p.discordUuid,
            });

            if (user.refreshToken !== refreshToken) {
                throw new ValidationError(TokenErrors.INVALID_REFRESH);
            }
            return await this.generateToken(user.discordUuid, await getUuidGuildAsync(user.mcUuid));
        } catch (err) {
            throw new ValidationError(TokenErrors.INVALID_REFRESH);
        }
    }

    async generateToken(discordUuid: string, wynnGuildId: IWynnGuild | null, mcUuid?: string): Promise<TokenResponse> {
        const user = await Services.user.getUser({ discordUuid: discordUuid }).catch((err) => {
            console.warn("gen token user find error:", err);
            return null;
        });

        this.validateGuild(wynnGuildId);
        this.validateAccount(user, mcUuid);
        const tokenRes = this.signJwtToken(discordUuid, wynnGuildId.uuid);
        user.refreshToken = tokenRes.refreshToken!;
        user.save();
        return tokenRes;
    }

    private validateGuild(wynnGuildId: IWynnGuild | null): asserts wynnGuildId is IWynnGuild {
        if (!wynnGuildId) throw new TokenError();
    }

    private validateAccount(
        user: HydratedDocument<IUser> | null,
        mcUuid?: string,
    ): asserts user is HydratedDocument<IUser> {
        if (!user || (mcUuid && mcUuid !== user.mcUuid)) throw new ValidationError(UserErrors.NOT_LINKED);
        if (user.banned) throw new ValidationError(UserErrors.BANNED);
    }

    private signJwtToken(discordUuid: string, guildId: string): TokenResponse {
        let response: TokenResponse;

        const jwtToken = jwt.sign({ discordUuid: discordUuid, guildId: guildId }, this.secretKey, this.options);
        const refreshToken = jwt.sign({ discordUuid: discordUuid }, this.refreshKey, {
            expiresIn: "7d",
        });

        response = new TokenResponse(jwtToken, refreshToken);
        return response;
    }
}
