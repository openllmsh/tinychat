// `bun dev` runs this first: create .env.local from .env.example once.
import { copyFileSync, existsSync } from "node:fs";

if (!existsSync(".env.local")) {
  copyFileSync(".env.example", ".env.local");
  console.log("Created .env.local from .env.example. Open the app and paste an OpenLLM API key to start.");
}
