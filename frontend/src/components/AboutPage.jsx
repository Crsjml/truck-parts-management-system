import React from 'react';
import { MapPin, Phone, Envelope, Clock, Camera } from '@phosphor-icons/react';
import Reveal from './ui/Reveal';

// TODO(placeholder): 2015 is NOT the real founding year. It renders as a visible
// claim ("Trading since 2015" plus a derived years figure). Replace with the
// actual year before this page is shown to anyone outside the team.
const FOUNDING_YEAR = 2015;

// TODO: confirm this list against what is actually stocked on the floor.
const OEM_BRANDS = ['Cummins', 'Isuzu', 'Hino', 'Fuso', 'Mitsubishi', 'Nissan Diesel'];

// TODO: replace each slot with a real photograph of this shop.
const PHOTO_SLOTS = [
  { id: 'storefront', caption: 'The shop front on McArthur Highway' },
  { id: 'counter', caption: 'Parts counter and service desk' },
  { id: 'warehouse', caption: 'Warehouse racking and stock on hand' },
];

const CONTACT_ROWS = [
  { id: 'address', icon: MapPin, label: 'Address', value: 'Tarlac Truck Pitstop Building, McArthur Highway, Tarlac City, 2300' },
  { id: 'phone', icon: Phone, label: 'Phone', value: '+63 917 123 4567', href: 'tel:+639171234567' },
  { id: 'email', icon: Envelope, label: 'Email', value: 'wholesale@tarlactruckparts.local', href: 'mailto:wholesale@tarlactruckparts.local' },
  { id: 'hours', icon: Clock, label: 'Hours', value: 'Monday to Saturday, 8:00 AM to 5:00 PM. Closed Sunday.' },
];

export default function AboutPage() {
  const yearsInOperation = new Date().getFullYear() - FOUNDING_YEAR;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <Reveal>
        <section className="mb-16">
          <h1 className="mb-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
            A parts counter for people who need the truck moving today.
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            We stock replacement parts and maintenance supply for heavy commercial trucks and cargo
            fleets, out of a single location on McArthur Highway in Tarlac City.
          </p>
        </section>
      </Reveal>

      <Reveal delay={0.06}>
        <section aria-labelledby="years-heading" className="mb-16 flex flex-col gap-4 border-y border-border/40 py-10 sm:flex-row sm:items-baseline sm:gap-10">
          <p className="text-6xl font-bold leading-none tracking-tight text-foreground sm:text-7xl">
            {yearsInOperation}
          </p>
          <div>
            <h2 id="years-heading" className="text-lg font-bold tracking-tight text-foreground">
              Years serving Tarlac fleets
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Trading since {FOUNDING_YEAR}, from the same location.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal delay={0.06}>
        <section aria-labelledby="photos-heading" className="mb-16">
          <h2 id="photos-heading" className="mb-6 text-2xl font-bold tracking-tight text-foreground">
            The shop
          </h2>
          {/* Deliberate placeholders. Do not substitute stock photography: a generic
              truck image would misrepresent this specific business. */}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PHOTO_SLOTS.map((slot) => (
              <li
                key={slot.id}
                className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-secondary/40 p-6 text-center"
              >
                <Camera weight="duotone" className="h-7 w-7 text-muted-foreground" />
                <p className="text-xs font-medium leading-relaxed text-muted-foreground">{slot.caption}</p>
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      <Reveal delay={0.06}>
        <section aria-labelledby="brands-heading" className="mb-16">
          <h2 id="brands-heading" className="mb-6 text-2xl font-bold tracking-tight text-foreground">
            Brands we carry
          </h2>
          <ul className="flex flex-wrap gap-3">
            {OEM_BRANDS.map((brand) => (
              <li
                key={brand}
                className="rounded-full border border-border/50 bg-secondary/50 px-5 py-2.5 text-sm font-bold text-foreground"
              >
                {brand}
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      <Reveal delay={0.06}>
        <section aria-labelledby="contact-heading" className="mb-8">
          <h2 id="contact-heading" className="mb-6 text-2xl font-bold tracking-tight text-foreground">
            Contact us
          </h2>
          <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {CONTACT_ROWS.map((row) => (
              <div key={row.id} className="flex items-start gap-3">
                <row.icon weight="duotone" className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div>
                  <dt className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">{row.label}</dt>
                  <dd className="mt-1 text-sm font-medium leading-relaxed text-foreground">
                    {row.href ? (
                      <a href={row.href} className="transition-colors hover:text-accent">
                        {row.value}
                      </a>
                    ) : (
                      row.value
                    )}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </section>
      </Reveal>
    </div>
  );
}
