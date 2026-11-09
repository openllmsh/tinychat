// One local user, kept in a file. Test app only: a real app stores this per
// user, encrypted at rest.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { OpenLLMConnection } from "./openllm-connect";

const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "connection.json");

export const loadConnection = async (): Promise<OpenLLMConnection | null> =>
  readFile(FILE, "utf8").then(
    (s) => JSON.parse(s) as OpenLLMConnection,
    () => null,
  );

export const saveConnection = async (c: OpenLLMConnection): Promise<void> => {
  await mkdir(DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(c, null, 2), { mode: 0o600 });
};

export const clearConnection = async (): Promise<void> => rm(FILE, { force: true });
