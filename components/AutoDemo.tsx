
import React, { useState, useEffect } from 'react';

export const AutoDemo: React.FC = () => {
  const [step, setStep] = useState(0);

  // Cycle through 5 steps: 
  // 0: Ingest (Docs/Text)
  // 1: Structure (Table)
  // 2: Risk (Analysis)
  // 3: Compare (Quotes)
  // 4: Award (PO)
  
  useEffect(() => {
    const cycle = async () => {
      while (true) {
        setStep(0); await wait(3500); // Ingest
        setStep(1); await wait(5000); // Structure (Increased time to read table)
        setStep(2); await wait(3000); // Risk
        setStep(3); await wait(3000); // Compare
        setStep(4); await wait(4000); // Award
      }
    };
    cycle();
  }, []);

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper to manage the Inward "Suction" Animation
  const getDocStyle = (outerTransform: string, delay: number = 0) => {
    if (step === 0) {
        // STATE: Visible at Outer Position
        return {
            transform: outerTransform,
            opacity: 1,
            transition: `opacity 0.8s ease-out ${delay}ms`
        };
    } else if (step === 1) {
        // STATE: Moving to Center (Ingestion)
        return {
            transform: 'translate(0px, 0px) scale(0.2) rotate(0deg)',
            opacity: 0,
            transition: `transform 1.0s cubic-bezier(0.6, -0.05, 0.01, 0.99) ${delay}ms, opacity 0.3s ease-in ${delay + 600}ms`
        };
    } else {
        // STATE: Reset
        return {
            transform: outerTransform,
            opacity: 0,
            transition: 'none' 
        };
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Progress Bar */}
      <div className="flex justify-between items-center mb-6 px-4">
          {['Draft & Ingest', 'Structure', 'Risk Audit', 'Compare', 'Award PO'].map((label, i) => (
              <div key={i} className={`flex flex-col items-center gap-2 transition-all duration-500 ${step === i ? 'opacity-100 scale-105' : 'opacity-40 scale-95'}`}>
                  <div className={`w-3 h-3 rounded-full ${step >= i ? 'bg-brandOrange' : 'bg-slate-300'}`}></div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 hidden md:block">{label}</span>
              </div>
          ))}
      </div>

      {/* Main Stage */}
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl h-[450px] overflow-hidden flex flex-col">
          
          {/* Header */}
          <div className="h-10 bg-slate-50 border-b border-slate-100 flex items-center px-4 justify-between shrink-0">
              <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
              </div>
              <div className="text-[10px] font-bold text-slate-400 tracking-widest">CRONTAL WORKSPACE</div>
              <div className="w-10"></div>
          </div>

          <div className="flex-1 relative bg-slate-50/50 p-8 flex items-center justify-center overflow-hidden">

            {/* STEP 0: INGEST VISUALS */}
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ${step <= 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                
                {/* Visual Container */}
                <div className="relative w-full h-full flex items-center justify-center">
                    
                    {/* Background Grid */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                    {/* Central "AI Core" - FADES OUT ON STEP 1 to avoid overlap */}
                    <div className={`relative z-20 w-28 h-28 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl border-4 border-slate-100 transition-all duration-500 ${step === 1 ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}>
                         <svg className={`w-12 h-12 text-brandOrange ${step === 1 ? 'animate-spin' : 'animate-pulse'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{animationDuration: step === 1 ? '1s' : '2s'}}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                         </svg>
                         <div className="absolute -bottom-7 text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Processor</div>
                    </div>

                    {/* Document 1: Messy Email */}
                    <div className="absolute top-1/2 left-1/2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 p-3 z-10"
                         style={getDocStyle('translate(-180px, -80px) rotate(-6deg)', 0)}>
                        <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-1">
                            <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center text-blue-600"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
                            <div className="text-[10px] font-bold text-slate-700">Client Email</div>
                        </div>
                        <div className="space-y-1.5 opacity-60">
                             <div className="h-1.5 bg-slate-300 rounded w-full"></div>
                             <div className="h-1.5 bg-slate-300 rounded w-3/4"></div>
                             <div className="h-1.5 bg-slate-300 rounded w-5/6"></div>
                        </div>
                    </div>

                    {/* Document 2: PDF Drawing */}
                    <div className="absolute top-1/2 left-1/2 w-40 bg-white rounded-lg shadow-xl border border-slate-200 p-1 z-10"
                         style={getDocStyle('translate(140px, -60px) rotate(3deg)', 100)}>
                        <div className="bg-slate-100 h-28 rounded border border-slate-200 flex items-center justify-center relative overflow-hidden">
                             <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                 <svg className="w-16 h-16 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/></svg>
                             </div>
                             <div className="bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded absolute top-2 right-2 shadow-sm">PDF</div>
                        </div>
                        <div className="text-[9px] font-bold text-center mt-1.5 text-slate-600">Piping Spec A.pdf</div>
                    </div>

                    {/* Document 3: Excel MTO */}
                    <div className="absolute top-1/2 left-1/2 w-44 bg-white rounded-lg shadow-xl border border-slate-200 p-3 z-10"
                         style={getDocStyle('translate(-10px, 100px) rotate(2deg)', 200)}>
                        <div className="flex items-center gap-2 mb-2">
                             <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center text-green-600 font-bold text-[10px]">X</div>
                             <div className="text-[10px] font-bold text-slate-700">Material Takeoff.xlsx</div>
                        </div>
                        <div className="grid grid-cols-3 gap-1 opacity-70">
                             {[...Array(9)].map((_, i) => <div key={i} className="h-3 bg-slate-100 border border-slate-200 rounded-sm"></div>)}
                        </div>
                    </div>

                    {/* Connection Lines */}
                     <div className="absolute inset-0 pointer-events-none">
                         <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-blue-400 rounded-full" style={getDocStyle('translate(-150px, -70px)', 0)}></div>
                         <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-red-400 rounded-full" style={getDocStyle('translate(120px, -50px)', 100)}></div>
                         <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-green-400 rounded-full" style={getDocStyle('translate(-10px, 80px)', 200)}></div>
                     </div>

                </div>
            </div>

            {/* STEP 1: STRUCTURE (COMPLEX TABLE) */}
            <div className={`absolute inset-0 p-8 transition-all duration-700 ${step === 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                 <div className="bg-white w-full h-full rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col z-30 relative">
                    <div className="h-10 bg-slate-50 border-b border-slate-200 flex items-center px-4 justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Extracted Line Items (Preview)</span>
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">100% Parsed</span>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-[10px]">
                            <thead className="bg-slate-50 text-slate-400 border-b border-slate-200 sticky top-0 z-10">
                                <tr>
                                    <th className="py-2 px-3 font-medium">Line</th>
                                    <th className="py-2 px-3 font-medium">Description</th>
                                    <th className="py-2 px-3 font-medium">Size (OD x WT)</th>
                                    <th className="py-2 px-3 font-medium">Material / Grade</th>
                                    <th className="py-2 px-3 font-medium">Tech Specs</th>
                                    <th className="py-2 px-3 font-medium text-right">Qty</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[
                                    { l: "001", d: "Seamless Pipe", s: "6\" Sch40 (168.3mm)", m: "ASTM A106 Gr.B", t: "NACE MR0175, Smls", q: "500 m" },
                                    { l: "002", d: "Weld Neck Flange", s: "6\" #150 RF", m: "ASTM A105N", t: "ASME B16.5, Bore Sch40", q: "20 pcs" },
                                    { l: "003", d: "90 Deg Elbow", s: "6\" Sch40 LR", m: "ASTM A234 WPB", t: "ASME B16.9, Smls", q: "10 pcs" },
                                    { l: "004", d: "Gate Valve", s: "6\" #150 Flanged", m: "ASTM A216 WCB", t: "API 600, Trim 8", q: "5 pcs" },
                                    { l: "005", d: "Spiral Wound Gasket", s: "6\" #150", m: "SS316L / Graphite", t: "ASME B16.20, CGI", q: "50 pcs" },
                                    { l: "006", d: "Stud Bolts & Nuts", s: "3/4\" x 90mm", m: "A193 B7 / A194 2H", t: "Fluorocarbon Coated", q: "100 sets" }
                                ].map((row, i) => (
                                    <tr key={i} className="animate-in slide-in-from-left duration-300 hover:bg-slate-50" style={{animationDelay: `${i*100}ms`}}>
                                        <td className="py-2 px-3 font-mono text-slate-400">{row.l}</td>
                                        <td className="py-2 px-3 font-bold text-slate-800">{row.d}</td>
                                        <td className="py-2 px-3 font-mono text-slate-600">{row.s}</td>
                                        <td className="py-2 px-3 text-blue-600 font-medium">{row.m}</td>
                                        <td className="py-2 px-3 text-slate-500 italic truncate max-w-[150px]">{row.t}</td>
                                        <td className="py-2 px-3 font-bold text-slate-900 text-right">{row.q}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 </div>
            </div>

            {/* STEP 2: RISK AUDIT */}
            <div className={`absolute inset-0 p-8 transition-all duration-700 ${step === 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                 <div className="bg-white w-full h-full rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] z-20 animate-[scan_2s_ease-in-out_infinite]"></div>
                    <div className="p-4 mt-8 space-y-3">
                        <div className="flex items-center gap-4 p-3 bg-slate-50 rounded border border-slate-100 opacity-50">
                            <div className="w-4 h-4 rounded-full bg-green-500"></div>
                            <div className="h-2 w-32 bg-slate-200 rounded"></div>
                        </div>
                        <div className="flex items-center gap-4 p-3 bg-red-50 rounded border border-red-200 relative overflow-hidden">
                            <div className="absolute right-0 top-0 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl">RISK DETECTED</div>
                            <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
                            <div>
                                <div className="text-xs font-bold text-red-700">Missing Impact Test Specs</div>
                                <div className="text-[10px] text-red-500">Low Temp Service requires CVN (-46°C)</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-3 bg-slate-50 rounded border border-slate-100 opacity-50">
                            <div className="w-4 h-4 rounded-full bg-green-500"></div>
                            <div className="h-2 w-32 bg-slate-200 rounded"></div>
                        </div>
                        <div className="flex items-center gap-4 p-3 bg-amber-50 rounded border border-amber-200">
                             <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                             <div>
                                <div className="text-xs font-bold text-amber-700">Vague Coating Requirement</div>
                                <div className="text-[10px] text-amber-600">Standard 'Black' paint insufficient for offshore</div>
                             </div>
                        </div>
                    </div>
                 </div>
            </div>

            {/* STEP 3: COMPARE */}
            <div className={`absolute inset-0 p-8 transition-all duration-700 ${step === 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
                <div className="flex gap-4 h-full items-center justify-center">
                    <div className="w-1/3 h-48 bg-white border border-slate-200 rounded-xl p-4 shadow-sm opacity-50 scale-90">
                        <div className="text-xs font-bold text-slate-400 mb-2">Supplier A</div>
                        <div className="text-lg font-bold text-slate-800">$28,500</div>
                        <div className="text-[10px] text-slate-400 mt-2">Lead: 20 Days</div>
                    </div>
                    <div className="w-1/3 h-56 bg-white border-2 border-green-500 rounded-xl p-4 shadow-xl scale-110 relative z-10">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">BEST OFFER</div>
                        <div className="text-xs font-bold text-slate-400 mb-2">Global Steel</div>
                        <div className="text-2xl font-bold text-green-600">$24,200</div>
                        <div className="text-xs text-slate-500 mt-2 font-bold">Lead: 14 Days</div>
                        <div className="mt-4 w-full bg-green-500 h-8 rounded text-white text-xs font-bold flex items-center justify-center">Award</div>
                    </div>
                    <div className="w-1/3 h-48 bg-white border border-slate-200 rounded-xl p-4 shadow-sm opacity-50 scale-90">
                        <div className="text-xs font-bold text-slate-400 mb-2">Supplier C</div>
                        <div className="text-lg font-bold text-slate-800">$26,100</div>
                        <div className="text-[10px] text-slate-400 mt-2">Lead: 25 Days</div>
                    </div>
                </div>
            </div>

             {/* STEP 4: AWARD */}
             <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${step === 4 ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
                 <div className="bg-white w-64 h-80 shadow-2xl border border-slate-200 p-6 flex flex-col relative rotate-[-2deg]">
                     <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-2">
                         <div className="font-serif font-bold text-lg">PO</div>
                         <div className="text-[10px] text-slate-400">#44921</div>
                     </div>
                     <div className="space-y-2 mb-6">
                         <div className="h-2 w-full bg-slate-100 rounded"></div>
                         <div className="h-2 w-3/4 bg-slate-100 rounded"></div>
                         <div className="h-2 w-full bg-slate-100 rounded"></div>
                     </div>
                     <div className="mt-auto border-t border-slate-200 pt-4">
                         <div className="font-script text-xl text-blue-900 -rotate-2">John Doe</div>
                         <div className="text-[8px] text-slate-400 uppercase tracking-widest mt-1">Authorized Signature</div>
                     </div>
                     
                     {/* Stamp */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-12 border-4 border-green-600 text-green-600 font-black text-xl flex items-center justify-center -rotate-12 opacity-0 animate-[stamp_0.3s_ease-out_forwards_0.5s] bg-white/80 backdrop-blur-sm">
                         SENT
                     </div>
                 </div>
             </div>

          </div>
      </div>
    </div>
  );
}
