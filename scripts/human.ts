import { runHuman } from "./standalone/human/human.ts";

void runHuman(process.argv.slice(2)).catch((error) => {
  console.error(`human: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
