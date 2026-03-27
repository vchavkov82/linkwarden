import { startIndexing } from "./workers/linkIndexing";
import { linkProcessing } from "./workers/linkProcessing";
import { migrationWorker } from "./workers/migrationWorker";
import { startRSSPolling } from "./workers/rssPolling";
import { trialEndEmailWorker } from "./workers/trialEndEmailWorker";

const workerIntervalInSeconds =
  Number(process.env.ARCHIVE_SCRIPT_INTERVAL) || 10;

async function init() {
  await migrationWorker();

  console.log("\x1b[34m%s\x1b[0m", "Initializing the worker...");
  startRSSPolling().catch((err) =>
    console.error("RSS polling failed:", err)
  );
  linkProcessing(workerIntervalInSeconds).catch((err) =>
    console.error("Link processing failed:", err)
  );
  startIndexing(workerIntervalInSeconds).catch((err) =>
    console.error("Link indexing failed:", err)
  );
  trialEndEmailWorker().catch((err) =>
    console.error("Trial email worker failed:", err)
  );
}

process.on("SIGTERM", () => {
  console.log("\x1b[34m%s\x1b[0m", "Worker received SIGTERM, shutting down...");
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection in worker:", reason);
});

init();
