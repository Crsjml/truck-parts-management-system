import { 
  Wrench, CarProfile, Lightbulb, Engine, 
  Wind, Lightning, Shield, Warning, Gear, 
  Target, SquaresFour, Drop, Truck, Database, Power,
  Thermometer, Fan, BatteryFull, Nut, Screwdriver,
  Tire, SteeringWheel, GasPump, Key, Sparkle
} from '@phosphor-icons/react';

export const ICON_MAP = {
  Wrench, CarProfile, Lightbulb, Engine, 
  Wind, Lightning, Shield, Warning, Gear, 
  Target, SquaresFour, Drop, Truck, Database, Power,
  Thermometer, Fan, BatteryFull, Nut, Screwdriver,
  Tire, SteeringWheel, GasPump, Key, Sparkle
};

export const COLOR_THEMES = {
  red: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20',
  rose: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
  pink: 'text-pink-600 dark:text-pink-400 bg-pink-500/10 border-pink-500/20',
  orange: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20',
  amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  yellow: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  lime: 'text-lime-600 dark:text-lime-400 bg-lime-500/10 border-lime-500/20',
  emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  teal: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20',
  cyan: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  sky: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
  blue: 'text-brandBlue-600 dark:text-brandBlue-400 bg-brandBlue-500/10 border-brandBlue-500/20',
  indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  violet: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/20',
  purple: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
  fuchsia: 'text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
  slate: 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20',
  gray: 'text-gray-500 dark:text-gray-400 bg-gray-500/10 border-gray-500/20',
  zinc: 'text-zinc-600 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  stone: 'text-stone-600 dark:text-stone-400 bg-stone-500/10 border-stone-500/20'
};

// Extracted from original hardcoded logic
export const autoSuggest = (categoryName) => {
  const name = (categoryName || '').toLowerCase();
  
  if (name.includes('brake') && !name.includes('valve')) return { iconName: 'Shield', colorTheme: 'red' };
  if (name.includes('valve') || name.includes('caliper')) return { iconName: 'Target', colorTheme: 'rose' };
  if (name.includes('piston') || name.includes('cylinder')) return { iconName: 'Database', colorTheme: 'fuchsia' };
  if (name.includes('turbo') || name.includes('exhaust')) return { iconName: 'Wind', colorTheme: 'sky' };
  if (name.includes('cool') || name.includes('water') || name.includes('pump') || name.includes('fluid')) return { iconName: 'Drop', colorTheme: 'cyan' };
  if (name.includes('starter') || name.includes('ignition')) return { iconName: 'Power', colorTheme: 'indigo' };
  if (name.includes('light') || name.includes('lamp')) return { iconName: 'Lightbulb', colorTheme: 'yellow' };
  if (name.includes('engine') || name.includes('motor')) return { iconName: 'Engine', colorTheme: 'orange' };
  if (name.includes('electr') || name.includes('battery') || name.includes('wire')) return { iconName: 'Lightning', colorTheme: 'amber' };
  if (name.includes('transmission') || name.includes('gear') || name.includes('clutch')) return { iconName: 'Gear', colorTheme: 'purple' };
  if (name.includes('suspension') || name.includes('shock')) return { iconName: 'CarProfile', colorTheme: 'emerald' };
  if (name.includes('body') || name.includes('exterior') || name.includes('cab'))  return { iconName: 'SquaresFour', colorTheme: 'slate' };
  if (name.includes('filter')) return { iconName: 'Nut', colorTheme: 'gray' };
  if (name.includes('sensor')) return { iconName: 'Thermometer', colorTheme: 'blue' };
  if (name.includes('fuel')) return { iconName: 'GasPump', colorTheme: 'red' };
  if (name.includes('tire') || name.includes('wheel')) return { iconName: 'Tire', colorTheme: 'slate' };
  
  return null; // Return null if no clear suggestion exists so we don't aggressively overwrite manual choices
};

// Backwards compatibility layer for categories that don't have DB-saved icon/color yet
export const getCategoryIconAndColor = (categoryName, dbIconName, dbColorTheme) => {
  let finalIconName = dbIconName;
  let finalColorTheme = dbColorTheme;

  if (!finalIconName || !ICON_MAP[finalIconName]) {
    const suggestion = autoSuggest(categoryName);
    if (suggestion) {
      finalIconName = suggestion.iconName;
      finalColorTheme = suggestion.colorTheme;
    } else {
      finalIconName = 'Wrench';
      finalColorTheme = 'gray';
    }
  }

  // Ensure valid color theme
  if (!finalColorTheme || !COLOR_THEMES[finalColorTheme]) {
    finalColorTheme = 'gray';
  }

  const Icon = ICON_MAP[finalIconName] || Wrench;
  const colorStr = COLOR_THEMES[finalColorTheme];
  const bg = colorStr.split(' ').find(c => c.startsWith('bg-')) || 'bg-gray-500/10';

  return { Icon, color: colorStr, bg };
};

export const getCategoryPlaceholder = (categoryName) => {
  if (!categoryName) return '/placeholders/general.png';
  const name = categoryName.toLowerCase();
  
  if (name.includes('engine') || name.includes('transmission') || name.includes('drivetrain') || name.includes('piston') || name.includes('cooling')) {
    return '/placeholders/engine.png';
  }
  
  if (name.includes('electric') || name.includes('battery') || name.includes('lighting') || name.includes('alternator') || name.includes('starter')) {
    return '/placeholders/electrical.png';
  }
  
  return '/placeholders/general.png';
};
