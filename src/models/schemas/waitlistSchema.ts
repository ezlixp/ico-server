import { Schema } from "mongoose";
import { BaseModel } from "../entities/baseModel";

export interface IWaitlist extends BaseModel {
    mcUsername: string;
    dateAdded: Date;
}

const waitlistSchema: Schema<IWaitlist> = new Schema(
    {
        mcUsername: { type: String, required: true },
        dateAdded: { type: Date, required: true, default: Date.now },
    },
    { collation: { locale: "en", strength: 2 } },
);

export default waitlistSchema;
