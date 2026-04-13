import { ErrorRequestHandler } from "express";
import { AppError } from "../errors/base/appError";
import { ErrorResponse, HttpErrorResponse } from "../communication/responses/errorResponse";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    if (res.headersSent) next(err);
    if (process.env.NODE_ENV !== "test") console.warn("error from route:", req.originalUrl, "method:", req.method);
    if (err instanceof AppError) {
        if (process.env.NODE_ENV !== "test") {
            console.error(err.statusCode, err.message);
            console.warn("DEBUG:", err.debugInfo);
        }
        res.status(err.statusCode).send(ErrorResponse.createWithError(err));
    } else {
        console.error("Unexpected error:", err);

        res.status(500).send(HttpErrorResponse.InternalServerError);
    }
};
