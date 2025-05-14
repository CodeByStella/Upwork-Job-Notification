import JobType from "@/types/job";
import mongoose from "mongoose";

const JobSchema = new mongoose.Schema({
  id: {
    type: String,
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
