import { MongoMemoryServer } from "mongodb-memory-server";
import * as mongoose from "mongoose";
import console from "console";
import supertest from "supertest";
import { server } from "../src/socket";
import { JwtTokenHandler } from "../src/security/jwtHandler";
import { GuildDatabaseCreator } from "../src/services/guild/guildDatabaseCreator";

// TODO use weak auth header and no auth header to test authenticated routes
// TODO test schema validation for each model in its own suite
mongoose.Schema.Types.String.checkRequired((v) => typeof v === "string");
export const request = supertest(server);
export const guildDatabaseCreator = GuildDatabaseCreator.create();
const jwtHandler = JwtTokenHandler.create();
export const authHeader = jwtHandler.generateAdminToken().then((res) => ({
    Authorization: "Bearer " + res.token!,
}));
export const weakAuthHeader = jwtHandler.generateTestToken().then((res) => ({
    Authorization: "Bearer " + res.token!,
}));

export default async function globalSetup() {
    console.log("\n\x1b[42mSetting up memory server.\x1b[0m");

    const instance = await MongoMemoryServer.create();
    const uri = instance.getUri();
    (global as any).__MONGOINSTANCE = instance;

    process.env.MONGO_URI = uri.slice(0, uri.lastIndexOf("/"));

    const conn = await mongoose.connect(process.env.MONGO_URI);
    await conn.connection.db?.dropDatabase();
    await mongoose.disconnect();
}
