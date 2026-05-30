import { Queue } from "bullmq";

export const ingestionQueue = new Queue("ingest-source", {
  connection: {
    host: "127.0.0.1",
    port: 6379,
  },
  defaultJobOptions: {
    attempts: 1,  // only try once
  }
});
