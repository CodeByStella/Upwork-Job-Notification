import { launchBot } from "@/bot";
import startCronJob from "@/cronjob";
import { connectDBWithRetry } from "@/db";
import { startScraping } from "@/scraper";

(async () => {
  await connectDBWithRetry();
  startCronJob();
  const status = await launchBot();
  console.log(status);
  startScraping();
})();
