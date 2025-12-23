
import React, { useState } from 'react';
import { Language } from '../types';

interface MarketingNavbarProps {
  onStart: () => void;
  onNavigate: (page: string) => void;
  darkMode?: boolean;
  lang?: Language;
  setLang?: (lang: Language) => void;
}

export const MarketingNavbar: React.FC<MarketingNavbarProps> = ({ onStart, onNavigate, darkMode = false, lang = 'en', setLang }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCapabilitiesOpen, setIsCapabilitiesOpen] = useState(false);

  const textClass = darkMode ? 'text-white hover:text-blue-400' : 'text-slate-500 hover:text-brandOrange';
  const logoTextClass = darkMode ? 'text-white' : 'text-slate-900';
  const logoSubTextClass = darkMode ? 'text-slate-400' : 'text-slate-400';
  const bgClass = darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200';

  const capabilities = [
    { label: 'AI Structuring', id: 'structuring', desc: 'PDF to JSON' },
    { label: 'Tech Validation', id: 'validation', desc: 'ASTM/API Check' },
    { label: 'Supplier Mgmt', id: 'sourcing', desc: 'Secure Portal' },
    { label: 'Bid Comparison', id: 'comparison', desc: 'Real-time Matrix' },
    { label: 'Auto Awarding', id: 'awarding', desc: 'Instant POs' },
  ];

  const navItems = [
    { label: 'About', action: () => onNavigate('ABOUT') },
    { label: 'Blog', action: () => onNavigate('BLOG') },
    { label: 'Insights', action: () => onNavigate('INSIGHTS') },
    { label: 'Suppliers', action: () => onNavigate('SUPPLIER_LANDING') },
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
          <div className="hidden md:flex items-center gap-6">
            
            {/* Capabilities Dropdown */}
            <div 
                className="relative group h-full"
                onMouseEnter={() => setIsCapabilitiesOpen(true)}
                onMouseLeave={() => setIsCapabilitiesOpen(false)}
            >
                <button 
                    className={`flex items-center gap-1 text-xs font-bold uppercase tracking-widest transition-colors ${textClass} py-2`}
                >
                    Capabilities
                    <svg className={`w-3 h-3 transition-transform ${isCapabilitiesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                
                {/* Dropdown Content */}
                <div className={`absolute top-full left-0 w-56 pt-2 transition-all duration-200 transform origin-top-left ${isCapabilitiesOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}>
                    <div className={`rounded-xl border shadow-xl p-2 flex flex-col gap-1 ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                        {capabilities.map(cap => (
                            <button
                                key={cap.id}
                                onClick={() => { onNavigate(`CAPABILITY:${cap.id}`); setIsCapabilitiesOpen(false); }}
                                className={`text-left px-4 py-3 rounded-lg flex flex-col group/item transition-colors ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
                            >
                                <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'} group-hover/item:text-brandOrange transition-colors`}>{cap.label}</span>
                                <span className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{cap.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className={`text-xs font-bold uppercase tracking-widest transition-colors ${textClass}`}
              >
                {item.label}
              </button>
            ))}
            
            {/* Language Selector */}
            {setLang && (
                <div className="flex items-center bg-slate-100/10 rounded-lg p-1 border border-slate-200/20">
                    <select 
                        value={lang}
                        onChange={(e) => setLang(e.target.value as Language)}
                        className={`bg-transparent text-[10px] font-bold uppercase outline-none cursor-pointer ${darkMode ? 'text-white' : 'text-slate-600'}`}
                    >
                        <option value="en" className="text-slate-900">EN</option>
                        <option value="es" className="text-slate-900">ES</option>
                        <option value="zh" className="text-slate-900">ZH</option>
                    </select>
                </div>
            )}

            <div className="h-4 w-px bg-slate-200/50 mx-1"></div>
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
          <div className="md:hidden pt-4 pb-2 space-y-1 border-t border-slate-100 mt-4 animate-in slide-in-from-top-2">
            <div className="px-2 py-2">
                <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Capabilities</p>
                {capabilities.map((cap) => (
                    <button
                        key={cap.id}
                        onClick={() => { onNavigate(`CAPABILITY:${cap.id}`); setIsMobileMenuOpen(false); }}
                        className={`block w-full text-left py-2 px-2 text-sm font-medium ${textClass}`}
                    >
                        {cap.label}
                    </button>
                ))}
            </div>
            <div className="h-px bg-slate-200/50 my-2"></div>
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