import express from "express";
import { prisma } from "../config/prisma.js";
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { hashPin, verifyPin } from '../utils/pin.js';

const router = express.Router();

// GET /api/settings - Retrieve global settings (public — frontend reads it)
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
    res.json({
      id: settings.id,
      base_currency: settings.base_currency,
      active_markup: settings.active_markup,
      overridePinConfigured: Boolean(settings.overridePinHash)
    });
  } catch (error) {
    res.status(500).json({ message: "Server error retrieving settings", error: error.message });
  }
});

// POST /api/settings - Update global settings (admin only)
router.post("/", requireAuth, requireRole('SUPERADMIN'), async (req, res) => {
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
    
    res.json({
      id: settings.id,
      base_currency: settings.base_currency,
      active_markup: settings.active_markup,
      overridePinConfigured: Boolean(settings.overridePinHash)
    });
  } catch (error) {
    res.status(500).json({ message: "Server error updating settings", error: error.message });
  }
});

// POST /api/settings/override-pin — set or change the discount override PIN.
// SUPERADMIN only: this PIN authorises discounts, so ADMIN must not self-grant it.
router.post('/override-pin', requireAuth, async (req, res) => {
  try {
    const staff = await prisma.staffRole.findUnique({ where: { email: req.auth.email.toLowerCase() } });
    if (staff?.role !== 'SUPERADMIN') {
      return res.status(403).json({ msg: 'Only a superadmin can set the override PIN.' });
    }

    const { pin } = req.body;
    if (!/^\d{4,6}$/.test(String(pin ?? ''))) {
      return res.status(400).json({ msg: 'PIN must be 4 to 6 digits.' });
    }

    let settings = await prisma.setting.findFirst();
    if (!settings) {
      settings = await prisma.setting.create({ data: { overridePinHash: hashPin(pin) } });
    } else {
      settings = await prisma.setting.update({
        where: { id: settings.id },
        data: { overridePinHash: hashPin(pin) }
      });
    }

    res.json({ configured: true });
  } catch (error) {
    console.error('[set override pin]', error);
    res.status(500).json({ msg: 'Server error setting override PIN.' });
  }
});

// POST /api/settings/override-pin/verify — any authenticated staff may attempt.
router.post('/override-pin/verify', requireAuth, async (req, res) => {
  try {
    const settings = await prisma.setting.findFirst();
    const valid = verifyPin(req.body?.pin, settings?.overridePinHash);
    res.json({ valid });
  } catch (error) {
    console.error('[verify override pin]', error);
    res.status(500).json({ msg: 'Server error verifying override PIN.' });
  }
});

export default router;
