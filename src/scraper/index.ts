import { delay, isEmpty } from "@/utils";
import { connect, PageWithCursor } from "puppeteer-real-browser";
import config from "@/config";
import processScrapedJob from "@/job.controller";
import User from "@/models/User";
import UserType from "@/types/user";

let scraping = false;

const useRealBrowser = async () => {
  try {
    const proxy = (config as any).PROXY as string | undefined;
    const proxyAuth = (config as any).PROXY_AUTH as
      | { username: string; password: string }
      | undefined;

    const launchArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ];

    if (proxy) {
      launchArgs.push(`--proxy-server=${proxy}`);
      console.log("Using proxy:", proxy);
    }

    const { browser, page } = await connect({
      headless: false,
      args: launchArgs,
      customConfig: {},
      turnstile: true,
      connectOption: {
        protocolTimeout: 100000, // set to 60 seconds or whatever you need
      },
      disableXvfb: false,
      ignoreAllFlags: false,
    });

    // If proxy requires authentication, provide credentials to the page
    if (proxy && proxyAuth && page && (page as any).authenticate) {
      try {
        await (page as any).authenticate({
          username: proxyAuth.username,
          password: proxyAuth.password,
        });
        console.log("Proxy authentication applied");
      } catch (authErr) {
        console.error("Error applying proxy auth:", (authErr as Error).message);
      }
    }

    return { browser, page };
  } catch (err) {
    console.error("Error in useRealBrowser:", (err as Error).message);
    throw err;
  }
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
  try {
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
      { timeout: 10000 }
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
      { timeout: 10000 }
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
  } catch (err) {
    console.error("Error in login:", (err as Error).message);
    throw err;
  }
}

export async function scrapeJobs() {
  let iteration = 0;
  const RESTART_BROWSER_EVERY = 50; // Restart browser every 20 cycles to avoid memory leaks

  let browser: Awaited<ReturnType<typeof useRealBrowser>>["browser"] | null =
    null;
  let page: Awaited<ReturnType<typeof useRealBrowser>>["page"] | null = null;
  let subscribedUsers: UserType[];

  while (true) {
    if (!scraping) {
      try {
        if (page) await page.close().catch(() => {});
      } catch (err) {
        console.error("Error closing page:", (err as Error).message);
      }
      try {
        if (browser) await browser.close().catch(() => {});
      } catch (err) {
        console.error("Error closing browser:", (err as Error).message);
      }
    }

    try {
      // Restart browser every N iterations or if not initialized
      if (iteration % RESTART_BROWSER_EVERY === 0 || !browser || !page) {
        console.log("♻️ Restarting browser to free resources...");
        try {
          if (page) await page.close().catch(() => {});
        } catch (err) {
          console.error("Error closing page:", (err as Error).message);
        }
        try {
          if (browser) await browser.close().catch(() => {});
        } catch (err) {
          console.error("Error closing browser:", (err as Error).message);
        }
        let realBrowser;
        try {
          realBrowser = await useRealBrowser();
        } catch (err) {
          console.error("Error creating real browser:", (err as Error).message);
          await delay(5000);
          continue;
        }
        browser = realBrowser.browser;
        page = realBrowser.page;
        iteration = 0;

        try {
          await page!.setViewport({ width: 1220, height: 860 });
        } catch (err) {
          console.error("Error setting viewport:", (err as Error).message);
        }
        try {
          await login(page!);
        } catch (err) {
          console.error("Error during login:", (err as Error).message);
          await delay(5000);
          continue;
        }

        await delay(20000);

        try {
          subscribedUsers = await User.find({
            $or: [{ isPremium: true }, { isTrial: true }],
            notification: true,
          }).lean();
        } catch (err) {
          console.error("Error fetching users:", (err as Error).message);
          await delay(5000);
          continue;
        }
      }
      iteration++;

      for (let index = 0; index < subscribedUsers.length; index++) {
        if (!scraping) break;
        try {
          const searchUrl = subscribedUsers[index].searchUrl || "";
          const userid = subscribedUsers[index].id;

          if (isEmpty(searchUrl)) continue;

          try {
            await page!.goto(searchUrl, {
              waitUntil: "domcontentloaded",
              timeout: 20000,
            });
          } catch (err) {
            console.error(
              "Error navigating to searchUrl:",
              (err as Error).message
            );
            continue;
          }
          const MAX_RETRIES = 50;
          let jobs = [];
          let pageTitle = "";

          //We detect page load by checking page title(Must start with "Upwork -")
          try {
            while (!pageTitle.startsWith("Upwork")) {
              pageTitle = await page!.title();
              console.log(`📝 Checking Page Title: ${pageTitle}`);
              await delay(1000);
            }
            console.log(`✅ Correct page title found: ${pageTitle}`);
          } catch (err) {
            console.error("Error checking page title:", (err as Error).message);
            continue;
          }

          //After page title is found, try to scrape with retries
          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              const inputExists = await page!.$(
                '[data-test="UpCInput"] input[type="search"]'
              );
              if (!inputExists) {
                console.log(
                  `🔄 Waiting for search input... (${attempt + 1}/${MAX_RETRIES})`
                );
                await delay(1000);
                continue;
              }

              const jobTiles = await page!.$$(
                '[data-test="job-tile-title-link UpLink"]'
              );
              if (jobTiles.length === 0) {
                console.log(
                  `🕵️ Waiting for job tiles... (${attempt + 1}/${MAX_RETRIES})`
                );
                await delay(1000);
                continue;
              }

              jobs = await page!.evaluate(() => {
                const jobCards = document.querySelectorAll(
                  '[data-test="JobTile"]'
                );
                const results: any[] = [];

                jobCards.forEach((card) => {
                  const titleEl = card.querySelector(
                    '[data-test="job-tile-title-link UpLink"]'
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
                    '[data-test="UpCLineClamp JobDescription"]'
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
              console.error(
                `⚠️ Error during scrape attempt ${attempt + 1}:`,
                err
              );
              continue;
            }
          }

          if (jobs.length === 0) {
            console.log("❌ Failed to scrape jobs after multiple attempts.");
          } else {
            console.log("✅ Scraped jobs", jobs.length);
          }

          try {
            processScrapedJob(userid, jobs.reverse());
          } catch (err) {
            console.error(
              "Error in processScrapedJob:",
              (err as Error).message
            );
          }
          await delay(5000);
        } catch (err) {
          console.error("Error in user scraping loop:", (err as Error).message);
          continue;
        }
      }
    } catch (err) {
      console.error("Error in scrapeJobs loop:", (err as Error).message);
    }
    // No longer close browser/page here; handled by restart logic above
  }
}

export const startScraping = async () => {
  try {
    scraping = true;
    await scrapeJobs();
  } catch (error) {
    console.error(
      "Error occurred while scraping jobs:",
      (error as Error).message
    );
  }
};

export const stopScraping = () => {
  scraping = false;
};

export const getScrapingStatus = () => {
  return scraping;
};
