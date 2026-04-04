import { Express, NextFunction, Request, Response, Router } from "express";
import statusRouter from "./routes/status";
import healthRouter from "./routes/healthCheck";
import adminRouter from "./routes/admin";
import modVersionRouter from "./routes/modVersion";
import userInfoRouter from "./routes/userInfo";
import infoRouter from "./routes/guildInfo";
import authenticationRouter from "./routes/authentication";
import { API_VERSION } from "./config";
import guildRouter from "./routes/guild/base";
import { NotFoundError } from "./errors/implementations/notFoundError";
import { WrongVersionError } from "./errors/implementations/wrongVersionError";

export const mapEndpoints = (app: Express) => {
    const baseRouter = Router();

    baseRouter.use("/", statusRouter);
    baseRouter.use("/healthz", healthRouter);

    baseRouter.use(`/auth`, authenticationRouter);
    baseRouter.use("/admin", adminRouter);
    baseRouter.use(`/mod`, modVersionRouter);

    baseRouter.use(`/user`, userInfoRouter);
    baseRouter.use(`/config`, infoRouter);
    baseRouter.use(`/guilds`, guildRouter);

    const versionRouter = Router();

    versionRouter.use(
        `/:version`,
        (request: Request<{ version: string }>, response: Response, next: NextFunction) => {
            if (request.params.version !== API_VERSION) throw new WrongVersionError();
            next();
        },
        baseRouter,
    );

    app.use("/api", versionRouter);

    // Catch all for incorrect routes
    app.all("*extra", (request: Request) => {
        throw new NotFoundError(`Could not ${request.method} ${request.path}`);
    });
};

