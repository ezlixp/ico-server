import { Schema } from "mongoose";
import { BaseModel } from "../entities/baseModel";

export interface IGuildUser extends BaseModel {
    mcUuid: string;
    aspects: number;
    emeralds: number;
    raids: number;
}

// TODO: figure out how to make collation default without having to add it to each request
const guildUserSchema: Schema<IGuildUser> = new Schema(
    {
        mcUuid: { type: String, required: true },
        aspects: { type: Number, required: true, default: 0 },
        emeralds: { type: Number, required: true, default: 0 },
        raids: { type: Number, required: true, default: 0 },
    },
    { collation: { locale: "en", strength: 2 } },
);

export default guildUserSchema;
