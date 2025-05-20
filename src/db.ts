import mongoose from "mongoose";
import config from "./config";

export const connectDBWithRetry = async (retries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(config.MONGODB_URI);
      console.log("MongoDB connected");
      return;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt} failed:`, error);
      if (attempt < retries) {
        await new Promise((res) => setTimeout(res, delay));
      } else {
        console.error("Exceeded maximum connection attempts. Exiting process.");
        process.exit(1);
      }
    }
  }
};
