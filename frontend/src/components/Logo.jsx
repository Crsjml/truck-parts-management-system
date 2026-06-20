import React from 'react';

export default function Logo({ className = "w-12 h-12", showText = true }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`relative ${className} shrink-0`}>
        {/* Vector SVG Representation of Tarlac Truck Parts Logo */}
        <svg viewBox="0 0 300 300" className="w-full h-full filter drop-shadow-[0_0_8px_rgba(220,38,38,0.2)]">
          {/* Background Pistons (Crossed) */}
          <g stroke="#1e3a8a" strokeWidth="6" fill="#0f172a">
            {/* Top Left Piston Head */}
            <path d="M40,40 L90,90 M30,50 L80,100" strokeWidth="4" />
            <rect x="25" y="25" width="45" height="30" rx="3" transform="rotate(-45 47 40)" fill="#1e3a8a" stroke="#e2e8f0" strokeWidth="3" />
            <line x1="30" y1="50" x2="60" y2="20" stroke="#e2e8f0" strokeWidth="3" />
            
            {/* Top Right Piston Head */}
            <rect x="230" y="25" width="45" height="30" rx="3" transform="rotate(45 252 40)" fill="#1e3a8a" stroke="#e2e8f0" strokeWidth="3" />
            
            {/* Connecting Rod Shafts */}
            {/* Left Shaft */}
            <line x1="60" y1="60" x2="110" y2="110" stroke="#e2e8f0" strokeWidth="8" />
            <line x1="60" y1="60" x2="110" y2="110" stroke="#1b365d" strokeWidth="4" />
            {/* Right Shaft */}
            <line x1="240" y1="60" x2="190" y2="110" stroke="#e2e8f0" strokeWidth="8" />
            <line x1="240" y1="60" x2="190" y2="110" stroke="#1b365d" strokeWidth="4" />
            
            {/* Bottom Rod Caps */}
            <circle cx="120" cy="120" r="16" fill="#0f172a" stroke="#e2e8f0" strokeWidth="5" />
            <circle cx="120" cy="120" r="6" fill="#1b365d" />
            <circle cx="180" cy="120" r="16" fill="#0f172a" stroke="#e2e8f0" strokeWidth="5" />
            <circle cx="180" cy="120" r="6" fill="#1b365d" />
          </g>

          {/* Central Gear (Crimson Red) */}
          <g fill="#dc2626" stroke="#ffffff" strokeWidth="2.5">
            <circle cx="150" cy="150" r="70" />
            
            {/* Gear Teeth */}
            {[...Array(12)].map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const x1 = 150 + 65 * Math.cos(angle);
              const y1 = 150 + 65 * Math.sin(angle);
              const x2 = 150 + 82 * Math.cos(angle);
              const y2 = 150 + 82 * Math.sin(angle);
              
              return (
                <path 
                  key={i} 
                  d={`M ${x1 - 10 * Math.sin(angle)} ${y1 + 10 * Math.cos(angle)} 
                     L ${x2 - 8 * Math.sin(angle)} ${y2 + 8 * Math.cos(angle)} 
                     L ${x2 + 8 * Math.sin(angle)} ${y2 - 8 * Math.cos(angle)} 
                     L ${x1 + 10 * Math.sin(angle)} ${y1 - 10 * Math.cos(angle)} Z`} 
                />
              );
            })}
          </g>

          {/* Inner Blue Ring */}
          <circle cx="150" cy="150" r="48" fill="none" stroke="#1b365d" strokeWidth="10" />
          <circle cx="150" cy="150" r="53" fill="none" stroke="#ffffff" strokeWidth="2" />
          <circle cx="150" cy="150" r="43" fill="none" stroke="#ffffff" strokeWidth="2" />
          <circle cx="150" cy="150" r="35" fill="#ffffff" />

          {/* Central Banner (White block with red trim) */}
          <rect x="15" y="128" width="270" height="44" rx="4" fill="#ffffff" stroke="#dc2626" strokeWidth="4" />
          <line x1="20" y1="134" x2="280" y2="134" stroke="#1b365d" strokeWidth="2" />
          <line x1="20" y1="166" x2="280" y2="166" stroke="#1b365d" strokeWidth="2" />

          {/* Banner Text */}
          <text 
            x="150" 
            y="151" 
            textAnchor="middle" 
            fontFamily="'Outfit', sans-serif" 
            fontWeight="900" 
            fontSize="21" 
            fill="#1b365d"
            letterSpacing="0.5"
          >
            TARLAC TRUCK
          </text>
          <text 
            x="150" 
            y="167" 
            textAnchor="middle" 
            fontFamily="'Outfit', sans-serif" 
            fontWeight="800" 
            fontSize="12" 
            fill="#dc2626"
            letterSpacing="2"
          >
            PARTS
          </text>
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="text-lg font-extrabold tracking-wider text-foreground uppercase leading-none font-display">
            Tarlac Truck
          </span>
          <span className="text-xs font-bold tracking-[0.25em] text-red-500 uppercase leading-none mt-1">
            Parts Catalog
          </span>
        </div>
      )}
    </div>
  );
}
