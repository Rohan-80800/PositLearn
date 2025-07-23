import Typesense from "typesense";

const apiKey = import.meta.env.VITE_TYPESENSE_API_KEY;
const host = import.meta.env.VITE_TYPESENSE_HOST;
const port = import.meta.env.VITE_TYPESENSE_PORT;
const protocol = import.meta.env.VITE_TYPESENSE_PROTOCOL;

if (!apiKey) {
  console.error("Typesense API key not found in frontend env!");
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
