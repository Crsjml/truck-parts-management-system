import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, ChartLineUp, MapPin, Envelope, Phone, FacebookLogo, TwitterLogo, InstagramLogo } from '@phosphor-icons/react';
import Logo from './Logo';

export default function Footer({ className = "", variant = "default" }) {
  const currentYear = new Date().getFullYear();
  
  const isDark = variant === "dark";
  const bgClass = isDark ? "bg-black/20" : "bg-secondary/60 backdrop-blur-sm";
  const borderClass = isDark ? "border-slate-800/40" : "border-border/40 dark:border-slate-800/40";
  const textClass = isDark ? "text-slate-500" : "text-muted-foreground";
  const headingClass = isDark ? "text-slate-300" : "text-foreground";
  const iconAccent = isDark ? "text-red-500/60" : "text-accent";

  return (
    <footer className={`w-full ${bgClass} border-t ${borderClass} rounded-t-[2.5rem] px-6 py-10 lg:px-16 shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.05)] ${className}`}>
      <div className="max-w-7xl mx-auto grid gap-8 lg:gap-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo className="w-10 h-10" showText={true} />
          <p className={`text-xs ${textClass} leading-relaxed mt-4 font-medium`}>
            Tarlac Truck Pitstop is the region's trusted supplier of high-quality replacement parts, accessories, and maintenance solutions for heavy commercial trucks and cargo transport fleets.
          </p>
          <div className="flex gap-3 pt-2">
            <a href="#" className={`p-2 rounded-full border ${borderClass} hover:bg-secondary transition-colors`}>
              <FacebookLogo weight="duotone" className="w-4 h-4 text-brandBlue-500" />
            </a>
            <a href="#" className={`p-2 rounded-full border ${borderClass} hover:bg-secondary transition-colors`}>
              <TwitterLogo weight="duotone" className="w-4 h-4 text-sky-400" />
            </a>
            <a href="#" className={`p-2 rounded-full border ${borderClass} hover:bg-secondary transition-colors`}>
              <InstagramLogo weight="duotone" className="w-4 h-4 text-pink-500" />
            </a>
          </div>
        </div>

        <div>
          <h4 className={`font-bold ${headingClass} text-[13px] mb-4 uppercase tracking-[0.15em]`}>Quick Links</h4>
          <ul className={`space-y-3 text-xs font-semibold ${textClass}`}>
            <li><Link to="/" className="hover:text-accent transition-colors flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-accent/50" /> Home</Link></li>
            <li><Link to="/catalog" className="hover:text-accent transition-colors flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-accent/50" /> Parts Catalog</Link></li>
            <li><Link to="/contact" className="hover:text-accent transition-colors flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-accent/50" /> Wholesale Inquiry</Link></li>
            <li><Link to="/policy" className="hover:text-accent transition-colors flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-accent/50" /> Return Policy</Link></li>
          </ul>
        </div>

        <div className="lg:col-span-2 flex flex-col sm:flex-row gap-6">
          <div className="flex-1">
            <h4 className={`font-bold ${headingClass} text-[13px] mb-4 uppercase tracking-[0.15em]`}>Contact Us</h4>
            <div className={`rounded-2xl border ${borderClass} bg-background/30 p-5 relative overflow-hidden group h-[calc(100%-2.5rem)]`}>
              <div className="absolute right-0 top-0 w-1/2 opacity-[0.03] pointer-events-none flex items-start justify-end pr-2 pt-2">
                <MapPin weight="fill" className="w-20 h-20 text-foreground" />
              </div>
              <ul className={`space-y-3 text-xs ${textClass} relative z-10`}>
                <li className="flex items-start gap-3">
                  <MapPin weight="duotone" className={`w-4 h-4 shrink-0 mt-0.5 ${iconAccent}`} />
                  <span className={`font-medium ${headingClass} leading-relaxed`}>Tarlac Truck Pitstop Building,<br/>McArthur Highway, Tarlac City, 2300</span>
                </li>
                <li className="flex items-center gap-3">
                  <Envelope weight="duotone" className={`w-4 h-4 shrink-0 ${iconAccent}`} />
                  <span className="font-medium">wholesale@tarlactruckparts.local</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone weight="duotone" className={`w-4 h-4 shrink-0 ${iconAccent}`} />
                  <span className="font-medium">+63 917 123 4567</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex-1">
            <h4 className={`font-bold ${headingClass} text-[13px] mb-4 uppercase tracking-[0.15em]`}>Business Hours</h4>
            <div className={`rounded-2xl border ${borderClass} bg-background/30 p-5 h-[calc(100%-2.5rem)] flex flex-col justify-center`}>
              <ul className={`space-y-3 text-xs ${textClass}`}>
                <li className="flex justify-between items-center pb-2 border-b border-border/30">
                  <span className="font-semibold">Mon - Sat</span> 
                  <span className={`font-bold ${headingClass}`}>8:00 AM - 5:00 PM</span>
                </li>
                <li className="flex justify-between items-center pt-1">
                  <span className="font-semibold">Sunday</span> 
                  <span className="font-bold text-red-500">Closed</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className={`max-w-7xl mx-auto mt-10 pt-6 border-t ${borderClass} flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold ${textClass} uppercase tracking-wider`}>
        <p>&copy; {currentYear} Tarlac Truck Pitstop. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-default">
            <Wrench weight="fill" className={`w-3.5 h-3.5 ${iconAccent}`} />
            Wholesale Spare Parts
          </span>
          <span className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-default">
            <ChartLineUp weight="fill" className={`w-3.5 h-3.5 text-brandBlue-500`} />
            Logistics Intelligence
          </span>
        </div>
      </div>
    </footer>
  );
}
