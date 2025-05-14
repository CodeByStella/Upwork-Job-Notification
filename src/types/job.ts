interface JobType {
  id: string;
  userid: string;
  created: Date;
}

export interface ScrapedJobType {
  id: string;
  title: string;
  date: string;
  info: string;
  description: string;
  url: string;
  apply: string;
}

export default JobType;
