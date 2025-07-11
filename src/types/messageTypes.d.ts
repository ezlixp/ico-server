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

export interface IDiscord2WynnMessage {
    Author: string;
    Content: string;
    WynnGuildId: string;
}

export interface IWynn2DiscordMessage {
    MessageType: number;
    HeaderContent?: string;
    TextContent: string;
    ListeningChannel: string;
}
