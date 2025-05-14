import { launchBot } from "./bot";
import { connectDB } from "./db";
import { startScraping } from "./scraper";

(async () => {
  await connectDB();
  const status = await launchBot();
  console.log(status);
  // startScraping();
})();
