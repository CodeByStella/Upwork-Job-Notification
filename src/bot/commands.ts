import config from "@/config";
import buttonTexts from "@/constant/buttons";
import helpText from "@/constant/help";
import User from "@/models/User";
import UserType from "@/types/user";
import { formatDate, isEmpty } from "@/utils";
import { Markup, Telegraf } from "telegraf";
import { BroadcastMessageSceneName, ConfigSceneName } from "./scene";

const commands: {
  command: string;
  description: string;
}[] = [
  { command: "start", description: "Start the bot" },
  { command: "status", description: "Get the bot's status (admin only)" },
  {
    command: "broadcast",
    description: "Broadcast a message to all users (admin only)",
  },
];

const TELEGRAM_MSG_LIMIT = 3000;

const {
  START_TRIAL,
  HELP,
  CONFIG_JOB_LIST,
  START_NOTIFICATION,
  STOP_NOTIFICATION,
  GET_SUBSCRIPTION_STATUS,
  SUBSCRIBE,
  SOURCE_URL,
} = buttonTexts;

const setup_commands = async (bot: Telegraf) => {
  await bot.telegram.setMyCommands(commands);
  bot.start(async (ctx) => {
    const args = ctx.message.text.split(" ");
    const referrerId = args[1];

    const username = ctx.update.message.from.username;
    const userId = ctx.update.message.from.id;

    const existUser = await User.findOne({
      id: userId,
    });

    if (isEmpty(existUser) || !(existUser?.isTrial || existUser?.isPremium)) {
      if (isEmpty(existUser)) {
        console.log(`Registering New User... https://t.me/${username}`);
        await User.create({
          id: userId,
          username: username,
          invited_by: referrerId,
        });
      }

      ctx.reply(
        `Welcome to the *Upwork Job Notifications Bot*, please select one of the following options.\n\n If you need assistance, please contact ${config.SUPPORT}`,
        {
          parse_mode: "Markdown",
          ...Markup.keyboard([
            [START_TRIAL, SUBSCRIBE],
            [HELP, SOURCE_URL],
          ])
            .resize()
            .oneTime(),
        },
      );
    } else {
      ctx.reply(
        `Welcome to the *Upwork Job Notifications Bot*, please select one of the following options.\n\n If you need assistance, please contact ${config.SUPPORT}`,
        {
          parse_mode: "Markdown",
          ...Markup.keyboard([
            [CONFIG_JOB_LIST, GET_SUBSCRIPTION_STATUS],
            [START_NOTIFICATION, STOP_NOTIFICATION],
            [HELP, SOURCE_URL],
          ])
            .resize()
            .oneTime(),
        },
      );
    }
  });

  bot.command("status", async (ctx) => {
    const userId = ctx.update.message.from.id;
    if (config.ADMIN_ID !== userId.toString())
      return ctx.reply(`🚫 This command is for admin only.`);

    const users = await User.find({}).lean();

    let trialUsers = 0;
    let premiumUsers = 0;
    let OutdatedUsers = 0;

    // Sort: Premium → Trial → Outdated/Other → by date
    users.sort((a, b) => {
      const getWeight = (user: UserType) =>
        user.isPremium ? 0 : user.isTrial ? 1 : user.trialUsed ? 2 : 3;

      const weightA = getWeight(a);
      const weightB = getWeight(b);
      if (weightA !== weightB) return weightA - weightB;

      return new Date(a.created).getTime() - new Date(b.created).getTime();
    });

    // Count types
    users.forEach((user) => {
      if (user.isPremium) premiumUsers++;
      else if (user.isTrial) trialUsers++;
      else if (user.trialUsed) OutdatedUsers++;
    });

    const header = [
      "🟢 Current Status",
      "",
      `Total:🧮x${users.length}   Premium:💎x${premiumUsers}   Trial:🧪x${trialUsers}   Ended:🟡x${OutdatedUsers}`,
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ].join("\n");

    const messages = [];
    let currentChunk = header;

    users.forEach((user) => {
      const line = `${user.notification && !isEmpty(user.searchUrl) ? "🟢" : "🔴"}${formatDate(user.created)} - @${user.username} ${
        user.isPremium ? "💎" : user.isTrial ? "🧪" : user.trialUsed ? "🟡" : ""
      }\n`;

      if ((currentChunk + line).length > TELEGRAM_MSG_LIMIT) {
        messages.push(currentChunk);
        currentChunk = line;
      } else {
        currentChunk += line;
      }
    });

    if (currentChunk) messages.push(currentChunk);

    for (const msg of messages) {
      await ctx.reply(msg);
    }
  });

  bot.command("broadcast", async (ctx: any) => {
    const userId = ctx.update.message.from.id;
    if (config.ADMIN_ID !== userId.toString())
      return ctx.reply(`🚫 This command is for admin only.`);

    return ctx.scene.enter(BroadcastMessageSceneName);
  });

  bot.hears(SOURCE_URL, async (ctx) => {
    ctx.reply(
      `${config.SOURCE_URL}\n*Please give me a star to repository.* ⭐️`,
      {
        parse_mode: "Markdown",
      },
    );
  });

  bot.hears(HELP, async (ctx) => {
    ctx.reply(helpText, { parse_mode: "Markdown" });
  });

  bot.hears(START_TRIAL, async (ctx) => {
    const userId = ctx.update.message.from.id;
    const user = await User.findOne({ id: userId });
    if (user) {
      if (user.isPremium) {
        return ctx.reply(`You are already using premium plan.💎`);
      }
      if (user.isTrial) {
        return ctx.reply(`You are already using trial plan.🧪`);
      }
      if (user.trialUsed) {
        return ctx.reply(`Your trial plan has been expired.🟡`);
      }

      user.isTrial = true;
      user.subscribed = new Date();
      await user.save();
      ctx.reply(`Your trial has started. You have 3 days to use it.`, {
        parse_mode: "Markdown",
        ...Markup.keyboard([
          [CONFIG_JOB_LIST, GET_SUBSCRIPTION_STATUS],
          [START_NOTIFICATION, STOP_NOTIFICATION],
          [HELP, SOURCE_URL],
        ])
          .resize()
          .oneTime(),
      });
    } else {
      ctx.reply(`User not found`);
    }
  });

  bot.hears(SUBSCRIBE, async (ctx) => {
    const userId = ctx.update.message.from.id;
    const user = await User.findOne({ id: userId });

    if (user && user.isPremium)
      return ctx.reply(`You are already using premium plan.💎`);

    ctx.replyWithInvoice({
      title: "Upwork Job Notification Subscription for 1 month",
      description:
        "Get instant job notifications tailored to you. Be the first to apply, maximize your chances, and win more contracts! Customize alerts.\nActive fast.",
      payload: "premium_sub_1m",
      provider_token: "", // Leave empty for Telegram Stars
      currency: "XTR",
      prices: [{ label: "1 Month", amount: 100 }], // 1 Star = $100
    });
  });
  bot.on("pre_checkout_query", (ctx) => ctx.answerPreCheckoutQuery(true));
  bot.on("successful_payment", async (ctx) => {
    await ctx.reply(
      "Thank you for your purchase!\nYou can use the bot for *one month* from now.",
      {
        parse_mode: "Markdown",
      },
    );

    const userId = ctx.update.message.from.id;
    const user = await User.findOne({ id: userId });

    if (user) {
      user.isPremium = true;
      user.subscribed = new Date();
      user.isTrial = false;
      user.trialUsed = true;

      await user.save();
    }
  });

  bot.hears(START_NOTIFICATION, async (ctx) => {
    const userId = ctx.update.message.from.id;
    const user = await User.findOne({ id: userId });

    if (user?.isPremium || user?.isTrial) {
      user.notification = true;

      await user.save();
      await ctx.reply("Notifications are enabled.🟢", {
        parse_mode: "Markdown",
      });
    } else {
      await ctx.reply("Please subscribe a plan first.⚠️", {
        parse_mode: "Markdown",
      });
    }
  });

  bot.hears(STOP_NOTIFICATION, async (ctx) => {
    const userId = ctx.update.message.from.id;
    const user = await User.findOne({ id: userId });

    if (user) {
      user.notification = false;
      await user.save();
      await ctx.reply("Notifications are disabled.🔴", {
        parse_mode: "Markdown",
      });
    }
  });

  bot.hears(GET_SUBSCRIPTION_STATUS, async (ctx) => {
    const userId = ctx.update.message.from.id;
    const user = await User.findOne({ id: userId });

    if (user) {
      await ctx.reply(
        `*Your subscription status*\n\n${user.isPremium ? "Premium 💎" : user.isTrial ? "Trial 🧪" : "No Subscription"}\n${user.notification ? "Notifications are enabled.🟢" : "Notifications are disabled.🔴"}${user.isPremium ? `\nSubscribed on ${formatDate(user.subscribed)}` : ""}\nConfig URL: ${user.searchUrl || "Not set"}
        `,
        {
          parse_mode: "Markdown",
        },
      );
    }
  });

  bot.hears(CONFIG_JOB_LIST, async (ctx: any) => {
    const userId = ctx.update.message.from.id;
    const user = await User.findOne({ id: userId });

    if (user?.isPremium || user?.isTrial) {
      ctx.scene.enter(ConfigSceneName);
    } else {
      await ctx.reply("Please subscribe a plan first.⚠️", {
        parse_mode: "Markdown",
      });
    }
  });
};

export default setup_commands;
