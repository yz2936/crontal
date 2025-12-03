

import React, { useState } from 'react';

interface MarketingNavbarProps {
  onStart: () => void;
  onNavigate: (page: string) => void;
  darkMode?: boolean;
}

export const MarketingNavbar: React.FC<MarketingNavbarProps> = ({ onStart, onNavigate, darkMode = false }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const textClass = darkMode ? 'text-white hover:text-blue-400' : 'text-slate-500 hover:text-brandOrange';
  const logoTextClass = darkMode ? 'text-white' : 'text-slate-900';
  const logoSubTextClass = darkMode ? 'text-slate-400' : 'text-slate-400';
  const bgClass = darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200';

  const navItems = [
    { label: 'About', action: () => onNavigate('ABOUT') },
    { label: 'Blog', action: () => onNavigate('BLOG') },
    { label: 'Insights', action: () => onNavigate('INSIGHTS') },
    { label: 'Suppliers', action: () => onNavigate('SUPPLIER_LANDING') },
    { label: 'Tech', action: () => onNavigate('TECH') },
    { label: 'ROI Calc', action: () => onNavigate('ROI') },
  ];

  return (
    <nav className={`sticky top-0 z-50 backdrop-blur-md border-b ${bgClass} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('HOME')}>
            <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9 shadow-sm rounded-lg">
                <rect width="40" height="40" rx="8" fill="#0B1121"/>
                <path d="M12 20C12 15.5817 15.5817 12 20 12C22.25 12 24.28 12.93 25.76 14.43" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M12 20C12 24.4183 15.5817 28 20 28C22.25 28 24.28 27.07 25.76 25.57" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M22 20H32M32 20L28 16M32 20L28 24" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="flex flex-col">
              <span className={`text-lg font-bold tracking-tight leading-none ${logoTextClass}`}>CRONTAL</span>
              <span className={`text-[10px] uppercase tracking-[0.3em] leading-none mt-1 ${logoSubTextClass}`}>Automation</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className={`text-xs font-bold uppercase tracking-widest transition-colors ${textClass}`}
              >
                {item.label}
              </button>
            ))}
            <div className="h-4 w-px bg-slate-200/50 mx-2"></div>
             <button onClick={onStart} className={`text-xs font-bold uppercase tracking-widest transition-colors ${textClass}`}>Login</button>
            <button
              onClick={onStart}
              className="px-5 py-2 rounded-lg bg-brandOrange text-white text-xs font-bold uppercase tracking-wider hover:bg-orange-600 transition shadow-lg shadow-orange-500/20"
            >
              Start Demo
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={textClass}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden pt-4 pb-2 space-y-2 border-t border-slate-100 mt-4 animate-in slide-in-from-top-2">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => { item.action(); setIsMobileMenuOpen(false); }}
                className={`block w-full text-left py-3 px-2 text-sm font-bold ${textClass}`}
              >
                {item.label}
              </button>
            ))}
             <button
              onClick={() => { onStart(); setIsMobileMenuOpen(false); }}
              className="block w-full text-center mt-4 px-5 py-3 rounded-lg bg-brandOrange text-white text-sm font-bold uppercase tracking-wider hover:bg-orange-600 transition"
            >
              Start Demo
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};