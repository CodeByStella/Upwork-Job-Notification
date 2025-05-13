import { launchBot } from "./bot";
import { startScraping } from "./scraper";

launchBot().then((status) => {
  console.log(status);
  startScraping(5000);
});
