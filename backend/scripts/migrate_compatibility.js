import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export function deriveCompatibility(partName) {
  const name = partName || '';

  if (/Isuzu/i.test(name)) {
    if (/4HF1|4HG1|4BE1|4HK1|4HE1|Elf|NHR|NKR|NPR|NQR/i.test(name)) {
      const engine = name.match(/4H[FGE]1|4BE1|4HK1/i)?.[0]?.toUpperCase() || '4HF1/4HG1';
      return [
        { brand: 'Isuzu', series: 'Elf (NPR/NKR/NQR)', years: '1994–2007', engineCode: engine },
        { brand: 'Isuzu', series: 'Forward (FRR/FSR)', years: '1998–2008', engineCode: engine }
      ];
    }
    if (/6BG1|Giga|Forward|6UZ1/i.test(name)) {
      const engine = name.match(/6BG1|6UZ1|6WG1/i)?.[0]?.toUpperCase() || '6BG1';
      return [
        { brand: 'Isuzu', series: 'Forward / Giga FXZ', years: '2000–2015', engineCode: engine },
        { brand: 'Isuzu', series: 'Giga Heavy Duty CXZ', years: '2005–2018', engineCode: engine }
      ];
    }
    return [
      { brand: 'Isuzu', series: 'Elf (NPR/NKR)', years: '1995–2012', engineCode: '4HF1/4HG1' },
      { brand: 'Isuzu', series: 'Forward FRR', years: '2000–2014', engineCode: '6BG1' }
    ];
  }

  if (/Fuso|Mitsubishi/i.test(name)) {
    if (/6D16|6D17|6D14|Fighter|Super Great/i.test(name)) {
      const engine = name.match(/6D16|6D17|6D14|6M60/i)?.[0]?.toUpperCase() || '6D16';
      return [
        { brand: 'Mitsubishi Fuso', series: 'Fighter FK/FM', years: '1995–2010', engineCode: engine },
        { brand: 'Mitsubishi Fuso', series: 'Super Great FV/FP', years: '1998–2012', engineCode: engine }
      ];
    }
    if (/4M50|Canter/i.test(name)) {
      const engine = name.match(/4M50|4D34|4M42/i)?.[0]?.toUpperCase() || '4M50';
      return [
        { brand: 'Mitsubishi Fuso', series: 'Canter FE/FG', years: '2002–2016', engineCode: engine },
        { brand: 'Mitsubishi Fuso', series: 'Rosa Bus', years: '2004–2015', engineCode: engine }
      ];
    }
    return [
      { brand: 'Mitsubishi Fuso', series: 'Canter FE/FG', years: '2002–2016', engineCode: '4M50/4D34' },
      { brand: 'Mitsubishi Fuso', series: 'Fighter FK', years: '1996–2012', engineCode: '6D16' }
    ];
  }

  if (/Hino/i.test(name)) {
    if (/J08E|J08C|500|Profia|Ranger|700/i.test(name)) {
      const engine = name.match(/J08E|J08C|E13C|A09C/i)?.[0]?.toUpperCase() || 'J08E';
      return [
        { brand: 'Hino', series: '500 Series FG/FL', years: '2003–2018', engineCode: engine },
        { brand: 'Hino', series: '700 Series / Profia', years: '2004–2019', engineCode: engine }
      ];
    }
    if (/300|Dutro/i.test(name)) {
      const engine = name.match(/N04C|W04D/i)?.[0]?.toUpperCase() || 'N04C';
      return [
        { brand: 'Hino', series: '300 Series / Dutro', years: '2006–2020', engineCode: engine }
      ];
    }
    return [
      { brand: 'Hino', series: '500 Series FG/FL', years: '2003–2017', engineCode: 'J08E' },
      { brand: 'Hino', series: '300 Series Dutro', years: '2006–2019', engineCode: 'N04C' }
    ];
  }

  if (/Cummins|Freightliner|Cascadia/i.test(name)) {
    const engine = name.match(/ISX15|ISB6\.7|ISM11/i)?.[0]?.toUpperCase() || 'ISX15';
    return [
      { brand: 'Freightliner', series: 'Cascadia 113/125', years: '2008–2020', engineCode: engine },
      { brand: 'Kenworth', series: 'T680 / T880', years: '2012–2021', engineCode: engine }
    ];
  }

  if (/Scania/i.test(name)) {
    return [
      { brand: 'Scania', series: 'P-Series / G-Series', years: '2004–2018', engineCode: 'DC09 / DC13' },
      { brand: 'Scania', series: 'R-Series Heavy Duty', years: '2005–2020', engineCode: 'DC13 / DC16 V8' }
    ];
  }

  if (/Volvo/i.test(name)) {
    return [
      { brand: 'Volvo', series: 'FM / FMX Heavy Duty', years: '2005–2019', engineCode: 'D11 / D13' },
      { brand: 'Volvo', series: 'FH12 / FH16 Globetrotter', years: '2003–2018', engineCode: 'D13A / D16' }
    ];
  }

  if (/Peterbilt/i.test(name)) {
    return [
      { brand: 'Peterbilt', series: 'Model 389 / 579', years: '2007–2021', engineCode: 'PACCAR MX-13' },
      { brand: 'Peterbilt', series: 'Model 337 / 348 Medium Duty', years: '2010–2020', engineCode: 'PACCAR PX-7' }
    ];
  }

  if (/Kenworth/i.test(name)) {
    return [
      { brand: 'Kenworth', series: 'T680 / T880', years: '2012–2021', engineCode: 'PACCAR MX-13' },
      { brand: 'Kenworth', series: 'W900 Heavy Duty', years: '2000–2018', engineCode: 'Cummins ISX15' }
    ];
  }

  if (/Mack/i.test(name)) {
    return [
      { brand: 'Mack', series: 'Anthem / Pinnacle', years: '2008–2021', engineCode: 'Mack MP8' },
      { brand: 'Mack', series: 'Granite Vocational', years: '2006–2020', engineCode: 'Mack MP7' }
    ];
  }

  if (/Toyota|Dyna/i.test(name)) {
    return [
      { brand: 'Toyota', series: 'Dyna 200/300/400', years: '1999–2015', engineCode: '14B / 15B' },
      { brand: 'Hino', series: '300 Series Dutro', years: '2002–2016', engineCode: 'N04C' }
    ];
  }

  return [
    { brand: 'Isuzu', series: 'Elf NPR/NKR', years: '1995–2010', engineCode: '4HG1' },
    { brand: 'Mitsubishi Fuso', series: 'Canter FE', years: '2000–2014', engineCode: '4D34' }
  ];
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Starting compatibility migration (Mode: ${isDryRun ? 'DRY-RUN' : 'APPLY'})...`);

  const parts = await prisma.part.findMany({ select: { id: true, name: true, compatibleWith: true } });
  console.log(`Found ${parts.length} total parts in database.`);

  let updatedCount = 0;

  for (const part of parts) {
    const newCompat = deriveCompatibility(part.name);
    console.log(`\nPart [${part.name}]:`);
    console.log(` Old: ${JSON.stringify(part.compatibleWith)}`);
    console.log(` New: ${JSON.stringify(newCompat)}`);

    if (!isDryRun) {
      await prisma.part.update({
        where: { id: part.id },
        data: { compatibleWith: newCompat }
      });
      updatedCount++;
    }
  }

  if (isDryRun) {
    console.log(`\nDry run complete. No database changes were written.`);
  } else {
    console.log(`\nMigration complete. Successfully updated ${updatedCount} parts in place.`);
  }
}

if (process.argv[1]?.endsWith('migrate_compatibility.js')) {
  main()
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
