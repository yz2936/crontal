import React, { useEffect, useRef, useState } from 'react';
import { Language } from '../types';

interface LandingPageProps {
  onStart: () => void;
  onTechDemo: () => void;
  onAbout: () => void;
  onRoi: () => void;
  onSupplierPage: () => void;
  onQuality: () => void;
  onPrivacy: () => void;
  onTerms: () => void;
  lang: Language;
}

// --- Extended Hero Animation: The Full Procurement Loop ---
const HeroVisual = () => {
  const [step, setStep] = useState(0); 
  // 0: Input (Messy)
  // 1: Structure (Table)
  // 2: Compare (Bid Leveling)
  // 3: Award (PO Generation)

  useEffect(() => {
    const sequence = async () => {
      while (true) {
        setStep(0); // Input
        await new Promise(r => setTimeout(r, 3000));
        setStep(1); // RFQ Table
        await new Promise(r => setTimeout(r, 3000));
        setStep(2); // Compare
        await new Promise(r => setTimeout(r, 3500));
        setStep(3); // Award
        await new Promise(r => setTimeout(r, 5000));
      }
    };
    sequence();
  }, []);

  return (
    <div className="relative w-full max-w-lg mx-auto h-[400px] rounded-2xl bg-slate-950 border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden group hover:border-slate-700 transition-colors duration-500">
      
      {/* 1. Window Header (Progress Bar) */}
      <div className="h-12 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex items-center px-4 justify-between shrink-0 z-20">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
        </div>
        <div className="flex items-center gap-3">
            <StepIndicator label="Input" active={step === 0} done={step > 0} />
            <Arrow />
            <StepIndicator label="RFQ" active={step === 1} done={step > 1} />
            <Arrow />
            <StepIndicator label="Compare" active={step === 2} done={step > 2} />
            <Arrow />
            <StepIndicator label="Award" active={step === 3} done={step > 3} />
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 relative p-6 font-mono text-sm overflow-hidden bg-slate-950/50">
        
        {/* VIEW 0: UNSTRUCTURED INPUT */}
        <div className={`absolute inset-0 p-8 transition-all duration-700 ease-in-out ${step === 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-gradient-to-tr from-brandTeal/5 to-transparent rounded-full blur-3xl animate-pulse"></div>
            
            <div className="relative z-10 space-y-4">
                <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg shadow-lg rotate-1">
                    <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2">
                        <div className="w-6 h-6 bg-red-500/20 text-red-400 rounded flex items-center justify-center text-[10px]">PDF</div>
                        <span className="text-[10px] text-slate-400">Engineering_Specs_Rev3.pdf</span>
                    </div>
                    <div className="space-y-2 opacity-60">
                        <div className="h-1.5 bg-slate-700 rounded w-full"></div>
                        <div className="h-1.5 bg-slate-700 rounded w-5/6"></div>
                        <div className="h-1.5 bg-slate-700 rounded w-4/6"></div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg shadow-lg -rotate-1 translate-x-4">
                    <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2">
                        <div className="w-6 h-6 bg-blue-500/20 text-blue-400 rounded flex items-center justify-center text-[10px]">@</div>
                        <span className="text-[10px] text-slate-400">Email from Project Mgr</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                        "Need <span className="text-brandTeal bg-brandTeal/10 px-1 rounded">500m of 6-inch Smls Pipe</span> and <span className="text-brandTeal bg-brandTeal/10 px-1 rounded">20x WN Flanges</span> ASAP. Must be NACE compliant."
                    </p>
                </div>
            </div>
            
            {/* Scanning Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brandTeal/10 to-transparent -translate-y-full animate-[scan_2s_ease-in-out_infinite]"></div>
        </div>

        {/* VIEW 1: STRUCTURED RFQ TABLE */}
        <div className={`absolute inset-0 p-6 flex items-center transition-all duration-700 ease-in-out ${step === 1 ? 'opacity-100 translate-y-0' : step < 1 ? 'opacity-0 translate-y-8' : 'opacity-0 -translate-x-8'}`}>
            <div className="w-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-2xl">
                <div className="bg-slate-800/50 px-3 py-2 border-b border-slate-700 flex justify-between">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">RFQ #2291 - Generated</span>
                    <span className="text-[10px] text-emerald-400 font-bold">● Ready</span>
                </div>
                <table className="w-full text-left text-[10px]">
                    <thead className="bg-slate-800 text-slate-500 font-bold uppercase">
                        <tr>
                            <th className="px-3 py-2">Item</th>
                            <th className="px-3 py-2">Spec</th>
                            <th className="px-3 py-2 text-right">Qty</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                        <tr className="bg-brandTeal/5">
                            <td className="px-3 py-2">Pipe, Smls 6"</td>
                            <td className="px-3 py-2 text-slate-500">API 5L Gr.B</td>
                            <td className="px-3 py-2 text-right font-mono text-white">500 m</td>
                        </tr>
                        <tr>
                            <td className="px-3 py-2">Flange WN #150</td>
                            <td className="px-3 py-2 text-slate-500">ASTM A105</td>
                            <td className="px-3 py-2 text-right font-mono text-white">20 pcs</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        {/* VIEW 2: SUPPLIER COMPARISON */}
        <div className={`absolute inset-0 p-6 flex items-center transition-all duration-700 ease-in-out ${step === 2 ? 'opacity-100 translate-x-0' : step < 2 ? 'opacity-0 translate-x-8' : 'opacity-0 scale-95'}`}>
            <div className="w-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-2xl">
                <div className="bg-slate-800/50 px-3 py-2 border-b border-slate-700 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Bid Leveling</span>
                    <span className="text-[9px] bg-slate-700 text-white px-1.5 py-0.5 rounded">3 Quotes</span>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-800 text-[10px] bg-slate-900/50">
                    <div className="p-3 flex flex-col gap-1 opacity-50">
                        <span className="font-bold text-slate-300">Supplier A</span>
                        <span className="text-slate-500">$26,500</span>
                        <span className="text-[8px] text-slate-600">45 Days</span>
                    </div>
                    <div className="p-3 flex flex-col gap-1 bg-emerald-500/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-emerald-500 text-slate-900 text-[8px] font-bold px-1.5 py-0.5 rounded-bl">BEST</div>
                        <span className="font-bold text-white">Brava Steel</span>
                        <span className="text-emerald-400 font-bold text-xs">$24,100</span>
                        <span className="text-[8px] text-emerald-300/70">14 Days</span>
                    </div>
                    <div className="p-3 flex flex-col gap-1 opacity-50">
                        <span className="font-bold text-slate-300">Supplier C</span>
                        <span className="text-slate-500">$28,000</span>
                        <span className="text-[8px] text-slate-600">30 Days</span>
                    </div>
                </div>
                <div className="p-2 border-t border-slate-800 text-center">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-slate-900 rounded text-[10px] font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse">
                        Award to Brava Steel
                    </div>
                </div>
            </div>
        </div>

        {/* VIEW 3: PURCHASE ORDER (AWARD) */}
        <div className={`absolute inset-0 p-6 flex items-center justify-center transition-all duration-700 ease-in-out ${step === 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}>
            <div className="w-[85%] bg-white rounded-sm shadow-2xl relative rotate-1 border border-slate-200 overflow-hidden font-sans text-slate-800">
                {/* Header */}
                <div className="border-b-2 border-slate-900 p-4 flex justify-between items-start">
                    <div>
                        <div className="text-xl font-black text-slate-900 tracking-tight leading-none">PURCHASE<br/>ORDER</div>
                        <div className="text-[9px] text-slate-500 font-mono mt-1">PO #4492-A</div>
                    </div>
                    <div className="text-right">
                        <div className="font-bold text-slate-900 text-sm">CRONTAL</div>
                        <div className="text-[8px] text-slate-500">123 Engineering Way</div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-4">
                    <div className="flex justify-between mb-6">
                        <div>
                            <div className="text-[8px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Vendor</div>
                            <div className="text-xs font-bold text-slate-900">Brava Steel Inc.</div>
                            <div className="text-[8px] text-slate-500">Houston, TX</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[8px] text-slate-400 uppercase tracking-wider font-bold mb-0.5">Date</div>
                            <div className="text-xs font-bold text-slate-900">Oct 24, 2023</div>
                        </div>
                    </div>

                    {/* Table */}
                    <table className="w-full text-[9px] mb-6">
                        <thead>
                            <tr className="border-b border-slate-300 text-left">
                                <th className="py-1 font-bold text-slate-600 w-1/2">Item</th>
                                <th className="py-1 font-bold text-slate-600 text-right">Qty</th>
                                <th className="py-1 font-bold text-slate-600 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-800">
                            <tr className="border-b border-slate-100">
                                <td className="py-1.5">
                                    <div className="font-bold">Pipe, Smls 6"</div>
                                    <div className="text-[7px] text-slate-500">API 5L Gr.B, Sch40</div>
                                </td>
                                <td className="py-1.5 text-right font-mono">500</td>
                                <td className="py-1.5 text-right font-mono font-bold">$22,500</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="py-1.5">
                                    <div className="font-bold">Flange WN #150</div>
                                    <div className="text-[7px] text-slate-500">ASTM A105</div>
                                </td>
                                <td className="py-1.5 text-right font-mono">20</td>
                                <td className="py-1.5 text-right font-mono font-bold">$1,600</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Total */}
                    <div className="flex justify-end border-t border-slate-900 pt-2">
                        <div className="text-right">
                            <div className="text-[8px] text-slate-500 uppercase tracking-wider font-bold">Total Amount</div>
                            <div className="text-lg font-black text-slate-900">$24,100.00</div>
                        </div>
                    </div>
                </div>

                {/* Stamp */}
                <div className="absolute top-1/2 left-1/2 w-32 border-[3px] border-emerald-600 text-emerald-600 font-black text-xl px-4 py-1 rounded text-center opacity-0 animate-[stamp_0.4s_ease-out_0.5s_forwards] mix-blend-multiply">
                    APPROVED
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

const StepIndicator = ({ label, active, done }: { label: string, active: boolean, done: boolean }) => (
    <span className={`text-[10px] uppercase tracking-widest transition-all duration-300 ${active ? 'text-brandTeal font-bold shadow-[0_0_10px_rgba(45,212,191,0.5)]' : done ? 'text-emerald-500/50' : 'text-slate-700'}`}>
        {label}
    </span>
);

const Arrow = () => <span className="text-slate-700 text-[10px]">→</span>;


// --- MAIN LANDING PAGE COMPONENT ---

export default function LandingPage({
  onStart,
  onTechDemo,
  onAbout,
  onRoi,
  onSupplierPage,
  onQuality,
  onPrivacy,
  onTerms,
  lang,
}: LandingPageProps) {
  
  // Scroll Animations
  const observerRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    observerRef.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('opacity-100', 'translate-y-0');
          entry.target.classList.remove('opacity-0', 'translate-y-8');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => {
      el.classList.add('opacity-0', 'translate-y-8', 'transition-all', 'duration-700', 'ease-out');
      observerRef.current?.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="bg-slate-950 text-slate-300 font-sans min-h-screen selection:bg-brandTeal/30 selection:text-white overflow-x-hidden">
      
      {/* Top Gradient Line */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-900 via-brandTeal to-slate-900 z-[60]"></div>

      {/* --- Navigation --- */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
          <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)]">
             <div className="w-3 h-3 bg-brandTeal rounded-sm rotate-45 shadow-[0_0_10px_#2DD4BF]"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white leading-none">CRONTAL</span>
            <span className="text-[9px] uppercase tracking-[0.3em] text-slate-500 leading-none mt-1">Automation</span>
          </div>
        </div>
        <div className="flex gap-6 items-center">
            <button onClick={onSupplierPage} className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-brandTeal transition hidden sm:block">For Suppliers</button>
            <button onClick={onStart} className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-white transition">Login</button>
            <button 
                onClick={onStart}
                className="px-5 py-2 rounded border border-slate-700 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:border-brandTeal hover:text-brandTeal transition shadow-lg"
            >
                Start Demo
            </button>
        </div>
      </nav>

      {/* --- Section 1: Hero --- */}
      <section className="relative pt-20 pb-32 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Hero Copy */}
            <div className="text-left reveal">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brandTeal/5 border border-brandTeal/20 text-[10px] font-bold text-brandTeal mb-6 tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-brandTeal animate-pulse"></span>
                    AI-POWERED TECHNICAL PROCUREMENT
                </div>

                <h1 className="text-4xl lg:text-6xl font-bold text-white mb-8 leading-tight tracking-tight">
                    Stop hand-building RFQs from <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-500">messy specs.</span>
                </h1>
                
                <p className="text-lg text-slate-400 mb-10 leading-relaxed max-w-xl border-l-2 border-slate-800 pl-6">
                    We turn drawings, PDFs, and emails into <span className="text-slate-200">clean RFQ tables</span> and <span className="text-slate-200">comparable quotes</span> — without changing your existing ERP.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                    <button 
                        onClick={onStart}
                        className="px-8 py-4 bg-brandTeal text-slate-900 rounded-lg text-sm font-bold hover:bg-teal-400 transition shadow-[0_0_25px_rgba(45,212,191,0.2)] uppercase tracking-wide"
                    >
                        Try on 1 Live RFQ
                    </button>
                    <button 
                        onClick={onTechDemo}
                        className="px-8 py-4 border border-slate-700 text-slate-300 rounded-lg text-sm font-bold hover:border-slate-500 hover:text-white transition uppercase tracking-wide bg-slate-900/50"
                    >
                        See the Tech
                    </button>
                </div>

                <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    <span>// EPC Ready</span>
                    <span>// Oil & Gas</span>
                    <span>// Metals</span>
                </div>
            </div>

            {/* Hero Visual */}
            <div className="reveal delay-200">
                <HeroVisual />
            </div>
        </div>
      </section>

      {/* --- Section 2: The Gap --- */}
      <section className="py-24 bg-slate-900 border-y border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brandTeal/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="max-w-4xl mx-auto px-6 relative z-10">
              <div className="reveal">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
                      Why your current tools don't solve this.
                  </h2>
                  <p className="text-slate-400 text-lg mb-12">
                      Procurement systems work great <em>after</em> RFQ line items exist. But creating those lines is still manual, slow, and risky.
                  </p>
              </div>
              
              <div className="space-y-6">
                  {[
                      "Engineering sends specs as scanned PDFs or screenshots.",
                      "Buyers spend 4+ hours translating this into Excel.",
                      "Suppliers misquote due to ambiguous descriptions.",
                      "Quotes return in different formats, making comparison a nightmare."
                  ].map((text, i) => (
                      <div key={i} className="flex items-start gap-4 reveal group" style={{ transitionDelay: `${i * 100}ms` }}>
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500/80 mt-2.5 group-hover:shadow-[0_0_8px_#EF4444] transition shadow-none"></div>
                          <p className="text-slate-300 text-base md:text-lg font-light">{text}</p>
                      </div>
                  ))}
              </div>

              <div className="mt-16 pt-8 border-t border-slate-800 reveal delay-500">
                  <p className="text-brandTeal font-medium flex items-center gap-3">
                      <span className="w-6 h-px bg-brandTeal"></span>
                      We automate this gap — safely, before your ERP.
                  </p>
              </div>
          </div>
      </section>

      {/* --- Section 3: What We Automate --- */}
      <section className="py-24 max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 reveal">
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 mb-4">Core Engine</div>
              <h2 className="text-3xl md:text-4xl font-bold text-white">Three pillars of automation</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="group bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-brandTeal/30 hover:shadow-2xl transition duration-500 reveal relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-brandTeal/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">01 // Extract</div>
                  <h3 className="text-xl font-bold text-white mb-3">Chaos to Structure</h3>
                  <p className="text-sm text-slate-400 mb-8 leading-relaxed">Turn PDFs, drawings, and emails into structured RFQ line items instantly.</p>
                  <ul className="space-y-3 text-sm text-slate-300 relative z-10">
                      <li className="flex gap-3 items-center"><div className="w-1 h-1 bg-brandTeal rounded-full"></div> Reads specs & grades</li>
                      <li className="flex gap-3 items-center"><div className="w-1 h-1 bg-brandTeal rounded-full"></div> Generates draft table</li>
                  </ul>
              </div>

              {/* Card 2 */}
              <div className="group bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-brandTeal/30 hover:shadow-2xl transition duration-500 reveal delay-100 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-brandTeal/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">02 // Clarify</div>
                  <h3 className="text-xl font-bold text-white mb-3">Catch Gaps Early</h3>
                  <p className="text-sm text-slate-400 mb-8 leading-relaxed">Identify missing or ambiguous fields before you send the RFQ to suppliers.</p>
                  <ul className="space-y-3 text-sm text-slate-300 relative z-10">
                      <li className="flex gap-3 items-center"><div className="w-1 h-1 bg-brandTeal rounded-full"></div> Flags missing specs</li>
                      <li className="flex gap-3 items-center"><div className="w-1 h-1 bg-brandTeal rounded-full"></div> Suggests questions</li>
                  </ul>
              </div>

              {/* Card 3 */}
              <div className="group bg-slate-900 border border-slate-800 p-8 rounded-2xl hover:border-brandTeal/30 hover:shadow-2xl transition duration-500 reveal delay-200 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-brandTeal/5 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">03 // Normalize</div>
                  <h3 className="text-xl font-bold text-white mb-3">Apples-to-Apples</h3>
                  <p className="text-sm text-slate-400 mb-8 leading-relaxed">Align disparate supplier quotes into a single, comparable dashboard.</p>
                  <ul className="space-y-3 text-sm text-slate-300 relative z-10">
                      <li className="flex gap-3 items-center"><div className="w-1 h-1 bg-brandTeal rounded-full"></div> Aligns items to RFQ</li>
                      <li className="flex gap-3 items-center"><div className="w-1 h-1 bg-brandTeal rounded-full"></div> Flags outliers</li>
                  </ul>
              </div>
          </div>
      </section>

      {/* --- Section 4: Who It's For --- */}
      <section className="py-24 bg-slate-900 border-y border-slate-800">
          <div className="max-w-7xl mx-auto px-6">
              <h2 className="text-3xl font-bold text-white mb-16 text-center reveal">Built for technical procurement teams</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                  {/* Card 1 */}
                  <div className="p-8 rounded bg-slate-950 border border-slate-800 hover:border-brandTeal/30 transition reveal group">
                      <h3 className="font-bold text-white mb-3 group-hover:text-brandTeal transition">EPC Projects</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">Teams managing multi-line project RFQs starting from engineering drawings, MTOs, and BOMs.</p>
                  </div>
                  {/* Card 2 */}
                  <div className="p-8 rounded bg-slate-950 border border-slate-800 hover:border-brandTeal/30 transition reveal delay-100 group">
                      <h3 className="font-bold text-white mb-3 group-hover:text-brandTeal transition">Industrial Buyers</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">Oil & gas, energy, metals. Handling complex specs across pipes, valves, fittings, and steel.</p>
                  </div>
                  {/* Card 3 */}
                  <div className="p-8 rounded bg-slate-950 border border-slate-800 hover:border-brandTeal/30 transition reveal delay-200 group cursor-pointer" onClick={onSupplierPage}>
                      <h3 className="font-bold text-white mb-3 group-hover:text-brandTeal transition flex items-center gap-2">
                          Metal Suppliers <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">Explore</span>
                      </h3>
                      <p className="text-sm text-slate-400 leading-relaxed">Service centers and manufacturers quoting material lists and fabricated assemblies.</p>
                  </div>
              </div>
          </div>
      </section>

      {/* --- Section 5: Safe AI --- */}
      <section className="py-24 max-w-4xl mx-auto px-6 text-center reveal">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-brandTeal mb-8 shadow-xl">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-12">AI that helps — without taking over.</h2>
          
          <div className="grid sm:grid-cols-2 gap-y-6 gap-x-12 text-left max-w-xl mx-auto mb-12 text-slate-300 text-sm">
              <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 bg-brandTeal rounded-full shadow-[0_0_8px_#2DD4BF]"></div>
                  No auto-sending RFQs.
              </div>
              <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 bg-brandTeal rounded-full shadow-[0_0_8px_#2DD4BF]"></div>
                  No auto-awarding suppliers.
              </div>
              <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 bg-brandTeal rounded-full shadow-[0_0_8px_#2DD4BF]"></div>
                  No price negotiation.
              </div>
              <div className="flex items-center gap-4">
                  <div className="w-1.5 h-1.5 bg-brandTeal rounded-full shadow-[0_0_8px_#2DD4BF]"></div>
                  Your data stays private.
              </div>
          </div>
          
          <p className="text-slate-500 text-xs font-mono uppercase tracking-widest border-t border-slate-800 pt-8 inline-block px-12">
              AI is the engine · you are the driver
          </p>
      </section>

      {/* --- Section 6: CTA --- */}
      <section className="py-32 bg-slate-900 border-t border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-brandTeal/40 to-transparent"></div>
          
          <div className="max-w-3xl mx-auto px-6 text-center reveal relative z-10">
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-8">Try it on one live RFQ.</h2>
              <div className="text-slate-400 text-lg mb-12 space-y-2 font-light">
                  <p>Upload your drawings, datasheets, or emails.</p>
                  <p>See them as clean RFQ line items instantly.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                  <button 
                      onClick={onStart}
                      className="px-10 py-4 bg-brandTeal text-slate-900 rounded-lg text-sm font-bold uppercase tracking-wide hover:bg-teal-400 transition shadow-[0_0_30px_rgba(45,212,191,0.3)]"
                  >
                      Upload an RFQ
                  </button>
                  <button 
                      onClick={onAbout}
                      className="px-10 py-4 border border-slate-700 text-white rounded-lg text-sm font-bold uppercase tracking-wide hover:bg-slate-800 transition"
                  >
                      Book a walkthrough
                  </button>
              </div>
          </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-slate-950 py-16 border-t border-slate-900">
          <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  <div>
                      <div className="flex items-center gap-3 mb-4">
                          <div className="w-5 h-5 bg-slate-900 border border-slate-700 flex items-center justify-center">
                             <div className="w-2 h-2 bg-brandTeal rounded-sm rotate-45"></div>
                          </div>
                          <span className="font-bold text-slate-300 tracking-tight">CRONTAL</span>
                      </div>
                      <div className="text-slate-600 text-xs max-w-xs leading-relaxed">
                          Not a procurement platform replacement — a focused automation layer for technical RFQs.
                      </div>
                  </div>
                  <div className="text-slate-500 text-sm">
                      Questions? <a href="mailto:rfq@crontal.com" className="text-brandTeal hover:underline">rfq@crontal.com</a>
                  </div>
              </div>
              <div className="mt-12 pt-8 border-t border-slate-900 flex gap-8 text-[10px] uppercase tracking-widest text-slate-600 font-bold">
                  <button onClick={onPrivacy} className="hover:text-slate-400 transition">Privacy Policy</button>
                  <button onClick={onTerms} className="hover:text-slate-400 transition">Terms of Service</button>
                  <span>© 2024 Crontal Inc.</span>
              </div>
          </div>
      </footer>

    </div>
  );
}