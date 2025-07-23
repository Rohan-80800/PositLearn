import prisma from "../DB/db.config.js";
import { entityUpdate} from "../utils/notification.js";

export const getCheats = async (req, res) => {
  try {    
    const cheats = await prisma.contents.findMany({
      where: { resource_type: "CHEATSHEET" },
      orderBy: { created_at: "desc" },
    });
    res.json(cheats);
  } catch {
    res.status(500).json({ error: "Failed to fetch cheatsheets." });
  }
};

export const createCheat = async (req, res) => {
  const { title, description, resource } = req.body;
  try {
    const newCheat = await prisma.contents.create({
      data: {
        title,
        description,
        resource,
        resource_type: "CHEATSHEET",
      },
    });
    await entityUpdate("cheatsheets");
    res.status(201).json(newCheat);
  } catch {
    res.status(500).json({ error: "Failed to create cheat." });
  }
};

export const updateCheat = async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, description, resource } = req.body;
  try {
    const updated = await prisma.contents.update({
      where: { id },
      data: { title, description, resource },
    });
    res.json(updated);
    await entityUpdate("cheatsheets");
  } catch {
    res.status(500).json({ error: "Failed to update cheat." });
  }
};

export const deleteCheat = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.contents.delete({ where: { id } });
    await entityUpdate("cheatsheets");
    res.json({ message: "Cheat deleted." });
  } catch {
    res.status(500).json({ error: "Failed to delete cheat." });
  }
};
