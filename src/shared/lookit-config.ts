import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse } from "smol-toml";
import { migrateConfig } from "./config-migration.ts";

type RawConfig = {
  values: Record<string, string>;
  version: number;
};

function tomlToEnvValues(data: Record<string, unknown>): RawConfig {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "version" || value === undefined || value === null) {
      continue;
    }
    const envKey = key.startsWith("LOOKIT_") ? key.toUpperCase() : `LOOKIT_${key.toUpperCase()}`;
    values[envKey] = String(value);
  }
  return {
    values,
    version: Number(data.version ?? 1),
  };
}

export function configFilePath(): string {
  return process.env.LOOKIT_CONFIG?.trim() ?? join(homedir(), ".config", "lookit", "config.toml");
}

export function loadLookitConfig(): void {
  const path = configFilePath();
  if (!existsSync(path)) {
    return;
  }
  const data = parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  const raw = tomlToEnvValues(data);
  const values = migrateConfig(raw.values, raw.version);
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined || process.env[key].trim() === "") {
      process.env[key] = value;
    }
  }
}
