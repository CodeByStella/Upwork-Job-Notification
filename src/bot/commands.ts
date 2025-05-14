import config from "@/config";
import buttonTexts from "@/constant/buttons";
import User from "@/models/User";
import UserType from "@/types/user";
import { formatDate, isEmpty } from "@/utils";
import { Markup, Telegraf } from "telegraf";

const commands: {
  command: string;
  description: string;
}[] = [
  { command: "start", description: "Start the bot" },
  { command: "status", description: "Get the bot's status (admin only)" },
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
  GET_REFERRAL_LINK,
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
            [GET_REFERRAL_LINK, HELP],
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
            [GET_REFERRAL_LINK, HELP],
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

    const header = `🟢 *Current Status*\n\n Total: 🧮x${users.length}   Premium: 💎x${premiumUsers} Trial: 🧪x${trialUsers}  Ended: 🟡x${OutdatedUsers}\n --------------------------------------------------------------------------------\n`;

    const messages = [];
    let currentChunk = header;

    users.forEach((user) => {
      const line = `${formatDate(user.created)} - @${user.username} ${
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
      await ctx.reply(msg, { parse_mode: "Markdown" });
    }
  });
};

export default setup_commands;
