import path from "path";
import dotenv from "dotenv";

const envFile: string = ".env." + process.env.NODE_ENV;
export const API_VERSION = "v3";

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export default dotenv;

