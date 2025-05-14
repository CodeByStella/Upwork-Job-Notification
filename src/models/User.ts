import UserType from "@/types/user";
import { getRndId } from "@/utils";
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  subscribed: {
    type: Date,
    default: new Date(0),
  },
  isTrial: {
    type: Boolean,
    default: false,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  isPremium: {
    type: Boolean,
    default: false,
  },
  searchUrl: {
    type: String,
    default: "",
  },
  referral: {
    type: String,
    default: getRndId,
  },
  invited_by: {
    type: String,
    default: "",
  },
  trialUsed: {
    type: Boolean,
    default: false,
  },
});

export default mongoose.model<Document & UserType>("User", UserSchema);
