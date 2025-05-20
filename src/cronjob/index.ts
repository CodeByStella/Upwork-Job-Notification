import cron from "node-cron";
import User from "@/models/User";
import { sendMessage } from "@/bot";

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const checkAndUpdateUsers = async ({
  users,
  maxDays,
  updateFields,
  label,
}: {
  users: any[];
  maxDays: number;
  updateFields: Record<string, any>;
  label: string;
}) => {
  const now = Date.now();

  for (const user of users) {
    try {
      const timeDiff = now - new Date(user.subscribed).getTime();
      if (timeDiff > maxDays * MS_IN_DAY) {
        console.log(`${label} User expired: https://t.me/${user.username}`);
        await User.updateOne(
          { _id: user._id },
          { ...updateFields, subscribed: new Date() },
        );
        await sendMessage(
          user.id,
          `Your ${label.toLocaleLowerCase()} subscription has expired.`,
        );
      }
    } catch (error) {
      console.error(`Error updating ${label} (${user.username}):`, error);
    }
  }
};

const startCronJob = () => {
  cron.schedule(
    "0 */4 * * *",
    async () => {
      console.log("Running daily user check at midnight");
      try {
        const [trialUsers, premiumUsers] = await Promise.all([
          User.find({ isTrial: true }),
          User.find({ isPremium: true }),
        ]);

        await checkAndUpdateUsers({
          users: trialUsers,
          maxDays: 3,
          updateFields: { isTrial: false, trialUsed: true },
          label: "Trial",
        });

        await checkAndUpdateUsers({
          users: premiumUsers,
          maxDays: 30,
          updateFields: { isPremium: false, trialUsed: true },
          label: "Premium",
        });
      } catch (error) {
        console.error("Cron job error:", error);
      }
    },
    {
      timezone: "Etc/UTC", // or your real timezone like "America/New_York"
    },
  );
};

export default startCronJob;
