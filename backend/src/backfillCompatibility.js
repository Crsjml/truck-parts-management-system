/**
 * backfillCompatibility.js
 * One-time migration: parse legacy `compatibility` strings into structured `compatibleWith[]` array.
 * Run once: node src/backfillCompatibility.js
 */
import './config/env.js';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import Part from './models/Part.js';

// Curated map: known compatibility string patterns → structured entries
// Brand names are normalised to their canonical form for consistent filtering
const COMPATIBILITY_MAP = [
  // Isuzu variants
  { match: /isuzu elf/i,      brand: 'Isuzu',   series: 'ELF'     },
  { match: /isuzu npr/i,      brand: 'Isuzu',   series: 'NPR'     },
  { match: /isuzu nkr/i,      brand: 'Isuzu',   series: 'NKR'     },
  { match: /isuzu forward/i,  brand: 'Isuzu',   series: 'Forward' },
  { match: /isuzu giga/i,     brand: 'Isuzu',   series: 'Giga'    },
  { match: /isuzu cxz/i,      brand: 'Isuzu',   series: 'CXZ'     },
  // Hino variants
  { match: /hino 300/i,       brand: 'Hino',    series: '300'     },
  { match: /hino 500/i,       brand: 'Hino',    series: '500'     },
  { match: /hino ranger/i,    brand: 'Hino',    series: 'Ranger'  },
  { match: /hino profia/i,    brand: 'Hino',    series: 'Profia'  },
  // Fuso variants
  { match: /fuso canter/i,    brand: 'Fuso',    series: 'Canter'  },
  { match: /fuso fighter/i,   brand: 'Fuso',    series: 'Fighter' },
  { match: /fuso super great/i, brand: 'Fuso',  series: 'Super Great' },
  { match: /fuso fk/i,        brand: 'Fuso',    series: 'FK'      },
  { match: /fuso fm/i,        brand: 'Fuso',    series: 'FM'      },
  // Toyota
  { match: /toyota dyna/i,    brand: 'Toyota',  series: 'Dyna'    },
];

// Engine code extractor — matches parenthetical codes like (4HF1) or (6UZ1/6WF1)
function extractEngineCodes(str) {
  const matches = str.match(/\(([A-Z0-9\-/]+)\s*(?:Engines?|Engine Code)?\)/gi) || [];
  return matches
    .map(m => m.replace(/[()]/g, '').replace(/\s*(Engines?|Engine Code)/i, '').trim())
    .flatMap(m => m.split('/').map(s => s.trim()))
    .filter(Boolean);
}

function parseCompatibility(compatibilityStr) {
  if (!compatibilityStr) return [];

  const entries = [];
  const engineCodes = extractEngineCodes(compatibilityStr);

  for (const { match, brand, series } of COMPATIBILITY_MAP) {
    if (match.test(compatibilityStr)) {
      // Try to find a relevant engine code
      // Simple heuristic: use first engine code if only one brand match
      const engineCode = engineCodes.length === 1 ? engineCodes[0] : '';
      entries.push({ brand, series, engineCode });
    }
  }

  // Handle "Universal" entries
  if (/universal/i.test(compatibilityStr) && entries.length === 0) {
    entries.push({ brand: 'Universal', series: '', engineCode: '' });
  }

  return entries;
}

async function backfill() {
  await connectDB();
  console.log('🔄 Starting compatibility backfill...\n');

  const parts = await Part.find({}).lean();
  let updated = 0;
  let skipped = 0;

  for (const part of parts) {
    // Skip if already has structured data
    if (part.compatibleWith && part.compatibleWith.length > 0) {
      console.log(`⏭️  Skipped (already populated): ${part.name}`);
      skipped++;
      continue;
    }

    const parsed = parseCompatibility(part.compatibility);

    if (parsed.length > 0) {
      await Part.updateOne({ _id: part._id }, { $set: { compatibleWith: parsed } });
      console.log(`✅ ${part.name}`);
      parsed.forEach(e => console.log(`     → ${e.brand} ${e.series} ${e.engineCode ? `(${e.engineCode})` : ''}`));
      updated++;
    } else {
      console.log(`⚠️  No match for: ${part.name} | "${part.compatibility}"`);
      skipped++;
    }
  }

  console.log(`\n🎉 Backfill complete! Updated: ${updated} | Skipped: ${skipped}`);
  await mongoose.disconnect();
}

backfill().catch(err => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});
