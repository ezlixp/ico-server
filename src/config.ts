import path from "path";
import dotenv from "dotenv";

const envFile: string = ".env.development";
export const API_VERSION = "v3";

if (!process.env.DB_URL) dotenv.config({ path: path.resolve(process.cwd(), envFile) });

export default dotenv;

