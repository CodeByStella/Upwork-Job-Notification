import config from "@/config";
import { Telegraf } from "telegraf";

const bot = new Telegraf(config.BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply("Welcome!", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Configure Job Feed", callback_data: "config_feed" }],
        [{ text: "Start Notification", callback_data: "start_notify" }],
        [{ text: "Stop Notification", callback_data: "stop_notify" }],
        [{ text: "Get Stats", callback_data: "get_stats" }],
      ],
    },
  });
});

export const launchBot = async () => {
  return new Promise((resolve) => {
    bot.launch(() => {
      resolve("Bot started");
    });
  });
};
