import { delay } from "@/utils";
import { connect, PageWithCursor } from "puppeteer-real-browser";
import config from "@/config";

const useRealBrowser = async () => {
  const { browser, page } = await connect({
    headless: false,
    args: [],
    customConfig: {},
    turnstile: true,
    connectOption: {},
    disableXvfb: false,
    ignoreAllFlags: false,
  });

  return { browser, page };
};

async function autoAcceptCookies(page: PageWithCursor): Promise<void> {
  const selector = 'button[id="onetrust-accept-btn-handler"]';

  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      try {
        const btn = await page.$(selector);
        if (btn) {
          console.log("🍪 Accept cookies button found. Clicking...");
          await page.click(selector);
          clearInterval(interval);
          await delay(10000);
          resolve(); // ✅ let the main code continue
        }
      } catch (err) {
        // silent
        console.log((err as Error).message);
      }
    }, 1000);
  });
}

async function login(page: PageWithCursor) {
  await page.goto("https://www.upwork.com/ab/account-security/login", {
    waitUntil: "domcontentloaded",
  });

  await autoAcceptCookies(page);

  // 🔹 Wait for login_username to be visible AND enabled
  await page.waitForFunction(
    () => {
      const input = document.querySelector("input#login_username");
      return (
        input &&
        !input.hasAttribute("disabled") &&
        (input as HTMLElement).offsetParent !== null
      );
    },
    { timeout: 10000 },
  );
  console.log("✅ Username input is ready");

  await page.type("input#login_username", config.EMAIL, { delay: 150 });

  // 🔹 Wait for and click the continue button
  await page.waitForSelector("button#login_password_continue", {
    visible: true,
    timeout: 10000,
  });
  await page.click("button#login_password_continue");
  console.log("➡️ Clicked continue after username");

  // 🔹 Wait for password input to become active
  await page.waitForFunction(
    () => {
      const input = document.querySelector("input#login_password");
      return (
        input &&
        !input.hasAttribute("disabled") &&
        (input as HTMLElement).offsetParent !== null
      );
    },
    { timeout: 10000 },
  );
  console.log("✅ Password input is ready");

  await page.type("input#login_password", config.PASSWORD, { delay: 150 });

  // 🔹 Remember me checkbox
  await page.waitForSelector("input#login_rememberme", {
    visible: true,
    timeout: 10000,
  });
  await page.click("input#login_rememberme");

  // 🔹 Final login button
  await page.waitForSelector("button#login_control_continue", {
    visible: true,
    timeout: 10000,
  });
  await page.click("button#login_control_continue");
  console.log("🔓 Submitted login form");
}

export async function scrapeJobs() {
  const { page } = await useRealBrowser();
  await page.setViewport({ width: 1220, height: 860 });
  await login(page);

  await delay(20000);

  const searchUrls = [
    `https://www.upwork.com/nx/search/jobs/?amount=10-3000&category2_uid=531770282580668419,531770282580668418&hourly_rate=15-40&payment_verified=1&per_page=50&q=%28Scrap%20OR%20Bet%20OR%20Casino%20OR%20Sportsbook%20OR%20Next.js%20OR%20React%20OR%20Tailwind%20OR%20Node.js%20OR%20ExpressJS%20OR%20MongoDB%20OR%20Firebase%20OR%20OpenAI%20OR%20Ether.js%20OR%20Website%20OR%20Telegram%20OR%20Bot%20OR%20Smart%20OR%20Contract%20OR%20Blockchain%20OR%20Full%20OR%20stack%20OR%20EVM%29%20AND%20NOT%20%28Wordpress%20OR%20Copywriting%20OR%20Vue%20OR%20Shopify%29&sort=recency&t=0,1`,
  ];

  for (let index = 0; index < searchUrls.length; index++) {
    const searchUrl = searchUrls[index];
    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    const MAX_RETRIES = 20;
    let jobs = [];
    let pageTitle = "";

    //We detect page load by checking page title(Must start with "Upwork -")
    while (!pageTitle.startsWith("Upwork")) {
      pageTitle = await page.title();
      console.log(`📝 Checking Page Title: ${pageTitle}`);
      await delay(1000);
    }
    console.log(`✅ Correct page title found: ${pageTitle}`);

    //After page title is found, try to scrape with retries
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const inputExists = await page.$(
          '[data-test="UpCInput"] input[type="search"]',
        );
        if (!inputExists) {
          console.log(
            `🔄 Waiting for search input... (${attempt + 1}/${MAX_RETRIES})`,
          );
          await delay(1000);
          continue;
        }

        const jobTiles = await page.$$(
          '[data-test="job-tile-title-link UpLink"]',
        );
        if (jobTiles.length === 0) {
          console.log(
            `🕵️ Waiting for job tiles... (${attempt + 1}/${MAX_RETRIES})`,
          );
          await delay(1000);
          continue;
        }

        jobs = await page.evaluate(() => {
          const jobCards = document.querySelectorAll('[data-test="JobTile"]');
          const results: any[] = [];

          jobCards.forEach((card) => {
            const titleEl = card.querySelector(
              '[data-test="job-tile-title-link UpLink"]',
            );
            const title = titleEl?.textContent?.trim() || "";
            const url = titleEl
              ? `https://www.upwork.com${titleEl.getAttribute("href")}`
              : "";

            const id = url.match(/~\w+/)?.[0];

            const apply = id
              ? `https://www.upwork.com/nx/proposals/job/${id}/apply/`
              : "";

            // ✅ FIX: Avoid global ID — use nested lookup instead
            const descWrapper = card.querySelector(
              '[data-test="UpCLineClamp JobDescription"]',
            );

            const paragraph = descWrapper?.querySelector("p");
            const description = paragraph?.textContent?.trim() || "";

            const date =
              card
                .querySelector(`[data-test="job-pubilshed-date"]`)
                ?.textContent?.trim() || "";

            const info =
              card
                .querySelector(`[data-test="JobInfo"]`)
                ?.textContent?.trim() || "";

            results.push({
              id,
              title,
              date,
              info,
              description,
              url,
              apply,
            });
          });

          return results;
        });

        break;
      } catch (err) {
        console.error(`⚠️ Error during scrape attempt ${attempt + 1}:`, err);
        await delay(1000);
        continue;
      }
    }

    if (jobs.length === 0) {
      console.log("❌ Failed to scrape jobs after multiple attempts.");
    } else {
      console.log("✅ Scraped jobs:", jobs);
    }

    console.log("Scraped jobs:", jobs);
  }
}

export const startScraping = async () => {
  try {
    await scrapeJobs();
  } catch (error) {
    console.error(
      "Error occurred while scraping jobs:",
      (error as Error).message,
    );
  }
};
