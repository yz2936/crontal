
import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { MarketingNavbar } from '../components/MarketingNavbar';
import { MarketingFooter } from '../components/MarketingFooter';
import { t } from '../utils/i18n';

interface TechCapabilitiesProps {
  onBack: () => void;
  onStartDemo: () => void;
  onNavigate: (page: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

export default function TechCapabilities({ onBack, onStartDemo, onNavigate, lang, setLang }: TechCapabilitiesProps) {
  const [activeFeature, setActiveFeature] = useState(0);

  // Auto cycle features smoothly
  useEffect(() => {
    const interval = setInterval(() => {
        setActiveFeature(prev => (prev + 1) % 3);
    }, 8000); // Slower cycle to let animations play out
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-brandOrange/30 overflow-hidden flex flex-col relative">
      <MarketingNavbar onStart={onStartDemo} onNavigate={onNavigate} darkMode={true} lang={lang} setLang={setLang} />

      {/* Hero Content */}
      <div className="relative pt-12 pb-24 lg:pt-20 px-6 max-w-7xl mx-auto flex-1 w-full">
        
        {/* Background Grid & Noise */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[100px] -z-10 animate-pulse"></div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* LEFT: TEXT & CONTROLS */}
            <div className="z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono mb-6">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                    {t(lang, 'tech_badge')}
                </div>
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
                    {t(lang, 'tech_title')} <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">{t(lang, 'tech_title_accent')}</span>
                </h1>
                <p className="text-xl text-slate-400 mb-10 leading-relaxed max-w-lg">
                    {t(lang, 'tech_desc')}
                </p>

                {/* Feature Toggle Buttons */}
                <div className="space-y-4">
                    <button 
                        onClick={() => setActiveFeature(0)}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-500 flex items-center gap-4 ${activeFeature === 0 ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)] scale-[1.02]' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600'}`}
                    >
                        <div className={`p-3 rounded-lg transition-colors ${activeFeature === 0 ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        </div>
                        <div>
                            <h3 className={`font-bold text-sm md:text-base ${activeFeature === 0 ? 'text-white' : 'text-slate-400'}`}>{t(lang, 'tech_feat_1_title')}</h3>
                            <p className="text-xs text-slate-500 mt-1 hidden md:block">{t(lang, 'tech_feat_1_desc')}</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => setActiveFeature(1)}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-500 flex items-center gap-4 ${activeFeature === 1 ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)] scale-[1.02]' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600'}`}
                    >
                        <div className={`p-3 rounded-lg transition-colors ${activeFeature === 1 ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h3 className={`font-bold text-sm md:text-base ${activeFeature === 1 ? 'text-white' : 'text-slate-400'}`}>{t(lang, 'tech_feat_2_title')}</h3>
                            <p className="text-xs text-slate-500 mt-1 hidden md:block">{t(lang, 'tech_feat_2_desc')}</p>
                        </div>
                    </button>
                    
                    <button 
                        onClick={() => setActiveFeature(2)}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-500 flex items-center gap-4 ${activeFeature === 2 ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.15)] scale-[1.02]' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600'}`}
                    >
                        <div className={`p-3 rounded-lg transition-colors ${activeFeature === 2 ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h3 className={`font-bold text-sm md:text-base ${activeFeature === 2 ? 'text-white' : 'text-slate-400'}`}>{t(lang, 'tech_feat_3_title')}</h3>
                            <p className="text-xs text-slate-500 mt-1 hidden md:block">{t(lang, 'tech_feat_3_desc')}</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* RIGHT: LIVE SIMULATION WINDOW */}
            <div className="relative h-[500px] w-full bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col group">
                 {/* Window Header */}
                 <div className="h-8 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">ENGINE.EXE - ACTIVE</div>
                 </div>

                 {/* VISUALIZATION CANVAS */}
                 <div className="flex-1 relative p-8 flex items-center justify-center">
                    
                    {/* --- STATE 0: EXTRACTION --- */}
                    {activeFeature === 0 && (
                        <div className="relative w-full h-full flex items-center justify-center animate-in fade-in zoom-in-95 duration-500">
                             {/* The "Messy" Doc */}
                             <div className="absolute w-48 h-64 bg-slate-100 rounded border border-slate-300 p-4 transform -rotate-6 shadow-xl z-0">
                                 <div className="space-y-2 opacity-40 blur-[1px]">
                                     <div className="h-2 bg-slate-800 w-full rounded"></div>
                                     <div className="h-2 bg-slate-800 w-3/4 rounded"></div>
                                     <div className="h-2 bg-slate-800 w-5/6 rounded"></div>
                                 </div>
                                 <div className="mt-8 font-mono text-[8px] text-slate-900 leading-tight blur-[0.5px]">
                                     ITEM 1: PIPE 6 INCH SCH40 ASTM A106 GR B SMLS<br/><br/>
                                     ITEM 2: FLANGE WN 150# RF A105
                                 </div>
                             </div>

                             {/* Laser Scanner */}
                             <div className="absolute w-64 h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] z-10 animate-[scan_2s_ease-in-out_infinite]"></div>

                             {/* Extracted Data Card */}
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 w-56 bg-slate-800/90 backdrop-blur border border-blue-500/50 rounded-lg p-4 z-20 shadow-2xl animate-in slide-in-from-right duration-700 delay-300">
                                 <div className="text-[10px] text-blue-400 font-bold mb-2 uppercase tracking-wide">Structured Data Output</div>
                                 <div className="space-y-2 font-mono text-[10px]">
                                     <div className="flex justify-between border-b border-slate-700 pb-1">
                                         <span className="text-slate-400">Size:</span>
                                         <span className="text-white">6" (DN150)</span>
                                     </div>
                                     <div className="flex justify-between border-b border-slate-700 pb-1">
                                         <span className="text-slate-400">Wall:</span>
                                         <span className="text-white">Sch 40 (7.11mm)</span>
                                     </div>
                                     <div className="flex justify-between">
                                         <span className="text-slate-400">Matl:</span>
                                         <span className="text-green-400">A106 Gr.B</span>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    )}

