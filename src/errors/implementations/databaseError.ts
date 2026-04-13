import { AppError } from "../base/appError";

export class DatabaseError extends AppError {
    constructor(debugInfo?: any) {
        super("An error has occurred while performing database actions.", 500, debugInfo);
    }
}
