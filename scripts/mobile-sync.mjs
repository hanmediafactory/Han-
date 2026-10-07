import { spawnSync } from "node:child_process";
const origin = process.env.HAN_MOBILE_URL;
if (!origin || new URL(origin).protocol !== "https:")
  throw new Error(
    "Set HAN_MOBILE_URL to the deployed HTTPS application origin before packaging native apps.",
  );
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
for (const args of [
  ["run", "build"],
  ["exec", "--", "cap", "sync"],
]) {
  const result = spawnSync(npm, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
