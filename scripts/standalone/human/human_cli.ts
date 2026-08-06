#!/usr/bin/env bun
import { runHuman } from "./human.ts";

try {
  await runHuman(process.argv.slice(2), { defaultServe: true });
} catch (error) {
  console.error(`human: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
