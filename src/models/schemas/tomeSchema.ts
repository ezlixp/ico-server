import { Schema } from "mongoose";
import { BaseModel } from "../entities/baseModel";

export interface ITome extends BaseModel {
    mcUsername: string;
    dateAdded: Date;
}

const tomeSchema: Schema<ITome> = new Schema(
    {
        mcUsername: { type: String, required: true },
        dateAdded: { type: Date, required: true, default: Date.now },
    },
    { collation: { locale: "en", strength: 2 } },
);

export default tomeSchema;
