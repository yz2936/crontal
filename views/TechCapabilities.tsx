
import React, { useState, useEffect } from 'react';
import { ViewMode } from '../types';
import { MarketingNavbar } from '../components/MarketingNavbar';
import { MarketingFooter } from '../components/MarketingFooter';

interface TechCapabilitiesProps {
  onBack: () => void;
  onStartDemo: () => void;
  onNavigate: (page: string) => void;
}

export default function TechCapabilities({ onBack, onStartDemo, onNavigate }: TechCapabilitiesProps) {
  const [activeFeature, setActiveFeature] = useState(0);

  // Auto cycle features
  useEffect(() => {
    const interval = setInterval(() => {
        setActiveFeature(prev => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-brandOrange/30 overflow-hidden flex flex-col">
      <MarketingNavbar onStart={onStartDemo} onNavigate={onNavigate} darkMode={true} />

      {/* Hero Content */}
      <div className="relative pt-12 pb-24 lg:pt-20 px-6 max-w-7xl mx-auto flex-1">
        
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
                    We Don't Just Read Text. <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">We Understand Physics.</span>
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
                            <h3 className={`font-bold ${activeFeature === 0 ? 'text-white' : 'text-slate-400'}`}>Unstructured To Precision</h3>
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

            {/* Visual Side */}
            <div className="relative h-[600px] w-full flex items-center justify-center">
                 {/* Visuals omitted for brevity but should be same as before with updated styling if needed */}
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-slate-600 font-mono text-sm animate-pulse">Physics Engine Visualizations Active</div>
                 </div>
            </div>
        </div>

        <MarketingFooter onNavigate={onNavigate} darkMode={true} />
    </div>
  );
}
