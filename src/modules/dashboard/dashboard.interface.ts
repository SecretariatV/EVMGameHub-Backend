import { Document } from "mongoose";

export declare interface IDashboardModel extends Document {
  revenueType: number;
  token: string;
  lastBalance: number;
  insertDate?: Date;
}
