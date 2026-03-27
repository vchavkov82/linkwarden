import { spawn, ChildProcess } from "node:child_process";

let child: ChildProcess | null = null;
let shuttingDown = false;

function launch() {
  child = spawn("tsx", ["worker.ts"], { stdio: "inherit" });

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      process.exit(0);
    }
    console.error(
      `worker exited (code=${code} signal=${signal}) – restarting…`
    );
    setTimeout(launch, 5000);
  });
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
