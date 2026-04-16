import { spawn, ChildProcess } from "node:child_process";

let child: ChildProcess | null = null;
let shuttingDown = false;
let restartDelay = 1000; // start at 1s
const MAX_RESTART_DELAY = 60000; // cap at 60s

function launch() {
  child = spawn("tsx", ["worker.ts"], { stdio: "inherit" });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      process.exit(0);
    }

    if (code === 0) {
      // Clean exit — reset backoff
      restartDelay = 1000;
    }

    console.error(
      `worker exited (code=${code} signal=${signal}) – restarting in ${restartDelay / 1000}s…`
    );
    setTimeout(launch, restartDelay);

    // Exponential backoff: 1s → 2s → 4s → 8s → … → 60s max
    restartDelay = Math.min(restartDelay * 2, MAX_RESTART_DELAY);
  });

  // Reset backoff after worker runs successfully for 30s
  setTimeout(() => {
    if (child && !child.killed) {
      restartDelay = 1000;
    }
  }, 30000);
}

function shutdown() {
  shuttingDown = true;
  if (child) {
    child.kill("SIGTERM");
  } else {
    process.exit(0);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

launch();
