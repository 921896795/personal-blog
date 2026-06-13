import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const astroCli = fileURLToPath(new URL("../node_modules/astro/astro.js", import.meta.url));

const child = spawn(process.execPath, [astroCli, ...args], {
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    ASTRO_TELEMETRY_DISABLED: "1"
  }
});

child.on("exit", code => {
  process.exit(code ?? 1);
});
