
import React, { useState, useEffect } from 'react';
import { ViewMode } from '../types';

interface TechCapabilitiesProps {
  onBack: () => void;
  onStartDemo: () => void;
}

export default function TechCapabilities({ onBack, onStartDemo }: TechCapabilitiesProps) {
  const [activeFeature, setActiveFeature] = useState(0);

  // Auto cycle features
  useEffect(() => {
    const interval = setInterval(() => {
        setActiveFeature(prev => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-brandOrange/30 overflow-hidden">
      
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-20">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
          <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10 shadow-[0_0_20px_rgba(59,130,246,0.5)] rounded-lg">
                <rect width="40" height="40" rx="8" fill="#3b82f6"/>
                <path d="M12 20C12 15.5817 15.5817 12 20 12C22.25 12 24.28 12.93 25.76 14.43" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M12 20C12 24.4183 15.5817 28 20 28C22.25 28 24.28 27.07 25.76 25.57" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M22 20H32M32 20L28 16M32 20L28 24" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          <span className="text-xl font-bold tracking-tight">Crontal <span className="text-blue-400 font-mono text-xs ml-1">/// TECH_PREVIEW</span></span>
        </div>
        <button 
          onClick={onStartDemo}
          className="bg-white text-slate-900 px-6 py-2 rounded-full text-sm font-bold hover:bg-blue-50 transition"
        >
          Launch Demo
        </button>
      </nav>

      {/* Hero Content */}
      <div className="relative pt-12 pb-24 lg:pt-20 px-6 max-w-7xl mx-auto">
        
        {/* Background Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Text Side */}
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono mb-6">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                    ENGINEERING INTELLIGENCE ENGINE V2.5
                </div>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
                    We don't just read text. <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">We understand Physics.</span>
                </h1>
                <p className="text-xl text-slate-400 mb-10 leading-relaxed max-w-lg">
                    Other apps match keywords. Crontal parses <strong>ASTM standards</strong>, calculates <strong>Wall Thickness schedules</strong>, and verifies <strong>MTR compliance</strong> automatically from messy scanned documents.
                </p>

                {/* Feature Toggle Buttons */}
                <div className="space-y-4">
                    <button 
                        onClick={() => setActiveFeature(0)}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${activeFeature === 0 ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)]' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}`}
                    >
                        <div className={`p-3 rounded-lg ${activeFeature === 0 ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        </div>
                        <div>
                            <h3 className={`font-bold ${activeFeature === 0 ? 'text-white' : 'text-slate-400'}`}>Unstructured to Precision</h3>
                            <p className="text-xs text-slate-500 mt-1">Extracts exact specs from messy scanned PDFs.</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => setActiveFeature(1)}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${activeFeature === 1 ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}`}
                    >
                        <div className={`p-3 rounded-lg ${activeFeature === 1 ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h3 className={`font-bold ${activeFeature === 1 ? 'text-white' : 'text-slate-400'}`}>Compliance Guard™</h3>
                            <p className="text-xs text-slate-500 mt-1">Checks for NACE MR0175, MTR 3.1, and Impact Testing.</p>
                        </div>
                    </button>
                    
                    <button 
                        onClick={() => setActiveFeature(2)}
                        className={`w-full text-left p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${activeFeature === 2 ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.15)]' : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'}`}
                    >
                        <div className={`p-3 rounded-lg ${activeFeature === 2 ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h3 className={`font-bold ${activeFeature === 2 ? 'text-white' : 'text-slate-400'}`}>Global Translation</h3>
                            <p className="text-xs text-slate-500 mt-1">Technical terms preserved. Commercial terms translated.</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Visual Side (Dynamic X-Ray) */}
            <div className="relative h-[600px] w-full flex items-center justify-center">
                
                {/* Feature 0: Physics Extraction Visual */}
                <div className={`absolute inset-0 transition-opacity duration-500 flex flex-col items-center justify-center ${activeFeature === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    {/* The "Messy" Scanned Input */}
                    <div className="relative bg-[#f4f4f9] p-5 rounded shadow-2xl w-96 rotate-1 border border-slate-400 mb-10 origin-center transform transition hover:rotate-0 hover:scale-105 duration-500">
                        {/* Paper Texture Overlay */}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
                        <div className="absolute top-2 right-2 text-[9px] text-slate-400 font-mono rotate-90">SCANNED_IMG_0042.jpg</div>
                        
                        {/* Messy Content */}
                        <div className="font-mono text-xs text-slate-800 leading-relaxed opacity-80" style={{fontFamily: '"Courier New", Courier, monospace'}}>
                            <div className="border-b-2 border-slate-800 pb-1 mb-2 flex justify-between font-bold tracking-tighter">
                                <span>ITEM</span><span className="pl-4">DESCRIPTION</span><span>QTY</span>
                            </div>
                            <div className="flex gap-4 items-start mb-4">
                                <span className="font-bold">001</span>
                                <span className="text-[11px] font-bold leading-tight uppercase blur-[0.3px]">
                                    PIPE, SMLS, 8 IN, SCH 80<br/>
                                    API 5L GR.B PSL2, BEVELED<br/>
                                    ENDS, SOUR SERVICE
                                </span>
                                <span className="font-bold">200</span>
                            </div>
                            <div className="text-[9px] text-slate-600 border border-slate-400 p-1 inline-block rotate-[-1deg]">
                                NOTE: MTR EN10204 3.1 REQ. <br/> NACE MR0175 COMPLIANT.
                            </div>
                        </div>
                        {/* Scanning Laser Animation */}
                        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-blue-500/20 to-transparent -translate-y-full animate-[scan_3s_ease-in-out_infinite] pointer-events-none"></div>
                    </div>

                    {/* Connection Lines (SVG) */}
                    <svg className="w-96 h-16 text-blue-500 overflow-visible mb-2 -mt-6 relative z-0">
                         <path d="M200 0 V16" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="opacity-50" />
                         <path d="M200 16 L60 50" stroke="currentColor" strokeWidth="1" className="animate-[draw_1s_ease-out_forwards]" />
                         <path d="M200 16 L200 50" stroke="currentColor" strokeWidth="1" className="animate-[draw_1s_ease-out_forwards]" />
                         <path d="M200 16 L340 50" stroke="currentColor" strokeWidth="1" className="animate-[draw_1s_ease-out_forwards]" />
                         <circle cx="200" cy="16" r="3" fill="currentColor" className="animate-ping" />
                    </svg>

                    {/* The Output Cards (Structured) */}
                    <div className="flex gap-4">
                        <div className="bg-slate-900 border border-green-500/30 p-4 rounded-xl w-36 shadow-[0_0_20px_rgba(34,197,94,0.1)] animate-in slide-in-from-bottom-4 fade-in duration-700">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Standard Detected</div>
                            <div className="text-sm font-bold text-white leading-tight">API 5L PSL2</div>
                            <div className="text-[10px] text-green-400 mt-1 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                NACE MR0175
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-blue-500/30 p-4 rounded-xl w-36 shadow-[0_0_20px_rgba(59,130,246,0.2)] animate-in slide-in-from-bottom-4 fade-in duration-700 delay-100">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Calculated Size</div>
                            <div className="flex justify-between items-end border-b border-slate-800 pb-1 mb-1">
                                <span className="text-[10px] text-slate-400">OD</span>
                                <span className="text-sm font-bold text-white">219.1<span className="text-[10px] font-normal text-slate-500">mm</span></span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] text-slate-400">WT</span>
                                <span className="text-sm font-bold text-blue-400">12.7<span className="text-[10px] font-normal text-slate-500">mm</span></span>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-purple-500/30 p-4 rounded-xl w-36 shadow-[0_0_20px_rgba(168,85,247,0.2)] animate-in slide-in-from-bottom-4 fade-in duration-700 delay-200">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">Material</div>
                            <div className="text-sm font-bold text-white">Carbon Steel</div>
                            <div className="text-[10px] text-purple-400 mt-1">Grade B</div>
                        </div>
                    </div>
                </div>

                 {/* Feature 1: Compliance Visual */}
                 <div className={`absolute inset-0 transition-opacity duration-500 flex flex-col items-center justify-center ${activeFeature === 1 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <div className="relative w-80 h-96 bg-white rounded-lg shadow-2xl p-6 rotate-3">
                         <div className="absolute top-4 right-4 text-slate-200 text-4xl font-black">MTR</div>
                         <div className="h-4 w-1/3 bg-slate-200 rounded mb-4"></div>
                         <div className="space-y-2">
                             <div className="h-2 w-full bg-slate-100 rounded"></div>
                             <div className="h-2 w-5/6 bg-slate-100 rounded"></div>
                             <div className="h-2 w-full bg-slate-100 rounded"></div>
                             <div className="h-2 w-4/6 bg-slate-100 rounded"></div>
                         </div>
                         <div className="mt-8 border-t border-slate-100 pt-4">
                             <div className="flex justify-between items-center bg-green-50 p-2 rounded border border-green-100">
                                 <span className="text-xs text-green-800 font-bold">✓ Chemical Analysis</span>
                                 <span className="text-xs text-green-600">PASS</span>
                             </div>
                             <div className="flex justify-between items-center bg-green-50 p-2 rounded border border-green-100 mt-2">
                                 <span className="text-xs text-green-800 font-bold">✓ Mechanical Props</span>
                                 <span className="text-xs text-green-600">PASS</span>
                             </div>
                             <div className="flex justify-between items-center bg-red-50 p-2 rounded border border-red-100 mt-2 animate-pulse">
                                 <span className="text-xs text-red-800 font-bold">⚠ Impact Test (-50°C)</span>
                                 <span className="text-xs text-red-600">MISSING</span>
                             </div>
                         </div>
                         {/* Stamp */}
                         <div className="absolute bottom-6 right-6 w-24 h-24 border-4 border-purple-500 rounded-full flex items-center justify-center -rotate-12 opacity-50">
                             <span className="text-purple-500 font-black text-xl">REVIEWED</span>
                         </div>
                    </div>
                 </div>

                 {/* Feature 2: Translation */}
                 <div className={`absolute inset-0 transition-opacity duration-500 flex flex-col items-center justify-center ${activeFeature === 2 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <div className="flex items-center gap-8">
                        {/* US */}
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 w-64">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">🇺🇸</span>
                                <span className="text-xs text-slate-400 font-bold tracking-wider">SOURCE</span>
                            </div>
                            <p className="text-white font-mono text-sm">"Seamless Pipe"</p>
                            <p className="text-white font-mono text-sm mt-2">"Weld Neck Flange"</p>
                            <p className="text-white font-mono text-sm mt-2">"Delivery: EXW"</p>
                        </div>

                        {/* Arrow */}
                        <div className="text-green-500">
                             <svg className="w-8 h-8 animate-bounce-x" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </div>

                        {/* CN */}
                        <div className="bg-slate-800 p-6 rounded-2xl border border-green-500/30 w-64 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">🇨🇳</span>
                                <span className="text-xs text-green-400 font-bold tracking-wider">TARGET</span>
                            </div>
                            <p className="text-white font-sans text-sm">"无缝钢管"</p>
                            <p className="text-white font-sans text-sm mt-2">"对焊法兰"</p>
                            <p className="text-white font-sans text-sm mt-2">"交货条款: 工厂交货"</p>
                        </div>
                    </div>
                 </div>

            </div>
        </div>
      </div>
    </div>
  );
}
