import express from "express";
import { prisma } from "../config/prisma.js";

const router = express.Router();

// GET /api/settings - Retrieve global settings
router.get("/", async (req, res) => {
  try {
    let settings = await prisma.setting.findFirst();
    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.setting.create({
        data: {
          base_currency: "PHP",
          active_markup: 0,
        }
      });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Server error retrieving settings", error: error.message });
  }
});

// POST /api/settings - Update global settings
router.post("/", async (req, res) => {
  try {
    const { base_currency, active_markup } = req.body;
    let settings = await prisma.setting.findFirst();
    
    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          base_currency: base_currency || "PHP",
          active_markup: active_markup || 0
        }
      });
    } else {
      settings = await prisma.setting.update({
        where: { id: settings.id },
        data: {
          ...(base_currency !== undefined && { base_currency }),
          ...(active_markup !== undefined && { active_markup })
        }
      });
    }
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: "Server error updating settings", error: error.message });
  }
});

export default router;
