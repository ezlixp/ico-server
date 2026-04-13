import { Response } from "express";

export interface DefaultResponse<ResBody = {}> extends Response<
    { status: number; title: string; errorMessage: string } | ResBody
> {}

export interface ErrorResponse {
    status: number;
    title: string;
    errorMessage: string;
}
