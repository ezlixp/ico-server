import jwt, { JwtPayload } from "jsonwebtoken";
import { ExtendedError, Socket } from "socket.io";
import "../../config";
import Services from "../../services/services";
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "../../types/socketIOTypes";

// Needs to match the token in the generator. Store it in a .env or .json for reusability.
const secretKey = process.env.JWT_SECRET_KEY!;

/**
 * Checks if the token provided in a socket's initial connection is valid.
 * If token is invalid, return an error which will fire the "connection_error"
 * event on the socket client.
 */
function validateSocket(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    next: (err?: ExtendedError) => void,
) {
    const authorizationHeader = socket.handshake.headers.authorization as string;

    if (!authorizationHeader) {
        console.log(`A websocket connection from ${socket.handshake.headers.from} was blocked`);
        return next(new Error("No token provided."));
    }

    // Get authorization headers and extract token from "Bearer <token>"
    const token = authorizationHeader.split(" ")[1];
    jwt.verify(token, secretKey, async (err, payload) => {
        if (err) {
            console.log(`A websocket connection from ${socket.handshake.headers.from} was blocked ${err}`);
            return next(new Error("Invalid token provided."));
        }
        socket.data.username = socket.handshake.headers.from || "!bot";
        socket.data.modVersion = socket.handshake.headers["user-agent"]!;
        if (!payload) {
            return next(new Error("Invalid token provided."));
        }
        const p = payload as JwtPayload;
        socket.data.wynnGuildId = p.guildId;
        socket.data.discordUuid = p.discordUuid;
        socket.data.muted = false;
        if (p.discordUuid !== "!bot") {
            try {
                const user = await Services.user.getUserByDiscord(p.discordUuid);
                if (!user) throw new Error();
                if (user.banned) {
                    return next(new Error("You are banned."));
                }
                const isMuted = await Services.guildInfo.isUserMuted(socket.data.wynnGuildId, socket.data.discordUuid);
                socket.data.muted = isMuted;
                socket.data.onlineStatus = user.onlineStatus;
            } catch (err) {
                return next(new Error("Something went wrong."));
            }
        }

        // Goes to next step (function execution)
        return next();
    });
}

export default validateSocket;
