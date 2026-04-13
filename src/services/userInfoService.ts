import { IUser } from "../models/entities/userModel";
import { NotFoundError } from "../errors/implementations/notFoundError";
import { UserErrors } from "../errors/messages/userErrors";
import { ValidationError } from "../errors/implementations/validationError";
import { FilterQuery, HydratedDocument } from "mongoose";
import { UserRepository } from "../repositories/userRepository";
import { MissingFieldError } from "../errors/implementations/missingFieldError";
import { AppError } from "../errors/base/appError";

export class UserInfoService {
    private readonly validator: UserInfoServiceValidator;
    private readonly repository: UserRepository;

    private constructor() {
        this.validator = new UserInfoServiceValidator();
        this.repository = new UserRepository();
    }

    static create(): UserInfoService {
        return new UserInfoService();
    }

    async getUser(options: FilterQuery<IUser>): Promise<HydratedDocument<IUser>> {
        const user = await this.repository.findOne(options, undefined, undefined, UserErrors.NOT_FOUND);

        return user;
    }

    async getUserByDiscord(discordUuid: string): Promise<HydratedDocument<IUser> | null> {
        try {
            const user = await this.getUser({ discordUuid: discordUuid });
            return user;
        } catch (err) {
            if (err instanceof AppError && err.message === UserErrors.NOT_FOUND) return null;
            throw err;
        }
    }

    async getUserByMcUuid(mcUuid: string): Promise<HydratedDocument<IUser> | null> {
        try {
            const user = await this.getUser({ mcUuid: mcUuid });
            return user;
        } catch (err) {
            if (err instanceof AppError && err.message === UserErrors.NOT_FOUND) return null;
            throw err;
        }
    }

    async linkUser(options: FilterQuery<IUser>): Promise<HydratedDocument<IUser>> {
        this.validator.validateLinkUser(options);

        const user = await this.repository.find({ mcUuid: options.mcUuid });
        this.validator.validateGetEmpty(user);

        const get = await this.repository.findOneEmpty({
            discordUuid: options.discordUuid,
        });
        this.validator.validateNewLink(get);

        return this.repository.updateWithUpsert({ discordUuid: options.discordUuid }, options);
    }

    async updateUser(filter: FilterQuery<IUser>, update: FilterQuery<IUser>): Promise<HydratedDocument<IUser>> {
        const user = await this.getUser(filter);
        return await this.repository.updateById(user._id, update);
    }

    async getBlockedList(userId: FilterQuery<IUser>): Promise<string[]> {
        const user = await this.getUser(userId);

        return user.blocked;
    }

    async addToBlockedList(userId: FilterQuery<IUser>, toBlock: string): Promise<IUser> {
        const user = await this.getUser(userId);
        this.validator.validateAddToBlockedList(user, toBlock);

        user.blocked.push(toBlock);

        return await user.save();
    }

    async removeFromBlockedList(userId: FilterQuery<IUser>, toRemove: string): Promise<IUser> {
        const user = await this.getUser(userId);
        this.validator.validateRemoveFromBlockedList(user, toRemove);

        user.blocked = user.blocked.filter((blockedUser) => blockedUser !== toRemove);

        return await user.save();
    }
}

class UserInfoServiceValidator {
    validateGetEmpty(user: IUser[]) {
        if (user.length !== 0) {
            throw new ValidationError(UserErrors.MC_ALREADY_LINKED);
        }
    }

    validateNewLink(
        user: HydratedDocument<IUser> | null,
    ): asserts user is null | (HydratedDocument<IUser> & { mcUuid: "" }) {
        if (user !== null && user.mcUuid !== "") throw new ValidationError(UserErrors.DC_ALREADY_LINKED);
    }

    validateLinkUser(options: FilterQuery<IUser>): asserts options is IUser {
        if (!options.discordUuid) {
            throw new MissingFieldError("discordUuid", typeof "");
        }
        if (!options.mcUuid) {
            throw new MissingFieldError("mcUsername", typeof "");
        }
    }

    validateAddToBlockedList(user: IUser, toBlock: string) {
        if (user.blocked.length >= 60) {
            throw new ValidationError(UserErrors.FULL_BLOCKED_LIST);
        }
        if (user.blocked.includes(toBlock)) {
            throw new ValidationError(UserErrors.ALREADY_IN_BLOCKED_LIST);
        }
        if (!toBlock) throw new MissingFieldError("toBlock", typeof "");
    }

    validateRemoveFromBlockedList(user: IUser, toRemove: string) {
        if (!user.blocked.includes(toRemove)) {
            throw new NotFoundError(UserErrors.NOT_IN_BLOCKED_LIST);
        }
    }
}
