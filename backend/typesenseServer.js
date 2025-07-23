import Typesense from "typesense";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.TYPESENSE_API_KEY;
const host = process.env.TYPESENSE_HOST;
const port = process.env.TYPESENSE_PORT;
const protocol = process.env.TYPESENSE_PROTOCOL;

if (!apiKey || !host || !port || !protocol) {
  throw new Error(
    "One or more Typesense environment variables are missing from .env"
  );
}

const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host,
      port: parseInt(port, 10),
      protocol,
    },
  ],
  apiKey,
  connectionTimeoutSeconds: 2,
});

export default typesenseClient;
