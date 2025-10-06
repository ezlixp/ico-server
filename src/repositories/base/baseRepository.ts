import { BaseModel } from "../../models/entities/baseModel";
import { FilterQuery, HydratedDocument, Model, ProjectionType, QueryOptions, Types, UpdateQuery } from "mongoose";
import { DatabaseError } from "../../errors/implementations/databaseError";
import { NotFoundError } from "../../errors/implementations/notFoundError";
import { AppError } from "../../errors/base/appError";

export interface IRepository<T> {
    findOne(
        filter: FilterQuery<T>,
        projection?: ProjectionType<T>,
        options?: QueryOptions<T>,
        notFoundMessage?: string
    ): Promise<HydratedDocument<T>>;

    findOneEmpty(
        filter: FilterQuery<T>,
        projection?: ProjectionType<T>,
        options?: QueryOptions<T>
    ): Promise<HydratedDocument<T> | null>;

    find(
        filter: FilterQuery<T>,
        projection?: ProjectionType<T>,
        options?: QueryOptions<T>
    ): Promise<HydratedDocument<T>[]>;

    create(data: Partial<T>): Promise<HydratedDocument<T>>;

    updateWithUpsert(options: FilterQuery<T>, data: UpdateQuery<T>): Promise<HydratedDocument<T>>;

    deleteOne(options: FilterQuery<T>): Promise<HydratedDocument<T> | null>;
}

export abstract class BaseRepository<T extends BaseModel> implements IRepository<T> {
    protected constructor(private model: Model<T>) {}

    /**
     * @param filter search filter
     * @param projection projection of result
     * @param options search options
     * @param notFoundMessage error message if search filter returns no matches
     * @returns found object
     * @throws {NotFoundError, DatabaseError}
     */
    async findOne(
        filter: FilterQuery<T> = {},
        projection?: ProjectionType<T>,
        options?: QueryOptions<T>,
        notFoundMessage?: string
    ): Promise<HydratedDocument<T>> {
        try {
            const out = await this.model.findOne(filter, projection, options).exec();
            if (!out) throw new NotFoundError(notFoundMessage || "Selected resource could not be found.");
            return out;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new DatabaseError();
        }
    }

    /**
     * @param filter search filter
     * @param projection projection of result
     * @param options search options
     * @returns found object or null if not found
     */
    async findOneEmpty(
        filter: FilterQuery<T> = {},
        projection?: ProjectionType<T>,
        options?: QueryOptions<T>
    ): Promise<HydratedDocument<T> | null> {
        try {
            return await this.model.findOne(filter, projection, options).exec();
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new DatabaseError();
        }
    }

    async find(
        filter: FilterQuery<T>,
        projection?: ProjectionType<T>,
        options?: QueryOptions<T>
    ): Promise<HydratedDocument<T>[]> {
        try {
            return await this.model.find(filter, projection, options).exec();
        } catch (err) {
            throw new DatabaseError();
        }
    }

    async create(data: Partial<T>): Promise<HydratedDocument<T>> {
        try {
            const createdEntity = new this.model(data);
            return await createdEntity.save();
        } catch (err) {
            throw new DatabaseError();
        }
    }

    // upsert is necessary for rewardUtils.ts
    async updateWithUpsert(options: FilterQuery<T>, data: UpdateQuery<T>): Promise<HydratedDocument<T>> {
        try {
            const out = await this.model
                .findOneAndUpdate(options, data, {
                    upsert: true,
                    new: true,
                    collation: { locale: "en", strength: 2 },
                    runValidators: true,
                    context: "query",
                })
                .exec();
            return out;
        } catch (err) {
            throw new DatabaseError();
        }
    }

    async updateById(id: string | Types.ObjectId, update: UpdateQuery<T>): Promise<HydratedDocument<T>> {
        try {
            const document = await this.model
                .findByIdAndUpdate(id, update, {
                    new: true,
                    collation: { locale: "en", strength: 2 },
                    runValidators: true,
                    context: "query",
                })
                .exec();
            if (!document) throw new DatabaseError();
            return document;
        } catch (err) {
            throw new DatabaseError();
        }
    }

    async update(
        options: FilterQuery<T>,
        data: UpdateQuery<T>,
        notFoundMessage?: string
    ): Promise<HydratedDocument<T>> {
        try {
            const out = await this.model
                .findOneAndUpdate(options, data, {
                    new: true,
                    collation: { locale: "en", strength: 2 },
                    runValidators: true,
                    context: "query",
                })
                .exec();
            if (!out) throw new NotFoundError(notFoundMessage || "Could not find selected resource.");
            return out;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new DatabaseError();
        }
    }

    async deleteOne(options: FilterQuery<T>): Promise<HydratedDocument<T> | null> {
        try {
            return await this.model.findOneAndDelete(options).exec();
        } catch (err) {
            throw new DatabaseError();
        }
    }
}

