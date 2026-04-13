export class UserErrors {
    static NOT_FOUND = "User with the provided uuid was not found.";
    static NOT_LINKED = "Could not validate account linking.";
    static FULL_BLOCKED_LIST = "The blocked user list is currently full.";
    static ALREADY_IN_BLOCKED_LIST = "The provided user is already present on the blocked list.";
    static NOT_IN_BLOCKED_LIST = "The provided user is not present on the blocked list.";
    static MISSING_PARAMS = "Not enough information to link a user.";
    static MC_ALREADY_LINKED = "Provided minecraft account already linked.";
    static DC_ALREADY_LINKED = "Provided discord account already linked.";
    static BANNED = "You have been banned from accessing this resource.";
}
