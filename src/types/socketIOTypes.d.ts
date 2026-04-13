import { IB2SDiscord2WynnMessage, IS2CDiscord2WynnMessage, IWynn2DiscordMessage } from "./messageTypes";

export interface ServerToClientEvents {
    wynnMessage: (message: IWynn2DiscordMessage) => void;
    wynnMirror: (message: string) => void;
    discordMessage: (message: IS2CDiscord2WynnMessage) => void;
    error: (error: string) => void;
}

export interface ClientToServerEvents {
    wynnMessage: (message: string) => void;
    hrMessage: (MessageChannel: string) => void;
    discordOnlyWynnMessage: (message: string) => void;
    discordMessage: (message: IB2SDiscord2WynnMessage) => void;
    onlineStatus: (newStatus: number) => void;
    listOnline: (callback: (users: string[]) => void) => void;
    sync: (ack: () => void) => void;
}

export interface InterServerEvents {
    ping: () => void;
}

export interface SocketData {
    messageIndex: number;
    hrMessageIndex: number;
    onlineStatus: number;
    wynnGuildId: string;
    username: string;
    modVersion: string;
    discordUuid: string;
    muted: boolean;
}
