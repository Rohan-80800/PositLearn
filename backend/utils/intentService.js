import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const intentPath = path.join(__dirname, "../../front/chatbot/intents.json");

export function readIntents() {
  const data = fs.readFileSync(intentPath, "utf8");
  return JSON.parse(data);
}

export function writeIntents(intents) {
  fs.writeFileSync(intentPath, JSON.stringify(intents, null, 2), "utf8");
}
