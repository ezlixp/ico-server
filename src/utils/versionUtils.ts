/**
 * Defines the minimum allowed mod version in the format:
 * [major, minor, revision, beta]
 */
const minimumModVersion = [1, 1, 0, 20];
const versionExtractorPattern = new RegExp(
    "guildapi/(?<major>\\d+).(?<minor>\\d+).(?<revision>\\d+)(-beta.(?<beta>\\d+))?"
);

export interface IModVersionResponse {
    versionNumber: string;
    download: string;
}

export function checkVersion(versionString: string | undefined): boolean {
    if (!versionString) return false;
    const matcher = versionExtractorPattern.exec(versionString);
    if (!matcher) {
        console.log("malformed mod version received", versionString);
        return false;
    }
    const version = [
        parseInt(matcher.groups!.major),
        parseInt(matcher.groups!.minor),
        parseInt(matcher.groups!.revision),
        matcher.groups!.beta ? parseInt(matcher.groups!.beta) : 999999999,
    ];
    for (let i = 0; i < 4; ++i) {
        if (version[i] != minimumModVersion[i]) return version[i] > minimumModVersion[i];
    }
    return true;
}

export async function getLatestVersion(): Promise<IModVersionResponse | null> {
    const url = "https://api.modrinth.com/v2/project/guild-api/version";
    try {
        const response = await fetch(url);
        const res = await response.json();
        return { versionNumber: res[0].version_number, download: res[0].files[0].url };
    } catch (error) {
        console.error("get version error:", error);
    }
    return null;
}

