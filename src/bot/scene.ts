import User from "@/models/User";
import { delay } from "@/utils";
import { Scenes, session, Telegraf } from "telegraf";

export const ConfigSceneName = "config-wizard";
export const BroadcastMessageSceneName = "broadcast-message";

const configUrlScene = new Scenes.WizardScene<any>(
  ConfigSceneName,
  async (ctx) => {
    try {
      await ctx.reply(
        "Please enter the URL you want to see job listings from. (Refer the help)",
      );
      return ctx.wizard.next();
    } catch (error: any) {
      console.error("Error in configUrlScene step 1:", error.message);
      await ctx.reply("An error occurred. Please try again.");
      return ctx.scene.leave();
    }
  },
  async (ctx) => {
    try {
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
    } catch (error: any) {
      console.error("Error in configUrlScene step 2:", error.message);
      await ctx.reply("An error occurred. Please try again.");
      return ctx.scene.leave();
    }
  },
);

const broadcastMessageScene = new Scenes.WizardScene<any>(
  BroadcastMessageSceneName,
  async (ctx) => {
    try {
      await ctx.reply(
        "Please send the message, image, video, or audio you want to broadcast to all users.",
      );
      return ctx.wizard.next();
    } catch (error: any) {
      console.error("Error in broadcastMessageScene step 1:", error.message);
      await ctx.reply("An error occurred. Please try again.");
      return ctx.scene.leave();
    }
  },
  async (ctx) => {
    try {
      const users = await User.find({}).lean();
      let broadcastFn;

      // Text
      if (ctx.message?.text) {
        const text: string = ctx.message.text.trim();
        if (text.startsWith("/")) {
          await ctx.reply("Broadcast have been canceled");
          return ctx.scene.leave();
        }

        broadcastFn = async (userId: number) => {
          await ctx.telegram.sendMessage(
            userId,
            `🔉 *Broadcast message from admin*\n\n${text}`,
            {
              parse_mode: "Markdown",
            },
          );
        };
      }

      // Photo
      else if (ctx.message?.photo) {
        const photo = ctx.message.photo.at(-1)?.file_id;
        const caption = ctx.message.caption || "";
        broadcastFn = async (userId: number) => {
          await ctx.telegram.sendPhoto(userId, photo, {
            caption: `🔉 *Broadcast from admin*\n\n${caption}`,
            parse_mode: "Markdown",
          });
        };
      }

      // Video
      else if (ctx.message?.video) {
        const video = ctx.message.video.file_id;
        const caption = ctx.message.caption || "";
        broadcastFn = async (userId: number) => {
          await ctx.telegram.sendVideo(userId, video, {
            caption: `🔉 *Broadcast from admin*\n\n${caption}`,
            parse_mode: "Markdown",
          });
        };
      }

      // Audio
      else if (ctx.message?.audio) {
        const audio = ctx.message.audio.file_id;
        const caption = ctx.message.caption || "";
        broadcastFn = async (userId: number) => {
          await ctx.telegram.sendAudio(userId, audio, {
            caption: `🔉 *Broadcast from admin*\n\n${caption}`,
            parse_mode: "Markdown",
          });
        };
      }

      // Unsupported
      else {
        await ctx.reply(
          "❌ Unsupported message type. Please send text, photo, video, or audio.",
        );
        return ctx.wizard.selectStep(1);
      }

      // Loop and send
      for (const user of users) {
        try {
          await broadcastFn(user.id);
          await delay(200);
        } catch (error: any) {
          console.log(`Failed to send to ${user.id}:`, error.message);
        }
      }

      await ctx.reply("✅ Broadcast sent to all users.");
      return ctx.scene.leave();
    } catch (error: any) {
      console.error("Error in broadcastMessageScene step 2:", error.message);
      await ctx.reply("An error occurred. Please try again.");
      return ctx.scene.leave();
    }
  },
);

const stage = new Scenes.Stage<any>([configUrlScene, broadcastMessageScene]);

const setup_scenes = (bot: Telegraf) => {
  bot.use(session());
  bot.use(stage.middleware());
};

export default setup_scenes;
