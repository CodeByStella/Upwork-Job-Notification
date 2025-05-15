interface JobType {
  id: string;
  userid: string;
  created: Date;
}

export interface ScrapedJobType {
  title: string;
  info: string;
  date: string;
  description: string;
  url: string;
  apply: string;
  id: string;
}

export default JobType;
