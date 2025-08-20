import { configDotenv } from "dotenv";

configDotenv();

const PORT = process.env.PORT || "5000";
const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI;
const EMAIL = process.env.ACCOUNT_EMAIL;
const PASSWORD = process.env.UPWORK_PASSWORD;
const ADMIN_ID = process.env.ADMIN_ID;
const SUPPORT = process.env.SUPPORT;
const SOURCE_URL = process.env.GITHUB_URL || "";

let config_missing = false;

if (!BOT_TOKEN) {
  console.error("Missing BOT_TOKEN");
  config_missing = true;
}

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI");
  config_missing = true;
}

if (!EMAIL) {
  console.error("Missing EMAIL");
  config_missing = true;
}

if (!PASSWORD) {
  console.error("Missing PASSWORD");
  config_missing = true;
}

if (!ADMIN_ID) {
  console.error("Missing ADMIN_ID");
  config_missing = true;
}
if (!SUPPORT) {
  console.error("Missing SUPPORT");
  config_missing = true;
}

if (config_missing) {
  process.exit(1);
}

interface Config {
  PORT: number;
  BOT_TOKEN: string;
  MONGODB_URI: string;
  EMAIL: string;
  PASSWORD: string;
  ADMIN_ID: string;
  SUPPORT: string;
  SOURCE_URL: string;
  PROXY: string | undefined;
  PROXY_AUTH: { username: string; password: string } | undefined;
}

const config: Config = {
  PORT: Number(PORT),
  BOT_TOKEN: BOT_TOKEN!,
  MONGODB_URI: MONGODB_URI!,
  EMAIL: EMAIL!,
  PASSWORD: PASSWORD!,
  ADMIN_ID: ADMIN_ID!,
  SUPPORT: SUPPORT!,
  SOURCE_URL: SOURCE_URL!,
  PROXY: process.env.PROXY,
  PROXY_AUTH: process.env.PROXY_AUTH ? JSON.parse(process.env.PROXY_AUTH) : undefined,
};

export default config;
