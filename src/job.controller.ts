import { sendMessage } from "./bot";
import Job from "./models/Job";
import { ScrapedJobType } from "./types/job";
import { delay, isEmpty } from "./utils";

const processScrapedJob = async (userid: string, jobs: ScrapedJobType[]) => {
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const exist = await Job.findOne({ userid, id: job.id });
    if (isEmpty(exist)) {
      await Job.create({ userid, id: job.id });
      await sendMessage(
        userid,
        `🔉*${job.title}*\n\n*${job.info}*\n\n*${job.date}*\n\n${job.description}\n\n[Apply Now](${job.url})    [Direct Apply](${job.apply})`,
      );
    }
    await delay(200);
  }
};

export default processScrapedJob;
