export interface IWynnMessage {
    /**
     * Regex that this type of message should look like.
     */
    pattern: RegExp;
    /**
     * Message type to send to discord.
     * 0 - Chat message,
     * 1 - Info message,
     * 2 - Discord only message,
     * Make sure to include a "header" named group,
     * and a "content" named group in the regex if you didn't
     * specify a custom header or a custom message, respectively.
     */
    messageType: number;
    /**
     * A callback function to format a custom message based on the regex matcher.
     * @param matcher regex matcher from message pattern
     * @returns formatted message
     */
    customMessage?: (matcher: RegExpExecArray, guildId: string) => string;
    /**
     * Custom title text/author
     */
    customHeader?: string;
}

/** Bot to server */
export interface IB2SDiscord2WynnMessage {
    DiscordUsername: string;
    DiscordUuid: string;
    ReplyAuthor: string | null;
    ReplyContent: string | null;
    Content: string;
    WynnGuildId: string;
}

/** Server to mod clients */
export interface IS2CDiscord2WynnMessage {
    DiscordUsername: string;
    McUsername?: string;
    ReplyAuthor: string | null;
    ReplyContent: string | null;
    Content: string;
    WynnGuildId: string;
}

export interface IWynn2DiscordMessage {
    MessageType: number;
    // [0] = content, [1] = optional discord uuid
    HeaderContent?: [string, string?];
    TextContent: string;
    ListeningChannel: string;
}
