import "module-alias/register";
import { launchBot } from "./bot";
import startCronJob from "./cronjob";
import { connectDB } from "./db";
import { startScraping } from "./scraper";

(async () => {
  await connectDB();
  startCronJob();
  const status = await launchBot();
  console.log(status);
  startScraping();
})();
