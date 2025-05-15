import config from "@/config";
import { Markup, Telegraf } from "telegraf";
import setup_commands from "./commands";
import setup_scenes from "./scene";

const bot = new Telegraf(config.BOT_TOKEN);

setup_scenes(bot);
setup_commands(bot);

export const sendMessage = async (
  chatId: string,
  text: string,
  url: string,
  apply: string,
) => {
  try {
    await bot.telegram.sendMessage(chatId, text, {
      ...Markup.inlineKeyboard([
        Markup.button.url("Explore Job", url),
        Markup.button.url("Direct Apply", apply),
      ]),
    });
  } catch (error) {
    console.error(`Error sending message to chat ${chatId}:`, error);
  }
};

export const launchBot = async () => {
  return new Promise((resolve) => {
    bot.launch(() => {
      resolve("Bot started");
    });
  });
};
