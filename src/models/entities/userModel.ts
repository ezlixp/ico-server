import mongoose, { Model, Schema } from "mongoose";
import { BaseModel } from "./baseModel";

export interface IUser extends BaseModel {
    discordUuid: string;
    mcUuid: string;
    blocked: string[];
    banned: boolean;
    verified: boolean;
    status: number; // 0 is online, 1 is idle (not implemented), 2 is dnd (not implemented), 3 is appear offline
    refreshToken: string;
}

const userSchema: Schema<IUser> = new Schema(
    {
        // can be verified to be owned by the person who created the user object
        discordUuid: { type: String, required: true },
        // can be forged
        mcUuid: { type: String },
        blocked: {
            type: [String],
            required: true,
            validate: {
                validator: function (arr) {
                    return (
                        Array.isArray(arr) &&
                        arr.every((item) => typeof item === "string" && item !== null && item.length !== 0)
                    );
                },
            },
            default: [],
        },
        banned: { type: Boolean, required: true, default: false },
        status: {
            type: Number,
            rqeuired: true,
            validate: {
                validator: function (stat) {
                    return Number.isInteger(stat) && stat >= 0 && stat <= 3;
                },
            },
            default: 0,
        },
        refreshToken: { type: String, required: true, default: "none" },
    },
    {
        collation: { locale: "en", strength: 2 },
    }
);

const UserModel: Model<IUser> = mongoose.model("User", userSchema);

export default UserModel;

