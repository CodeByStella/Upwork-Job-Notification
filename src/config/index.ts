import { configDotenv } from "dotenv";

configDotenv();

export default {
  PORT: process.env.PORT || 5000,
  BOT_TOKEN: process.env.BOT_TOKEN || "default_bot_token",
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/upwork2tg",
  EMAIL: process.env.ACCOUNT_EMAIL || "default_email@example.com",
  PASSWORD: process.env.UPWORK_PASSWORD || "default_password",
};
