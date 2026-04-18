import { AppError } from "../base/appError";

export class NotFoundError extends AppError {
    constructor(errorMessage: string, debugInfo?: string) {
        super(errorMessage, 404, debugInfo);
    }
}
