import config from "@/config";
import { Telegraf } from "telegraf";
import setup_commands from "./commands";
import setup_scenes from "./scene";

const bot = new Telegraf(config.BOT_TOKEN);

setup_scenes(bot);
setup_commands(bot);

export const launchBot = async () => {
  return new Promise((resolve) => {
    bot.launch(() => {
      resolve("Bot started");
    });
  });
};
