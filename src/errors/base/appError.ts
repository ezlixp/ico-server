export abstract class AppError extends Error {
    statusCode: number;
    debugInfo: any;

    constructor(message: string, statusCode: number, debugInfo?: any) {
        super(message);
        this.statusCode = statusCode;
        this.debugInfo = debugInfo;

        Object.setPrototypeOf(this, AppError.prototype);
    }
}

