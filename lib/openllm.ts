// Everything OpenLLM-specific in this app: the SDK does the OAuth, key pickup,
// token refresh, chat streaming and the routes. This file only says where to
// keep each connection and who the current user is.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  connectRoutes,
  createConnect,
  encryptedConnectionStore,
} from "@openllmsh/sdk/connect";
import type { TStringStore } from "@openllmsh/sdk/connect";

// A demo keeps one local user's connection in a file. A real app uses a DB
// column keyed by its own user id; the store encrypts the value either way.
const DIR = path.join(process.cwd(), ".data");
const fileFor = (key: string): string => path.join(DIR, `${encodeURIComponent(key)}.connection`);

const files: TStringStore = {
  get: async (key) => readFile(fileFor(key), "utf8").catch(() => null),
  set: async (key, value) => {
    await mkdir(DIR, { recursive: true });
    await writeFile(fileFor(key), value, { mode: 0o600 });
  },
  delete: (key) => rm(fileFor(key), { force: true }),
};

/** The one local user. A real app returns its signed-in user id here. */
export const LOCAL_USER = "local";

export const connect = createConnect({
  store: encryptedConnectionStore(files, process.env.CONNECTION_SECRET ?? ""),
});

export const routes = connectRoutes(connect, { userKey: () => LOCAL_USER });
