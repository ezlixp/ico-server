import { API_VERSION } from "../../config";
import { AppError } from "../base/appError";

/** code 301 */
export class WrongVersionError extends AppError {
    constructor() {
        super(`Please use /api/${API_VERSION}`, 301);
    }
}
