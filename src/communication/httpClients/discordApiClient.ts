interface IDiscordTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

interface IDiscordUser {
    id: string;
    username: string;
    discriminator?: string;
    global_name: string | null;
    avatar: string | null;
    bot?: boolean;
    system?: boolean;
    mfa_enabled?: boolean;
    banner?: string | null;
    accent_color?: number | null;
    locale?: string;
    verified?: boolean;
    email?: string | null;
    flags?: number;
    premium_type?: number;
    public_flags?: number;
}

export async function getToken(code: string): Promise<IDiscordTokenResponse | null> {
    console.log("fetching discord token");
    const data = {
        grant_type: "authorization_code",
        code: code,
        redirect_uri: "http://localhost:24242/callback/",
    };
    const CLIENT_ID = process.env.BOT_CLIENT_ID;
    const CLIENT_SECRET = process.env.BOT_CLIENT_SECRET;
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
    const res = await fetch("https://discord.com/api/v10/oauth2/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${credentials}`,
        },
        body: new URLSearchParams(data).toString(),
    });
    if (res.ok) return await res.json();
    else {
        console.warn(res.body, res.headers, "could not get discord token");
        return null;
    }
}

export async function getUser(token: string): Promise<IDiscordUser | null> {
    const res = await fetch("https://discord.com/api/v10/users/@me", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (res.ok) return await res.json();
    else return null;
}
