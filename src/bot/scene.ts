import User from "@/models/User";
import { Scenes, session, Telegraf } from "telegraf";

export const SceneName = "config-wizard";

const configUrlScene = new Scenes.WizardScene<any>(
  SceneName,
  async (ctx) => {
    await ctx.reply(
      "Please enter the URL you want to see job listings from. (Refer the help)",
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    const address: string = ctx.message.text.trim();
    if (!address.startsWith("https://www.upwork.com/nx/search/jobs"))
      return await ctx.reply("Please enter a valid URL");

    const userId = ctx.update.message.from.id;
    const user = await User.findOne({ id: userId });

    if (user) {
      user.searchUrl = address;
      await user.save();
    }

    await ctx.reply(
      "Configurations! You should start receiving notifications shortly. 🎉",
    );

    return ctx.scene.leave();
  },
);

const stage = new Scenes.Stage<any>([configUrlScene]);

const setup_scenes = (bot: Telegraf) => {
  bot.use(session());
  bot.use(stage.middleware());
};

export default setup_scenes;
