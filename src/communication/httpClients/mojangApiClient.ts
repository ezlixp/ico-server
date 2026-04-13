import { HttpClientError } from "../../errors/implementations/httpClientError";

/** Caches username to UUID conversions from Mojang api.*/
const usernameUuidMap: { [key: string]: { uuid: string; timestamp: number } } = {};

/** Caches UUID to username conversions from Mojang api.*/
const uuidUsernameMap: {
    [key: string]: { username: string; timestamp: number };
} = {};

export async function usernameToUuid(username: string): Promise<string> {
    if (usernameUuidMap[username] && Date.now() - usernameUuidMap[username].timestamp < 1.728e9) {
        return usernameUuidMap[username].uuid;
    }

    const url = `https://api.minecraftservices.com/minecraft/profile/lookup/name/${username}`;
    const apiResponse = await fetch(url);

    if (!apiResponse.body) {
        throw new HttpClientError("empty mojang username to uuid response");
    }

    const responseBody: { id: string; errorMessage: string } = await apiResponse.json();

    if (responseBody.errorMessage) {
        throw new HttpClientError(responseBody.errorMessage);
    }

    uuidUsernameMap[responseBody.id] = {
        username: username,
        timestamp: Date.now(),
    };
    usernameUuidMap[username] = {
        uuid: responseBody.id,
        timestamp: Date.now(),
    };
    return responseBody.id;
}

export async function uuidToUsername(uuid: string): Promise<string> {
    uuid = uuid.replaceAll("-", "");
    if (uuidUsernameMap[uuid] && Date.now() - uuidUsernameMap[uuid].timestamp < 1.728e9) {
        return uuidUsernameMap[uuid].username;
    }

    const url = `https://api.minecraftservices.com/minecraft/profile/lookup/${uuid}`;
    const apiResponse = await fetch(url);

    if (!apiResponse.body) {
        throw new HttpClientError("empty mojang uuid to username response");
    }

    const responseBody: { name: string; errorMessage: string } = await apiResponse.json();

    if (responseBody.errorMessage) {
        throw new HttpClientError(responseBody.errorMessage);
    }

    uuidUsernameMap[uuid] = {
        username: responseBody.name,
        timestamp: Date.now(),
    };
    usernameUuidMap[responseBody.name] = { uuid: uuid, timestamp: Date.now() };
    return responseBody.name;
}
