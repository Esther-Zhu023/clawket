import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadBridgeCliEnv } from "../../apps/bridge-cli/scripts/load-env.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..", "..");
const bridgePkgPath = path.join(rootDir, "apps", "bridge-cli", "package.json");

loadBridgeCliEnv();

function runOrThrow(command, args, cwd = rootDir) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? 1}`);
  }
}

function bumpPatch(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Unsupported version format "${version}". Expected x.y.z`);
  }

  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}

function readRequiredEnv(name) {
  const value = process.env[name]?.trim() ?? "";
  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in apps/bridge-cli/.env.local or your shell before publishing.`,
    );
  }
  return value;
}

async function main() {
  const registryUrl = readRequiredEnv("CLAWKET_PACKAGE_DEFAULT_REGISTRY_URL");
  const fallbackUrl = readRequiredEnv("CLAWKET_PACKAGE_DEFAULT_REGISTRY_FALLBACK_URL");
  const originalText = await readFile(bridgePkgPath, "utf8");
  const pkg = JSON.parse(originalText);
  const oldVersion = pkg.version;
  const newVersion = bumpPatch(oldVersion);

  pkg.version = newVersion;
  await writeFile(bridgePkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

  process.stdout.write(`\nBumped @p697/clawket version: ${oldVersion} -> ${newVersion}\n`);
  process.stdout.write(`Publishing default registry: ${registryUrl}\n`);
  process.stdout.write(`Publishing fallback registry: ${fallbackUrl}\n`);
  process.stdout.write("Running publish safety checks (build + verify + dry-run)...\n\n");

  try {
    runOrThrow("npm", ["run", "--workspace", "@p697/clawket", "publish:dry-run"]);
  } catch (error) {
    await writeFile(bridgePkgPath, originalText, "utf8");
    process.stderr.write("\nPublish preparation failed; reverted apps/bridge-cli/package.json version bump.\n");
    throw error;
  }

  process.stdout.write("\nAll publish checks passed.\n");
  process.stdout.write(`Final manual step:\n`);
  process.stdout.write(`npm publish --workspace @p697/clawket --access public\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
