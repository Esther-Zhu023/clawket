import { spawnSync } from "node:child_process";
import process from "node:process";
import { loadBridgeCliEnv } from "./load-env.mjs";

loadBridgeCliEnv();

function readOptionalEnv(name) {
  return process.env[name]?.trim() ?? "";
}

const packagedRegistryUrl = readOptionalEnv("CLAWKET_PACKAGE_DEFAULT_REGISTRY_URL");
const packagedRegistryFallbackUrl = readOptionalEnv("CLAWKET_PACKAGE_DEFAULT_REGISTRY_FALLBACK_URL");

const args = [
  "tsup",
  "src/index.ts",
  "--format",
  "esm",
  "--platform",
  "node",
  "--target",
  "node20",
  "--clean",
  "--no-external",
  "@clawket/bridge-core",
  "--no-external",
  "@clawket/bridge-runtime",
  "--external",
  "ws",
  "--external",
  "qrcode-terminal",
  `--define.process.env.CLAWKET_PACKAGE_DEFAULT_REGISTRY_URL=${JSON.stringify(packagedRegistryUrl)}`,
  `--define.process.env.CLAWKET_PACKAGE_DEFAULT_REGISTRY_FALLBACK_URL=${JSON.stringify(packagedRegistryFallbackUrl)}`,
];

const result = spawnSync("npx", args, {
  stdio: "inherit",
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
