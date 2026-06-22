import express from "express";
import Setting from "../models/setting_model.js";

const router = express.Router();

// GET /api/settings - Retrieve global settings
router.get("/", async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = new Setting({
        base_currency: "PHP",
        active_markup: 0,
      });
      await settings.save();
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
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting({ base_currency, active_markup });
    } else {
      if (base_currency !== undefined) settings.base_currency = base_currency;
      if (active_markup !== undefined) settings.active_markup = active_markup;
    }
    const updatedSettings = await settings.save();
    res.json(updatedSettings);
  } catch (error) {
    res.status(500).json({ message: "Server error updating settings", error: error.message });
  }
});

export default router;
