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
  onBlog: () => void;
  lang: Language;
}

// ... (Existing UI Components: SpotlightCard, ShimmerButton, HeroVisual, StepIndicator, Arrow) ...
const SpotlightCard = ({ children, className = "", onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const div = divRef.current;
    const rect = div.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleFocus = () => {
    setOpacity(1);
  };

  const handleBlur = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleFocus}
      onMouseLeave={handleBlur}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white ${className} ${onClick ? 'cursor-pointer hover:border-brandOrange/50 transition-colors' : ''} shadow-sm`}
    >
      <div
        className="pointer-events-none absolute -inset-px transition duration-300 z-0"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(249,115,22,0.08), transparent 40%)`,
        }}
      />
      <div className="relative h-full z-10">{children}</div>
    </div>
  );
};

const ShimmerButton = ({ children, onClick, className = "" }: { children: React.ReactNode, onClick: () => void, className?: string }) => {
    return (
        <button
            onClick={onClick}
            className={`relative overflow-hidden group ${className}`}
        >
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></span>
            {children}
        </button>
    );
};

const HeroVisual = () => {
  const [step, setStep] = useState(0); 

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
    <div className="relative w-full max-w-lg mx-auto h-[400px] rounded-2xl bg-slate-50 border border-slate-200 shadow-2xl flex flex-col overflow-hidden group hover:border-brandOrange/30 transition-colors duration-500">
      
      {/* 1. Window Header (Progress Bar) */}
      <div className="h-12 bg-white border-b border-slate-100 flex items-center px-4 justify-between shrink-0 z-20">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
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
      <div className="flex-1 relative p-6 font-mono text-sm overflow-hidden bg-slate-50/50">
        
        {/* VIEW 0: UNSTRUCTURED INPUT */}
        <div className={`absolute inset-0 p-8 transition-all duration-700 ease-in-out ${step === 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-gradient-to-tr from-brandOrange/5 to-transparent rounded-full blur-3xl animate-pulse"></div>
            
            <div className="relative z-10 space-y-4">
                <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm rotate-1">
                    <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                        <div className="w-6 h-6 bg-red-100 text-red-600 rounded flex items-center justify-center text-[10px] font-bold">PDF</div>
                        <span className="text-[10px] text-slate-500 font-bold">Engineering_Specs_Rev3.pdf</span>
                    </div>
                    <div className="space-y-2 opacity-60">
                        <div className="h-1.5 bg-slate-200 rounded w-full"></div>
                        <div className="h-1.5 bg-slate-200 rounded w-5/6"></div>
                        <div className="h-1.5 bg-slate-200 rounded w-4/6"></div>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm -rotate-1 translate-x-4">
                    <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-[10px] font-bold">@</div>
                        <span className="text-[10px] text-slate-500 font-bold">Email from Project Mgr</span>
                    </div>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                        "Need <span className="text-brandOrange bg-brandOrange/10 px-1 rounded font-bold">500m of 6-inch Smls Pipe</span> and <span className="text-brandOrange bg-brandOrange/10 px-1 rounded font-bold">20x WN Flanges</span> ASAP. Must be NACE compliant."
                    </p>
                </div>
            </div>
        </div>

        {/* VIEW 1: STRUCTURED RFQ TABLE */}
        <div className={`absolute inset-0 p-6 flex items-center transition-all duration-700 ease-in-out ${step === 1 ? 'opacity-100 translate-y-0' : step < 1 ? 'opacity-0 translate-y-8' : 'opacity-0 -translate-x-8'}`}>
            <div className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden shadow-lg">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">RFQ #2291 - Generated</span>
                    <span className="text-[10px] text-orange-600 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Ready</span>
                </div>
                <table className="w-full text-left text-[10px]">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                        <tr>
                            <th className="px-3 py-2">Item</th>
                            <th className="px-3 py-2">Spec</th>
                            <th className="px-3 py-2 text-right">Qty</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr className="bg-brandOrange/5">
                            <td className="px-3 py-2 font-bold">Pipe, Smls 6"</td>
                            <td className="px-3 py-2 text-slate-500">API 5L Gr.B</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-900 font-bold">500 m</td>
                        </tr>
                        <tr>
                            <td className="px-3 py-2 font-bold">Flange WN #150</td>
                            <td className="px-3 py-2 text-slate-500">ASTM A105</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-900 font-bold">20 pcs</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        {/* VIEW 2: SUPPLIER COMPARISON */}
        <div className={`absolute inset-0 p-6 flex items-center transition-all duration-700 ease-in-out ${step === 2 ? 'opacity-100 translate-x-0' : step < 2 ? 'opacity-0 translate-x-8' : 'opacity-0 scale-95'}`}>
            <div className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden shadow-lg">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Bid Leveling</span>
                    <span className="text-[9px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold">3 Quotes</span>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-100 text-[10px] bg-white">
                    <div className="p-3 flex flex-col gap-1 opacity-50">
                        <span className="font-bold text-slate-600">Supplier A</span>
                        <span className="text-slate-500">$26,500</span>
                        <span className="text-[8px] text-slate-400">45 Days</span>
                    </div>
                    <div className="p-3 flex flex-col gap-1 bg-green-50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-bl">BEST</div>
                        <span className="font-bold text-slate-900">Brava Steel</span>
                        <span className="text-green-600 font-bold text-xs">$24,100</span>
                        <span className="text-[8px] text-green-600/70 font-bold">14 Days</span>
                    </div>
                    <div className="p-3 flex flex-col gap-1 opacity-50">
                        <span className="font-bold text-slate-600">Supplier C</span>
                        <span className="text-slate-500">$28,000</span>
                        <span className="text-[8px] text-slate-400">30 Days</span>
                    </div>
                </div>
            </div>
        </div>

        {/* VIEW 3: PURCHASE ORDER (AWARD) */}
        <div className={`absolute inset-0 p-8 flex items-center justify-center transition-all duration-700 ease-in-out ${step === 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}>
            <div className="w-[85%] bg-white rounded-sm shadow-2xl relative rotate-1 border border-slate-200 overflow-hidden font-sans text-slate-800">
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
                <div className="p-4">
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
                        </tbody>
                    </table>
                    <div className="flex justify-end border-t border-slate-900 pt-2">
                        <div className="text-right">
                            <div className="text-[8px] text-slate-500 uppercase tracking-wider font-bold">Total Amount</div>
                            <div className="text-lg font-black text-slate-900">$24,100.00</div>
                        </div>
                    </div>
                </div>
                <div className="absolute top-1/2 left-1/2 w-32 border-[3px] border-brandOrange text-brandOrange font-black text-xl px-4 py-1 rounded text-center opacity-0 animate-[stamp_0.4s_ease-out_0.5s_forwards] mix-blend-multiply text-opacity-80">
                    APPROVED
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const StepIndicator = ({ label, active, done }: { label: string, active: boolean, done: boolean }) => (
    <span className={`text-[10px] uppercase tracking-widest transition-all duration-300 ${active ? 'text-brandOrange font-bold underline decoration-2 underline-offset-4' : done ? 'text-green-600 font-bold' : 'text-slate-400'}`}>
        {label}
    </span>
);

const Arrow = () => <span className="text-slate-300 text-[10px]">→</span>;


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
  onBlog,
  lang,
}: LandingPageProps) {
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const aboutRef = useRef<HTMLElement>(null);

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

  const scrollToAbout = () => {
    aboutRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-slate-50 text-slate-900 font-sans min-h-screen selection:bg-brandOrange/30 selection:text-white overflow-x-hidden">
      
      {/* Top Gradient Line */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-900 via-brandOrange to-slate-900 z-[60]"></div>

      {/* --- Navigation --- */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-50">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
          {/* Unified Brand Icon */}
          <svg viewBox="0 0 40 40" fill="none" className="h-9 w-9 shadow-sm rounded-lg">
                <rect width="40" height="40" rx="8" fill="#0B1121"/>
                <path d="M12 20C12 15.5817 15.5817 12 20 12C22.25 12 24.28 12.93 25.76 14.43" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M12 20C12 24.4183 15.5817 28 20 28C22.25 28 24.28 27.07 25.76 25.57" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M22 20H32M32 20L28 16M32 20L28 24" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-slate-900 leading-none">CRONTAL</span>
            <span className="text-xs uppercase tracking-[0.3em] text-slate-400 leading-none mt-1">Automation</span>
          </div>
        </div>
        <div className="flex gap-6 items-center">
            <button onClick={scrollToAbout} className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-brandOrange transition hidden sm:block">
                About
            </button>
            <button onClick={onBlog} className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-brandOrange transition hidden sm:block">
                Blog
            </button>
            <button onClick={onSupplierPage} className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-brandOrange transition hidden sm:block">For Suppliers</button>
            <button onClick={onStart} className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition">Login</button>
            <ShimmerButton 
                onClick={onStart}
                className="px-5 py-2 rounded border border-slate-900 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition shadow-lg"
            >
                Start Demo
            </ShimmerButton>
        </div>
      </nav>

      {/* --- Section 1: Hero --- */}
      <section className="relative pt-20 pb-32 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Hero Copy */}
            <div className="text-left reveal">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brandOrange/10 border border-brandOrange/20 text-[10px] font-bold text-orange-700 mb-6 tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-brandOrange animate-pulse"></span>
                    AI-POWERED TECHNICAL PROCUREMENT
                </div>

                <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 mb-8 leading-tight tracking-tight">
                    Stop hand-building RFQs from <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600">messy specs.</span>
                </h1>
                
                <p className="text-lg text-slate-600 mb-10 leading-relaxed max-w-xl border-l-2 border-slate-200 pl-6">
                    We turn drawings, PDFs, and emails into <span className="text-slate-900 font-bold">clean RFQ tables</span> and <span className="text-slate-900 font-bold">comparable quotes</span> — without changing your existing ERP.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-12">
                    <ShimmerButton 
                        onClick={onStart}
                        className="px-8 py-4 bg-brandOrange text-white rounded-lg text-sm font-bold hover:bg-orange-500 transition shadow-[0_4px_14px_0_rgba(249,115,22,0.39)] uppercase tracking-wide"
                    >
                        Try on 1 Live RFQ
                    </ShimmerButton>
                    <button 
                        onClick={onTechDemo}
                        className="px-8 py-4 border border-slate-300 text-slate-600 rounded-lg text-sm font-bold hover:border-slate-900 hover:text-slate-900 transition uppercase tracking-wide bg-white"
                    >
                        See the Tech
                    </button>
                </div>

                <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
      <section className="py-24 bg-white border-y border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brandOrange/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <div className="max-w-4xl mx-auto px-6 relative z-10">
              <div className="reveal">
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">
                      Why your current tools don't solve this.
                  </h2>
                  <p className="text-slate-500 text-lg mb-12">
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
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2.5 group-hover:scale-150 transition duration-300"></div>
                          <p className="text-slate-600 text-base md:text-lg font-light group-hover:text-slate-900 transition-colors">{text}</p>
                      </div>
                  ))}
              </div>

              <div className="mt-16 pt-8 border-t border-slate-100 reveal delay-500">
                  <p className="text-brandOrange font-bold flex items-center gap-3">
                      <span className="w-6 h-px bg-brandOrange"></span>
                      We automate this gap — safely, before your ERP.
                  </p>
              </div>
          </div>
      </section>

      {/* --- Section 3: What We Automate --- */}
      <section className="py-24 max-w-7xl mx-auto px-6 relative bg-slate-50">
          <div className="text-center mb-20 reveal">
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-4">Core Engine</div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Three pillars of automation</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative z-10">
              {/* Connecting Line (Desktop) */}
              <div className="absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-transparent via-slate-200 to-transparent hidden md:block -z-10">
                  <div className="absolute top-0 left-0 h-full w-20 bg-gradient-to-r from-transparent via-brandOrange/20 to-transparent animate-[scroll_3s_linear_infinite]"></div>
              </div>

              {/* Card 1 */}
              <SpotlightCard className="p-8 reveal group">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">01 // Extract</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Chaos to Structure</h3>
                  <p className="text-sm text-slate-500 mb-8 leading-relaxed">Turn PDFs, drawings, and emails into structured RFQ line items instantly.</p>
                  <ul className="space-y-3 text-sm text-slate-600 relative z-10">
                      <li className="flex gap-3 items-center"><div className="w-1 h-1 bg-brandOrange rounded-full"></div> Reads specs & grades</li>
                      <li className="flex gap-3 items-center"><div className="w-1 h-1 bg-brandOrange rounded-full"></div> Generates draft table</li>
                  </ul>
              </SpotlightCard>

              {/* Card 2 */}
              <SpotlightCard className="p-8 reveal delay-100 group">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">02 // Clarify</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Catch Gaps Early</h3>
                  <p className="text-sm text-slate-500 mb-8 leading-relaxed">Identify missing or ambiguous fields before you send the RFQ to suppliers.</p>
                  <ul className="space-y-3 text-sm text-slate-600 relative z-10">
                      <li className="flex gap-3 items-center"><div className="w-1 h-1 bg-brandOrange rounded-full"></div> Flags missing specs</li>
                      <li className="flex gap-3 items-center"><div className="w-1 h-1 bg-brandOrange rounded-full"></div> Suggests questions</li>
                  </ul>
              </SpotlightCard>

              {/* Card 3 */}
              <SpotlightCard className="p-8 reveal delay-200 group">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">03 // Normalize</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Apples-to-Apples</h3>
                  <p className="text-sm text-slate-500 mb-8 leading-relaxed">Align disparate supplier quotes into a single, comparable dashboard.</p>
                  <ul className="space-y-3 text-sm text-slate-600 relative z-10">
                      <li className="flex gap-3 items-center"><div className="w-1 h-1 bg-brandOrange rounded-full"></div> Aligns items to RFQ</li>
                      <li className="flex gap-3 items-center"><div className="w-1 h-1 bg-brandOrange rounded-full"></div> Flags outliers</li>
                  </ul>
              </SpotlightCard>
          </div>
      </section>

      {/* --- Section 4: Who It's For --- */}
      <section className="py-24 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
              <h2 className="text-3xl font-bold text-slate-900 mb-16 text-center reveal">Built for technical procurement teams</h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                  {/* Card 1 */}
                  <SpotlightCard className="p-8 reveal group border-slate-200">
                      <h3 className="font-bold text-slate-900 mb-3 group-hover:text-brandOrange transition">EPC Projects</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">Teams managing multi-line project RFQs starting from engineering drawings, MTOs, and BOMs.</p>
                  </SpotlightCard>
                  {/* Card 2 */}
                  <SpotlightCard className="p-8 reveal delay-100 group border-slate-200">
                      <h3 className="font-bold text-slate-900 mb-3 group-hover:text-brandOrange transition">Industrial Buyers</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">Oil & gas, energy, metals. Handling complex specs across pipes, valves, fittings, and steel.</p>
                  </SpotlightCard>
                  {/* Card 3 */}
                  <SpotlightCard className="p-8 reveal delay-200 group border-slate-200" onClick={onSupplierPage}>
                      <h3 className="font-bold text-slate-900 mb-3 group-hover:text-brandOrange transition flex items-center gap-2">
                          Metal Suppliers <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">Explore</span>
                      </h3>
                      <p className="text-sm text-slate-500 leading-relaxed">Service centers and manufacturers quoting material lists and fabricated assemblies.</p>
                  </SpotlightCard>
              </div>
          </div>
      </section>

      {/* --- Section 5: Vision (Integrated from About Page) --- */}
      <section ref={aboutRef} className="py-24 bg-slate-50 border-y border-slate-200 scroll-mt-20">
          <div className="max-w-4xl mx-auto px-6 text-center reveal">
                <div className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider mb-6">Our Vision</div>
                <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight text-slate-900">
                    The "Human-in-the-Loop" <br/>
                    <span className="text-brandOrange">Procurement Pilot.</span>
                </h2>
                
                <div className="prose prose-lg text-slate-600 mx-auto text-left">
                    <p className="text-xl leading-relaxed mb-10 text-slate-800 text-center">
                        Supply chains are not getting simpler. Engineering specifications are becoming more rigorous, deadlines are tighter, and the sheer volume of data is overwhelming human teams.
                    </p>
                    
                    <h3 className="text-2xl font-bold text-slate-900 mt-12 mb-4">The Data Entry Trap</h3>
                    <p>
                        For decades, highly paid procurement engineers have spent 40% of their week manually transcribing data from PDFs to Excel. It’s boring, it’s prone to typos, and it’s a waste of talent.
                    </p>

                    <h3 className="text-2xl font-bold text-slate-900 mt-12 mb-4">Why Autopilot?</h3>
                    <p>
                        We built Crontal not to replace the procurement manager, but to elevate them. Think of it like an aircraft's autopilot. The AI handles the "flying"—maintaining altitude, checking headers, calculating dimensions—so the pilot (you) can focus on the destination (strategy, negotiation, relationships).
                    </p>

                    <div className="bg-white p-8 rounded-2xl my-12 border border-slate-200 text-left shadow-sm">
                        <h4 className="font-bold text-lg mb-4 text-slate-900">Our Core Principles</h4>
                        <ul className="space-y-4">
                            <li className="flex gap-4">
                                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">1</div>
                                <span className="text-base text-slate-600"><strong>Structure First:</strong> Unstructured text is the enemy. We convert everything to structured JSON immediately.</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">2</div>
                                <span className="text-base text-slate-600"><strong>Physics Aware:</strong> A pipe isn't just a string of text. It has physical properties. Our AI understands standards like ASTM and API.</span>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">3</div>
                                <span className="text-base text-slate-600"><strong>Zero Friction:</strong> No logins for suppliers. No complex onboarding. Just secure, instant links.</span>
                            </li>
                        </ul>
                    </div>
                </div>
          </div>
      </section>

      {/* --- Section 6: Industry Insights (NEW) --- */}
      <section className="py-24 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
               <div className="flex justify-between items-end mb-12 reveal">
                   <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-2">Latest Updates</div>
                        <h2 className="text-3xl font-bold text-slate-900">Insights for the modern buyer</h2>
                   </div>
                   <button onClick={onBlog} className="hidden sm:block text-sm font-bold text-brandOrange hover:text-orange-700 transition">Read all articles →</button>
               </div>

               <div className="grid md:grid-cols-3 gap-8">
                    {/* Blog Card 1 */}
                    <div className="group cursor-pointer reveal" onClick={onBlog}>
                        <div className="h-48 bg-slate-100 rounded-xl overflow-hidden mb-4 relative">
                             <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-brandOrange/5 transition duration-500"></div>
                             <div className="absolute bottom-4 left-4 bg-white px-3 py-1 rounded-full text-[10px] font-bold text-slate-600 shadow-sm">TECH</div>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mb-2">OCT 24 · 5 MIN READ</div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-brandOrange transition">The Death of the PDF RFQ</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">Why structured data is the only way forward for EPC supply chains in 2025.</p>
                    </div>

                    {/* Blog Card 2 */}
                    <div className="group cursor-pointer reveal delay-100" onClick={onBlog}>
                        <div className="h-48 bg-slate-100 rounded-xl overflow-hidden mb-4 relative">
                             <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-brandOrange/5 transition duration-500"></div>
                             <div className="absolute bottom-4 left-4 bg-white px-3 py-1 rounded-full text-[10px] font-bold text-slate-600 shadow-sm">ENGINEERING</div>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mb-2">OCT 18 · 3 MIN READ</div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-brandOrange transition">Validating API 5L Specs with AI</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">How Large Language Models can detect subtle compliance errors in piping specs.</p>
                    </div>

                     {/* Blog Card 3 */}
                     <div className="group cursor-pointer reveal delay-200" onClick={onBlog}>
                        <div className="h-48 bg-slate-100 rounded-xl overflow-hidden mb-4 relative">
                             <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-brandOrange/5 transition duration-500"></div>
                             <div className="absolute bottom-4 left-4 bg-white px-3 py-1 rounded-full text-[10px] font-bold text-slate-600 shadow-sm">STRATEGY</div>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mb-2">OCT 12 · 6 MIN READ</div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-brandOrange transition">5 Hidden Costs in Manual Sourcing</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">You aren't just paying for the steel. You're paying for the rework.</p>
                    </div>
               </div>
          </div>
      </section>

      {/* --- Section 7: CTA --- */}
      <section className="py-32 bg-slate-50 border-t border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-brandOrange/40 to-transparent"></div>
          
          <div className="max-w-3xl mx-auto px-6 text-center reveal relative z-10">
              <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-8">Try it on one live RFQ.</h2>
              <div className="text-slate-500 text-lg mb-12 space-y-2 font-light">
                  <p>Upload your drawings, datasheets, or emails.</p>
                  <p>See them as clean RFQ line items instantly.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                  <ShimmerButton 
                      onClick={onStart}
                      className="px-10 py-4 bg-brandOrange text-white rounded-lg text-sm font-bold uppercase tracking-wide hover:bg-orange-500 transition shadow-[0_4px_14px_0_rgba(249,115,22,0.39)]"
                  >
                      Upload an RFQ
                  </ShimmerButton>
                  <button 
                      onClick={scrollToAbout}
                      className="px-10 py-4 border border-slate-300 text-slate-600 rounded-lg text-sm font-bold uppercase tracking-wide hover:bg-white hover:text-slate-900 transition"
                  >
                      Read our Manifesto
                  </button>
              </div>
          </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-slate-900 py-16 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                  <div>
                      <div className="flex items-center gap-3 mb-4">
                          <div className="w-5 h-5 bg-slate-800 border border-slate-700 flex items-center justify-center">
                             <div className="w-2 h-2 bg-brandOrange rounded-sm rotate-45"></div>
                          </div>
                          <span className="font-bold text-slate-200 tracking-tight">CRONTAL</span>
                      </div>
                      <div className="text-slate-500 text-xs max-w-xs leading-relaxed">
                          Not a procurement platform replacement — a focused automation layer for technical RFQs.
                      </div>
                  </div>
                  <div className="text-slate-500 text-sm">
                      Questions? <a href="mailto:rfq@crontal.com" className="text-brandOrange hover:underline">rfq@crontal.com</a>
                  </div>
              </div>
              <div className="mt-12 pt-8 border-t border-slate-800 flex gap-8 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                  <button onClick={onPrivacy} className="hover:text-slate-300 transition">Privacy Policy</button>
                  <button onClick={onTerms} className="hover:text-slate-300 transition">Terms of Service</button>
                  <span>© 2024 Crontal Inc.</span>
              </div>
          </div>
      </footer>

    </div>
  );
}