import JobType from "@/types/job";
import mongoose from "mongoose";

const JobSchema = new mongoose.Schema({
  id: {
    type: String,
  },
  title: {
    type: String,
  },
  published: {
    type: String,
    default: "",
  },
  info: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  url: {
    type: String,
    default: "",
  },
  apply: {
    type: String,
    default: "",
  },
  userid: {
    type: String,
    default: "",
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<Document & JobType>("Job", JobSchema);
