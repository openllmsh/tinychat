// One local user, kept in a file, encrypted at rest with AES-256-GCM under
// CONNECTION_SECRET (32 bytes, base64). A real app stores this per user in
// its database.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { OpenLLMConnection } from "./openllm-connect";

const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "connection.json");

const key = (): Buffer => {
  const k = Buffer.from(process.env.CONNECTION_SECRET ?? "", "base64");
  if (k.length !== 32) throw new Error("CONNECTION_SECRET must be 32 bytes, base64");
  return k;
};

const seal = (plain: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return JSON.stringify({
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ct: ct.toString("base64"),
  });
};

const open = (sealed: string): string => {
  const { iv, tag, ct } = JSON.parse(sealed) as { iv: string; tag: string; ct: string };
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64")), decipher.final()]).toString("utf8");
};

export const loadConnection = async (): Promise<OpenLLMConnection | null> => {
  try {
    return JSON.parse(open(await readFile(FILE, "utf8"))) as OpenLLMConnection;
  } catch {
    return null;
  }
};

export const saveConnection = async (c: OpenLLMConnection): Promise<void> => {
  await mkdir(DIR, { recursive: true });
  await writeFile(FILE, seal(JSON.stringify(c)), { mode: 0o600 });
};

export const clearConnection = async (): Promise<void> => rm(FILE, { force: true });
