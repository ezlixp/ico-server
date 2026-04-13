import { Schema } from "mongoose";
import { BaseModel } from "../entities/baseModel";

export interface IRaid extends BaseModel {
    users: string[];
    raid: string;
    timestamp: number;
}

export interface IRaidRewardsResponse {
    mcUsername: string;
    raids: number;
    aspects: number;
    liquidEmeralds: number;
}

export interface ILeaderboardUser {
    mcUsername: string;
    raids: number;
}

const raidSchema: Schema<IRaid> = new Schema({
    users: { type: [String], required: true },
    raid: { type: String, required: true },
    timestamp: { type: Number, required: true, default: Date.now },
});

export default raidSchema;
