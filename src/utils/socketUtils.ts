import { OnlineStatus } from "../constants/onlineStatus";
import { io } from "../socket";

export interface IOnlineUser {
    Id: number;
    McUsername: string;
}
export async function getOnlineUsers(guildId: string): Promise<IOnlineUser[]> {
    const out: IOnlineUser[] = [];
    const sockets = await io.of("/discord").in(guildId).fetchSockets();
    sockets.forEach((socket) => {
        if (socket.data.username && socket.data.onlineStatus !== OnlineStatus.INVISIBLE)
            out.push({ Id: out.length, McUsername: socket.data.username });
    });
    return out;
}

export async function isOnline(username: string, guildId: string): Promise<boolean> {
    const users = await getOnlineUsers(guildId);
    return users.some((user) => user.McUsername === username);
}

export async function kickUser(discordUuid: string) {
    const sockets = await io.of("/discord").fetchSockets();
    sockets.forEach((socket) => {
        if (socket.data.discordUuid === discordUuid) socket.disconnect();
    });
}

export async function setMuteUser(discordUuid: string, muted: boolean) {
    const sockets = await io.of("/discord").fetchSockets();
    sockets.forEach((socket) => {
        if (socket.data.discordUuid === discordUuid) socket.data.muted = muted;
    });
}

