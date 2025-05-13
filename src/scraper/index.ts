import { delay } from "@/utils";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import RecaptchaPlugin from "puppeteer-extra-plugin-recaptcha";

puppeteer.use(StealthPlugin());
puppeteer.use(
  RecaptchaPlugin({
    provider: {
      id: "2captcha",
      token: "59fc83655541c70dd47ec252be75989a",
    },
    visualFeedback: true,
  }),
);

export async function scrapeJobs(searchUrl: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.goto(searchUrl, { waitUntil: "load" });
  await page.solveRecaptchas();
  await page.screenshot({ path: "page.png" });

  const jobs = await page.evaluate(() => {
    // return Array.from(document.querySelectorAll('[data-test="job-tile"]')).map(
    //   (el) => ({
    //     title: el.querySelector("h4")?.textContent?.trim(),
    //     link: el.querySelector("a")?.href,
    //     description: el
    //       .querySelector('[data-test="job-description-text"]')
    //       ?.textContent?.trim(),
    //   }),
    // );
    return document.title;
  });

  await browser.close();
  return jobs;
}

export const startScraping = async (interval_time: number) => {
  while (true) {
    try {
      const jobs = await scrapeJobs(
        "https://www.upwork.com/nx/search/jobs/?amount=10-3000&category2_uid=531770282580668419,531770282580668418&hourly_rate=15-40&payment_verified=1&per_page=50&q=%28Scrap%20OR%20Bet%20OR%20Casino%20OR%20Sportsbook%20OR%20Next.js%20OR%20React%20OR%20Tailwind%20OR%20Node.js%20OR%20ExpressJS%20OR%20MongoDB%20OR%20Firebase%20OR%20OpenAI%20OR%20Ether.js%20OR%20Website%20OR%20Telegram%20OR%20Bot%20OR%20Smart%20OR%20Contract%20OR%20Blockchain%20OR%20Full%20OR%20stack%20OR%20EVM%29%20AND%20NOT%20%28Wordpress%20OR%20Copywriting%20OR%20Vue%20OR%20Shopify%29&sort=recency&t=0,1",
      );
      console.log(jobs);
    } catch (error) {
      console.error("Error occurred while scraping jobs:", error);
    }
    await delay(interval_time);
  }
};
