import { readIntents, writeIntents } from "../utils/intentService.js";
import { entityUpdate } from "../utils/notification.js";

export const getIntent= (req, res) => {
  const intents = readIntents();
  res.json(intents);
};

export const createIntent= (req, res) => {
  const newIntent = req.body;
  const intents = readIntents();

  const exists = intents.some(i => i.name === newIntent.name);
  if (exists) return res.status(400).json({ error: "Intent already exists" });

  intents.push(newIntent);
  writeIntents(intents);
  entityUpdate("intents");
  res.status(201).json({ message: "Intent created", data: newIntent });
};

export const updateIntent=  (req, res) => {
  const { intentName } = req.params;
  const updatedIntent = req.body;
  const intents = readIntents();

  const index = intents.findIndex(i => i.name === intentName);
  if (index === -1) return res.status(404).json({ error: "Intent not found" });

  intents[index] = updatedIntent;
  writeIntents(intents);
  entityUpdate("intents");
  res.json({ message: "Intent updated", data: updatedIntent });
};

export const deleteIntent= (req, res) => {
  const { intentName } = req.params;
  let intents = readIntents();

  const exists = intents.some(i => i.name === intentName);
  if (!exists) return res.status(404).json({ error: "Intent not found" });

  intents = intents.filter(i => i.name !== intentName);
  writeIntents(intents);
  entityUpdate("intents");
  res.json({ message: "Intent deleted" });
};