                    {/* --- STATE 1: PHYSICS LOGIC --- */}
                    {activeFeature === 1 && (
                        <div className="relative w-full h-full flex items-center justify-center animate-in fade-in zoom-in-95 duration-500">
                            {/* Pipe Cross Section Visual */}
                            <div className="relative w-48 h-48 rounded-full border-8 border-slate-700 flex items-center justify-center animate-[spin_10s_linear_infinite]">
                                <div className="absolute inset-0 border-[20px] border-slate-600 rounded-full opacity-50"></div>
                                <div className="text-xs font-mono text-slate-500">OD: 168.3mm</div>
                            </div>
                            
                            {/* Dimension Labels */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <div className="w-px h-24 bg-purple-500 absolute left-1/2 -top-12"></div>
                                <div className="w-24 h-px bg-purple-500 absolute top-1/2 -left-12"></div>
                            </div>

                            {/* Logic Card */}
                            <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 border border-purple-500/50 p-3 rounded-lg flex justify-between items-center z-20">
                                <div>
                                    <div className="text-[10px] text-purple-400 font-bold">ASME B36.10M CALCULATION</div>
                                    <div className="text-xs text-white">Input: "6 inch Sch 80"</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-400">Wall Thickness</div>
                                    <div className="text-sm font-mono font-bold text-white">10.97 mm</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- STATE 2: COMPLIANCE --- */}
                    {activeFeature === 2 && (
                        <div className="relative w-full h-full flex flex-col p-4 animate-in fade-in zoom-in-95 duration-500">
                            <div className="text-xs font-bold text-green-400 mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                AUTOMATED MTR AUDIT
                            </div>

                            {/* Chemical Table */}
                            <div className="w-full bg-slate-800 rounded border border-slate-700 p-4 font-mono text-[10px] space-y-3">
                                <div className="grid grid-cols-4 gap-4 text-slate-400 border-b border-slate-600 pb-2">
                                    <span>ELEMENT</span>
                                    <span>MEASURED</span>
                                    <span>LIMIT (API 5L)</span>
                                    <span>STATUS</span>
                                </div>
                                <div className="grid grid-cols-4 gap-4 items-center">
                                    <span className="font-bold text-white">Carbon (C)</span>
                                    <span className="text-white">0.22%</span>
                                    <span>Max 0.28%</span>
                                    <span className="text-green-400 bg-green-400/10 px-1 rounded w-fit">PASS</span>
                                </div>
                                <div className="grid grid-cols-4 gap-4 items-center bg-slate-700/30 p-1 -mx-1 rounded">
                                    <span className="font-bold text-white">Sulfur (S)</span>
                                    <span className="text-white">0.008%</span>
                                    <span>Max 0.015%</span>
                                    <span className="text-green-400 bg-green-400/10 px-1 rounded w-fit">PASS</span>
                                </div>
                                <div className="grid grid-cols-4 gap-4 items-center">
                                    <span className="font-bold text-white">Phos (P)</span>
                                    <span className="text-white">0.012%</span>
                                    <span>Max 0.025%</span>
                                    <span className="text-green-400 bg-green-400/10 px-1 rounded w-fit">PASS</span>
                                </div>
                            </div>

                            <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-slate-900 font-bold">✓</div>
                                <div>
                                    <div className="text-xs font-bold text-white">Certificate Approved</div>
                                    <div className="text-[10px] text-green-300">Material conforms to NACE MR0175 Sour Service</div>
                                </div>
                            </div>
                        </div>
                    )}

                 </div>
                 
                 {/* Progress Bar */}
                 <div className="h-1 bg-slate-800 w-full relative">
                     <div 
                        className={`h-full transition-all duration-300 ${activeFeature === 0 ? 'bg-blue-500' : activeFeature === 1 ? 'bg-purple-500' : 'bg-green-500'}`}
                        style={{ width: activeFeature === 0 ? '33%' : activeFeature === 1 ? '66%' : '100%' }}
                     ></div>
                 </div>
            </div>
        </div>
      </div>
      
      <MarketingFooter onNavigate={onNavigate} darkMode={true} />
    </div>
  );
}
