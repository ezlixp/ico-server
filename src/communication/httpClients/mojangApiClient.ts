import { HttpClientError } from "../../errors/implementations/httpClientError";
import Services from "../../services/services";

/** Caches username to UUID conversions from Mojang api.*/
const usernameUuidMap: { [key: string]: { uuid: string; timestamp: number } } = {};

/** Caches UUID to username conversions from Mojang api.*/
const uuidUsernameMap: {
    [key: string]: { username: string; timestamp: number };
} = {};

export interface IBulkResponse {
    translation: Record<string, string>;
    status: boolean;
}
interface IProfile {
    raw_id: string;
    username: string;
}

const TIME_DELTA = 1.728e9;

async function getProfile(key: string): Promise<IProfile> {
    const url = `https://playerdb.co/api/player/minecraft/${key}`;
    const apiResponse = await fetch(url);
    try {
        const responseBody: IProfile = (await apiResponse.clone().json()).data.player;
        return responseBody;
    } catch (error) {
        throw new HttpClientError(
            `couldn't get profile for key: ${key} error: ${error} response: ${apiResponse.text()}`,
        );
    }
}

export async function usernameToUuid(username: string): Promise<string> {
    if (usernameUuidMap[username] && Date.now() - usernameUuidMap[username].timestamp < 1.728e9) {
        return usernameUuidMap[username].uuid;
    }

    const profile = await getProfile(username);
    usernameUuidMap[username] = {
        uuid: profile.raw_id,
        timestamp: Date.now(),
    };
    uuidUsernameMap[profile.raw_id] = { username: username, timestamp: Date.now() };
    const user = await Services.user.getUserByMcUuid(profile.raw_id);
    if (user) {
        user.cachedUsername = username;
        user.cAt = Date.now();
    }
    return profile.raw_id;
}

export async function bulkUsernameToUuid(usernames: string[]): Promise<IBulkResponse> {
    const groups: string[][] = []; // mojang bulk api only allows requests of up to 10 at a time so group into 10s
    let curgroup: string[] = [];
    const output: Record<string, string> = {};
    let status = true;
    usernames.forEach((username) => {
        if (usernameUuidMap[username] && Date.now() - usernameUuidMap[username].timestamp < TIME_DELTA) {
            output[username] = usernameUuidMap[username].uuid;
            return;
        }
        if (curgroup.length < 10) curgroup.push(username);
        else {
            groups.push(curgroup);
            curgroup = [];
        }
    });
    if (curgroup.length != 0) groups.push(curgroup);

    for (const group of groups) {
        try {
            const url = "https://api.minecraftservices.com/minecraft/profile/lookup/bulk/byname";
            const apiResponse = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(group),
            });
            const responseBody: { id: string; name: string }[] | { path: string; error: string; errorMessage: string } =
                await apiResponse.json();
            console.log(responseBody);
            if (!Array.isArray(responseBody))
                throw new HttpClientError(responseBody.error + ", " + responseBody.errorMessage);

            responseBody.forEach((profile) => {
                output[profile.name] = profile.id;
                uuidUsernameMap[profile.id] = {
                    username: profile.name,
                    timestamp: Date.now(),
                };
                usernameUuidMap[profile.name] = {
                    uuid: profile.id,
                    timestamp: Date.now(),
                };
            });
        } catch (error) {
            status = false;
            console.warn(`username to uuid conversion failed on group: ${group} with ${error}`);
        }
    }

    return { translation: output, status: status && Object.entries(output).length === usernames.length };
}

export async function uuidToUsername(uuid: string): Promise<string> {
    uuid = uuid.replaceAll("-", "");
    if (uuidUsernameMap[uuid] && Date.now() - uuidUsernameMap[uuid].timestamp < 1.728e9) {
        return uuidUsernameMap[uuid].username;
    }

    const profile = await getProfile(uuid);
    uuidUsernameMap[uuid] = {
        username: profile.username,
        timestamp: Date.now(),
    };
    usernameUuidMap[profile.username] = { uuid: uuid, timestamp: Date.now() };
    const user = await Services.user.getUserByMcUuid(uuid);
    if (user) {
        user.cachedUsername = profile.username;
        user.cAt = Date.now();
    }
    return profile.username;
}
