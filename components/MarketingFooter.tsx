
import React from 'react';

interface MarketingFooterProps {
  onNavigate: (page: string) => void;
  darkMode?: boolean;
}

export const MarketingFooter: React.FC<MarketingFooterProps> = ({ onNavigate, darkMode = false }) => {
  const bgClass = darkMode ? 'bg-slate-900 border-t border-slate-800' : 'bg-slate-900 border-t border-slate-800';
  const textClass = 'text-slate-500 hover:text-white transition';

  return (
    <footer className={`${bgClass} py-16 text-slate-400`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-3 mb-6">
               <svg viewBox="0 0 40 40" fill="none" className="h-8 w-8 rounded-lg">
                    <rect width="40" height="40" rx="8" fill="#1e293b"/>
                    <path d="M12 20C12 15.5817 15.5817 12 20 12C22.25 12 24.28 12.93 25.76 14.43" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    <path d="M12 20C12 24.4183 15.5817 28 20 28C22.25 28 24.28 27.07 25.76 25.57" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    <path d="M22 20H32M32 20L28 16M32 20L28 24" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              <span className="font-bold text-white tracking-tight">CRONTAL</span>
            </div>
            <p className="text-xs leading-relaxed max-w-xs">
              Automating the chaos of technical procurement. We turn messy specs into structured data and audit for risks before they become costly errors.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-6">Platform</h4>
            <ul className="space-y-4 text-sm">
              <li><button onClick={() => onNavigate('QUALITY')} className={textClass}>Compliance Audit</button></li>
              <li><button onClick={() => onNavigate('ROI')} className={textClass}>ROI Calculator</button></li>
              <li><button onClick={() => onNavigate('SUPPLIER_LANDING')} className={textClass}>Supplier Portal</button></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-6">Company</h4>
            <ul className="space-y-4 text-sm">
              <li><button onClick={() => onNavigate('ABOUT')} className={textClass}>About Us</button></li>
              <li><button onClick={() => onNavigate('BLOG')} className={textClass}>Engineering Blog</button></li>
              <li><button onClick={() => onNavigate('PRIVACY')} className={textClass}>Privacy Policy</button></li>
              <li><button onClick={() => onNavigate('TERMS')} className={textClass}>Terms of Service</button></li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-6">Connect</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="mailto:hello@crontal.com" className={textClass}>hello@crontal.com</a></li>
              <li><a href="#" className={textClass}>LinkedIn</a></li>
              <li><a href="#" className={textClass}>Twitter / X</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] uppercase tracking-widest font-bold">© 2024 Crontal Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-green-500">Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
