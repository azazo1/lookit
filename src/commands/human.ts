import { runHuman } from "../human/server.ts";

export async function run(argv: string[]): Promise<void> {
  try {
    await runHuman(argv);
  } catch (error) {
    console.error(`human: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
