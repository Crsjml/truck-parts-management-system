import React from 'react';
import Logo from './Logo';

export default function Footer({ className = '', onOpenPolicy, onGoHome, onGoCatalog, onGoAbout }) {
  const currentYear = new Date().getFullYear();

  const links = [
    { label: 'Home', onClick: onGoHome },
    { label: 'Parts Catalog', onClick: onGoCatalog },
    { label: 'About & Contact', onClick: onGoAbout },
    { label: 'Return Policy', onClick: onOpenPolicy },
  ];

  return (
    <footer className={`w-full border-t border-border/40 px-6 py-10 lg:px-16 ${className}`}>
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Logo className="h-9 w-9" showText={true} />
          <p className="max-w-md text-xs font-medium leading-relaxed text-muted-foreground">
            Replacement parts and maintenance supply for heavy commercial trucks, out of Tarlac City.
          </p>
        </div>

        <div className="flex flex-col gap-4 border-t border-border/40 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {links.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={link.onClick}
                    className="min-h-[1.5rem] text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
            &copy; {currentYear} Tarlac Truck Pitstop
          </p>
        </div>
      </div>
    </footer>
  );
}
