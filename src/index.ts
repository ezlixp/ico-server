import mongoose, { connect } from "mongoose";
import "./config";
import "./sockets/discord";
import { registerMessageIndexes } from "./sockets/discord";
import { GuildDatabaseCreator } from "./services/guild/guildDatabaseCreator";
import { server } from "./socket";

mongoose.Schema.Types.String.checkRequired((v) => typeof v === "string");

process.on("SIGTERM", async () => {
    console.log("shutting down...");
    server.close();
    await mongoose.disconnect();
    process.exit(0);
});
// Connect to database
try {
    const dbUrl = process.env.DB_URL;
    connect(dbUrl, { retryWrites: true, writeConcern: { w: "majority" } }).then(() => {
        const databaseCreator = GuildDatabaseCreator.create();
        databaseCreator.registerDatabases().then(() => {
            registerMessageIndexes();
            const PORT = process.env.PORT || 3000;

            server.listen(PORT, () => {
                console.log(`Server is running on port ${PORT}`);
            });
        });
    });
} catch (error) {
    console.error("Failed to connect to database:", error);
}

