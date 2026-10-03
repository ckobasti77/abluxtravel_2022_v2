// Scheduled jobs. Convex cron schedules are UTC: 04:00 UTC is 06:00 in
// Belgrade in summer (CEST), 05:00 UTC in winter (CET). cronTick starts the
// partner import only in the Belgrade 06 hour and only when
// SYNC_CRON_ENABLED === "true". The expiry sweep always runs.
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron("partner sync 04 UTC", "0 4 * * *", internal.sync.orchestrator.cronTick, {});
crons.cron("partner sync 05 UTC", "0 5 * * *", internal.sync.orchestrator.cronTick, {});
crons.cron("offer expiry sweep", "10 23 * * *", internal.sync.ingest.expirySweep, {});

export default crons;
