import config from "@/config";
import { Markup, Telegraf } from "telegraf";
import setup_commands from "./commands";
import setup_scenes from "./scene";
import { isEmpty } from "@/utils";

const bot = new Telegraf(config.BOT_TOKEN);

setup_scenes(bot);
setup_commands(bot);

export const sendMessage = async (
  chatId: string,
  text: string,
  url?: string,
  apply?: string,
) => {
  try {
    let extra: any = undefined;

    if (!isEmpty(url) && !isEmpty(apply)) {
      extra = Markup.inlineKeyboard([
        Markup.button.url("Explore Job", url),
        Markup.button.url("Direct Apply", apply),
      ]);
    }

    await bot.telegram.sendMessage(chatId, text, extra);
  } catch (error: any) {
    console.error(`Error sending message to chat ${chatId}`, error.message);
  }
};

export const launchBot = async () => {
  try {
    return await new Promise((resolve) => {
      bot.launch(() => {
        resolve("Bot started");
      });
    });
  } catch (error: any) {
    console.error("Error launching bot:", error.message);
    throw error;
  }
};
