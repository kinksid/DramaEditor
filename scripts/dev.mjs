import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const port = process.env.PORT ?? "3000";

function isIPv4(address) {
  return address.family === "IPv4" || address.family === 4;
}

function getLanHost() {
  if (process.env.DEV_HOST) {
    return process.env.DEV_HOST;
  }

  const candidates = [];
  for (const [name, addresses] of Object.entries(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (!isIPv4(address) || address.internal) {
        continue;
      }
      candidates.push({ name, address: address.address });
    }
  }

  const ethernet = candidates.find(({ name }) => /以太网|^Ethernet$/i.test(name));
  if (ethernet) {
    return ethernet.address;
  }

  const officeLan = candidates.find(({ address }) => {
    const parts = address.split(".").map(Number);
    return parts[0] === 10 && parts[1] === 11 && parts[2] >= 8 && parts[2] <= 11;
  });
  if (officeLan) {
    return officeLan.address;
  }

  const preferred = candidates.find(
    ({ address }) =>
      !address.startsWith("10.255.") &&
      !address.startsWith("10.147.") &&
      !address.startsWith("169.254.")
  );
  return preferred?.address ?? "localhost";
}

const lanHost = getLanHost();

console.log("");
console.log("========================================");
console.log(`  本地访问:   http://localhost:${port}`);
console.log(`  局域网访问: http://${lanHost}:${port}`);
console.log("========================================");
console.log("");

const child = spawn(
  "npm",
  ["exec", "--", "next", "dev", "--hostname", "0.0.0.0", "--port", port],
  {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: true,
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
