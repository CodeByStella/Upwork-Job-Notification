import puppeteer from 'puppeteer';

export async function scrapeJobs(searchUrl: string) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(searchUrl, { waitUntil: 'networkidle2' });

  const jobs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-test="job-tile"]')).map((el) => ({
      title: el.querySelector('h4')?.textContent?.trim(),
      link: el.querySelector('a')?.href,
      description: el.querySelector('[data-test="job-description-text"]')?.textContent?.trim(),
    }));
  });

  await browser.close();
  return jobs;
}
