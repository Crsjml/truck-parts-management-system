// backend/src/utils/parseCompatibility.js

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

function extractEngineCodes(str) {
  const matches = str.match(/\(([A-Z0-9\-/]+)\s*(?:Engines?|Engine Code)?\)/gi) || [];
  return matches
    .map(m => m.replace(/[()]/g, '').replace(/\s*(Engines?|Engine Code)/i, '').trim())
    .flatMap(m => m.split('/').map(s => s.trim()))
    .filter(Boolean);
}

export function parseCompatibility(compatibilityStr) {
  if (!compatibilityStr) return [];

  const entries = [];
  const engineCodes = extractEngineCodes(compatibilityStr);

  for (const { match, brand, series } of COMPATIBILITY_MAP) {
    if (match.test(compatibilityStr)) {
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
