
import React from 'react';
import { ViewMode, Language, User } from '../types';
import { t } from '../utils/i18n';

interface LayoutProps {
  children: React.ReactNode;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  lang: Language;
  setLang: (l: Language) => void;
  user: User | null;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, view, setView, lang, setLang, user, onLogout }) => {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('HOME')}>
            {/* CRONTAL LOGO SVG */}
            <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9 rounded-lg">
                <rect width="40" height="40" rx="8" fill="#0B1121"/>
                <path d="M12 20C12 15.5817 15.5817 12 20 12C22.25 12 24.28 12.93 25.76 14.43" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M12 20C12 24.4183 15.5817 28 20 28C22.25 28 24.28 27.07 25.76 25.57" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M22 20H32M32 20L28 16M32 20L28 24" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">Crontal</h1>
                {view !== 'HOME' && (
                    <span className="inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-500 bg-white">
                    {view === 'BUYER' ? t(lang, 'buyer_portal') : t(lang, 'supplier_portal')}
                    </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {/* Simple View Switcher for Demo Purposes */}
            {view !== 'HOME' && user && (
                 <div className="flex bg-white rounded-full p-1 border border-slate-200 shadow-sm hidden md:flex">
                    <button 
                        onClick={() => setView('BUYER')}
                        className={`px-3 py-1 text-[11px] rounded-full font-medium transition ${view === 'BUYER' ? 'bg-accent text-white' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        {t(lang, 'buyer_portal')}
                    </button>
                    <button 
                        onClick={() => setView('SUPPLIER')}
                        className={`px-3 py-1 text-[11px] rounded-full font-medium transition ${view === 'SUPPLIER' ? 'bg-accent text-white' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        {t(lang, 'supplier_portal')}
                    </button>
                 </div>
            )}

            <select 
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-600 hover:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="zh">简体中文</option>
            </select>

            {user && (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-[11px] font-bold text-slate-700">{user.name}</p>
                  <p className="text-[10px] text-slate-400">{user.email}</p>
                </div>
                <button 
                  onClick={onLogout}
                  className="text-[11px] text-slate-500 hover:text-red-500 transition bg-white border border-slate-200 px-3 py-1.5 rounded-full"
                >
                  {t(lang, 'logout')}
                </button>
              </div>
            )}
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
};
