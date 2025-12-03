
import React, { useState } from 'react';
import { Language } from '../types';
import { MarketingNavbar } from '../components/MarketingNavbar';
import { MarketingFooter } from '../components/MarketingFooter';
import { AutoDemo } from '../components/AutoDemo';

interface LandingPageProps {
  onStart: () => void;
  onNavigate: (page: string) => void;
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

interface ShimmerButtonProps {
    children: React.ReactNode;
    onClick: () => void;
    className?: string;
}

const ShimmerButton: React.FC<ShimmerButtonProps> = ({ children, onClick, className = "" }) => {
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

const standards = [
    { name: "ASTM", desc: "International", iconPath: "M12 2L2 7l10 5 10-5-10-5zm0 9l2-5 2 5-4 0zm-4.27 1.71L12 17l4.27-4.29L22 22H2l5.73-9.29z" },
    { name: "ASME", desc: "Mechanical", iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" },
    { name: "API", desc: "Petroleum", iconPath: "M12 2L2 22h20L12 2zm0 3.5L18.5 20h-13L12 5.5z" },
    { name: "ISO", desc: "Standardization", iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" },
    { name: "NACE", desc: "Corrosion", iconPath: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" },
    { name: "DIN", desc: "Deutsches", iconPath: "M3 3h18v18H3V3zm2 2v14h14V5H5z" },
    { name: "ANSI", desc: "National", iconPath: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" },
    { name: "IEEE", desc: "Electrical", iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-8h8" },
    { name: "AWS", desc: "Welding", iconPath: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
    { name: "JIS", desc: "Japanese", iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" },
    { name: "BSI", desc: "British", iconPath: "M12 2l-5.5 9h11L12 2zm0 3.8L14.2 9H9.8L12 5.8zM5 20l5.5-9h-11L5 20z" },
    { name: "CSA", desc: "Canadian", iconPath: "M12 2L2 19h20L12 2z" },
    { name: "EN", desc: "European", iconPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z M12 6l1.5 4.5h4.5L14.5 13l1.5 4.5-4-3-4 3 1.5-4.5L5.5 10.5h4.5z" }
];

interface StandardItemProps {
    s: typeof standards[0];
}

const StandardItem: React.FC<StandardItemProps> = ({ s }) => (
    <div className="flex items-center gap-3 px-2 group cursor-default">
        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-slate-600 group-hover:border-slate-300 transition-all">
             <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d={s.iconPath} /></svg>
        </div>
        <div className="flex flex-col text-left">
            <span className="font-bold text-sm text-slate-700 group-hover:text-slate-900 transition-colors">{s.name}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.desc}</span>
        </div>
    </div>
);

export default function LandingPage(props: LandingPageProps) {
  const [activeExample, setActiveExample] = useState<'email' | 'drawing'>('email');

  return (
    <div className="bg-white text-slate-900 font-sans min-h-screen selection:bg-brandOrange/30 selection:text-white overflow-x-hidden">
      
      <MarketingNavbar onStart={props.onStart} onNavigate={props.onNavigate} />

      {/* --- Section 1: Hero --- */}
      <section className="relative pt-16 pb-20 px-6 max-w-7xl mx-auto overflow-hidden">
         {/* Background Elements */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-brandOrange/10 to-transparent rounded-full blur-[100px] -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

        <div className="text-center max-w-4xl mx-auto mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 mb-8 tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-brandOrange animate-pulse"></span>
                AI-POWERED PROCUREMENT INTELLIGENCE
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 mb-8 leading-[1.1] tracking-tight">
                Turn Messy Specs Into <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brandOrange to-orange-600">Flawless RFQs.</span>
            </h1>
            
            <p className="text-xl text-slate-500 mb-10 leading-relaxed max-w-2xl mx-auto">
                Crontal is the AI autopilot for technical buying. We structure your data, audit for risks, and compare supplier quotes in one unified workflow.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <ShimmerButton 
                    onClick={props.onStart}
                    className="px-8 py-4 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition shadow-2xl shadow-slate-900/20 uppercase tracking-wide flex items-center justify-center gap-2"
                >
                    Start Free Draft
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </ShimmerButton>
                <button 
                    onClick={props.onRoi}
                    className="px-8 py-4 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:border-brandOrange hover:text-brandOrange transition uppercase tracking-wide bg-white"
                >
                    Calculate ROI
                </button>
            </div>
        </div>

        {/* Hero Visual - Auto Demo */}
        <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200 mb-12">
            <AutoDemo />
        </div>
      </section>

      {/* --- Standards Ticker --- */}
      <section className="py-8 bg-slate-50 border-y border-slate-100 overflow-hidden relative">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">
              Engineered for compliance with global standards
          </p>
          <div className="relative flex overflow-x-hidden">
             <div className="animate-scroll whitespace-nowrap flex gap-12 px-8 items-center">
                  {/* First Set */}
                  {standards.map((std, i) => (
                      <StandardItem key={`s1-${i}`} s={std} />
                  ))}
                   {/* Second Set for Loop */}
                   {standards.map((std, i) => (
                      <StandardItem key={`s2-${i}`} s={std} />
                  ))}
             </div>
             {/* Fade Gradients */}
             <div className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none"></div>
             <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none"></div>
          </div>
      </section>

      {/* --- Section 2: Concrete Examples (Transformation) --- */}
      <section className="py-24 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">See The Transformation</h2>
                  <p className="text-slate-500 max-w-2xl mx-auto">
                      Real engineering data is messy. Crontal cleans it up instantly. Toggle below to see how we handle different inputs.
                  </p>
              </div>

              <div className="flex justify-center gap-4 mb-12">
                  <button 
                      onClick={() => setActiveExample('email')}
                      className={`px-6 py-2 rounded-full text-sm font-bold transition ${activeExample === 'email' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                  >
                      Example 1: Messy Email
                  </button>
                  <button 
                      onClick={() => setActiveExample('drawing')}
                      className={`px-6 py-2 rounded-full text-sm font-bold transition ${activeExample === 'drawing' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                  >
                      Example 2: Drawing Spec
                  </button>
              </div>

              <div className="grid lg:grid-cols-2 gap-8 items-stretch">
                  {/* INPUT */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 relative overflow-hidden group">
                      <div className="absolute top-4 left-4 bg-red-100 text-red-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                          Input: {activeExample === 'email' ? 'Natural Language' : 'PDF Extraction'}
                      </div>
                      
                      <div className="mt-8 font-mono text-sm text-slate-600 bg-slate-50 p-6 rounded-xl border border-dashed border-slate-300 min-h-[300px] flex flex-col justify-center">
                          {activeExample === 'email' ? (
                              <>
                                  <p>"Hi team, RFQ for the Texas Expansion. Terms: DAP Houston, Net 30.</p>
                                  <p className="mt-4">1. 500m Pipe, 6" Sch40, A106 Gr.B, Seamless. NACE required.</p>
                                  <p className="mt-2">2. 20 pcs WN Flanges, 6" 150#, A105N.</p>
                                  <p className="mt-2">3. 160 sets Stud Bolts, 3/4" x 90mm, A193 B7/2H Galv.</p>
                                  <p className="mt-4">Requirements: MTR 3.1, TPI Level 2, 18mo Warranty. Approved Vendors only."</p>
                              </>
                          ) : (
                              <div className="relative h-full flex items-center justify-center opacity-70">
                                   {/* Abstract representation of a drawing spec */}
                                   <div className="border-2 border-slate-800 w-full h-48 p-2 relative bg-white">
                                        <div className="absolute top-2 right-2 text-[10px] border border-black p-1">REV A</div>
                                        <div className="w-full h-full border border-slate-300 flex items-center justify-center flex-col gap-2">
                                            <svg className="w-16 h-16 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/></svg>
                                            <div className="w-32 h-px bg-slate-400 relative">
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[8px]">ID: 168.3mm</div>
                                            </div>
                                        </div>
                                        <div className="absolute bottom-2 left-2 text-[10px] font-bold leading-tight">
                                            MATL: ASTM A106 GR.B<br/>
                                            SCH: 80 (10.97mm)<br/>
                                            TEST: HYDRO 3000 PSI<br/>
                                            NDT: 100% RT
                                        </div>
                                   </div>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* OUTPUT (CRONTAL) */}
                  <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-brandOrange/10 rounded-full blur-[80px]"></div>
                      <div className="absolute top-4 left-4 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide z-10">
                          Output: Crontal Structured Data
                      </div>

                      <div className="mt-12 relative z-10 overflow-x-auto">
                          <table className="w-full text-left text-[10px] text-slate-300">
                              <thead>
                                  <tr className="border-b border-slate-700 text-slate-500 uppercase tracking-wider">
                                      <th className="pb-3 pr-4">Line</th>
                                      <th className="pb-3 pr-4">Description</th>
                                      <th className="pb-3 pr-4">Material</th>
                                      <th className="pb-3 pr-4">Size / Schedule</th>
                                      <th className="pb-3 pr-4">Tech Specs</th>
                                      <th className="pb-3 text-right">Qty</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800">
                                  {activeExample === 'email' ? (
                                      <>
                                          <tr>
                                              <td className="py-3 font-mono text-slate-500">001</td>
                                              <td className="py-3"><span className="text-white font-bold">Seamless Pipe</span></td>
                                              <td className="py-3 text-blue-400">ASTM A106 Gr.B</td>
                                              <td className="py-3 font-mono">6" Sch40</td>
                                              <td className="py-3 text-slate-400 italic">NACE MR0175, Smls</td>
                                              <td className="py-3 text-right text-white font-bold">500 m</td>
                                          </tr>
                                          <tr>
                                              <td className="py-3 font-mono text-slate-500">002</td>
                                              <td className="py-3"><span className="text-white font-bold">Weld Neck Flange</span></td>
                                              <td className="py-3 text-blue-400">ASTM A105N</td>
                                              <td className="py-3 font-mono">6" Class 150</td>
                                              <td className="py-3 text-slate-400 italic">ASME B16.5, RF</td>
                                              <td className="py-3 text-right text-white font-bold">20 pcs</td>
                                          </tr>
                                           <tr>
                                              <td className="py-3 font-mono text-slate-500">003</td>
                                              <td className="py-3"><span className="text-white font-bold">Stud Bolts</span></td>
                                              <td className="py-3 text-blue-400">A193 B7 / A194 2H</td>
                                              <td className="py-3 font-mono">3/4" x 90mm</td>
                                              <td className="py-3 text-slate-400 italic">Hot Dip Galv.</td>
                                              <td className="py-3 text-right text-white font-bold">160 sets</td>
                                          </tr>
                                      </>
                                  ) : (
                                      <>
                                          <tr>
                                              <td className="py-3 font-mono text-slate-500">001</td>
                                              <td className="py-3"><span className="text-white font-bold">Seamless Pipe</span></td>
                                              <td className="py-3 text-blue-400">ASTM A106 Gr.B</td>
                                              <td className="py-3 font-mono">6" Sch80 (10.97mm)</td>
                                              <td className="py-3 text-slate-400 italic">Hydro 3000 PSI</td>
                                              <td className="py-3 text-right text-white font-bold">12 m</td>
                                          </tr>
                                           <tr>
                                              <td className="py-3 font-mono text-slate-500">002</td>
                                              <td className="py-3"><span className="text-white font-bold">Gate Valve</span></td>
                                              <td className="py-3 text-blue-400">ASTM A216 WCB</td>
                                              <td className="py-3 font-mono">6" Class 300</td>
                                              <td className="py-3 text-slate-400 italic">API 600, Trim 8</td>
                                              <td className="py-3 text-right text-white font-bold">2 pcs</td>
                                          </tr>
                                      </>
                                  )}
                              </tbody>
                          </table>
                      </div>

                      {/* Commercial Extraction - Detailed */}
                      <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                          <div>
                              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Incoterms</div>
                              <div className="text-xs font-bold text-white bg-slate-800 px-2 py-1 rounded inline-block border border-slate-700">DAP Houston</div>
                          </div>
                          <div>
                              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Payment</div>
                              <div className="text-xs font-bold text-white">Net 30 Days</div>
                          </div>
                          <div>
                               <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Certification</div>
                              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                   <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  EN 10204 3.1
                              </div>
                          </div>
                          <div>
                              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Inspection</div>
                              <div className="text-xs font-bold text-white">TPI Level 2</div>
                          </div>
                           <div>
                              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Vendor List</div>
                              <div className="text-xs font-bold text-amber-400">Restricted (AVL)</div>
                          </div>
                          <div>
                              <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Warranty</div>
                              <div className="text-xs font-bold text-white">18 Months</div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* --- Section 3: Value Proposition (Why?) --- */}
      <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-20">
                  <h2 className="text-4xl font-bold text-slate-900 mb-6">Why Buyers Choose Crontal</h2>
                  <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                      We replaced the manual "Copy-Paste" workflow with an intelligent engine.
                  </p>
              </div>

              <div className="grid md:grid-cols-3 gap-12">
                  {/* Value 1: Standardization */}
                  <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                          <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">Instant Standardization</h3>
                      <p className="text-slate-500 leading-relaxed text-sm">
                          Suppliers submit quotes in different currencies, units, and formats. Crontal normalizes everything into one "Apple-to-Apples" comparison table instantly.
                      </p>
                  </div>

                  {/* Value 2: Risk Reduction */}
                  <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
                      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                          <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">AI Risk Audit</h3>
                      <p className="text-slate-500 leading-relaxed text-sm">
                          Don't send incomplete RFQs. Our AI acts as a second pair of eyes, flagging missing grades, undefined Incoterms, or vague specs <em>before</em> you hit send.
                      </p>
                  </div>

                  {/* Value 3: Speed */}
                  <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
                      <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                          <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-3">90% Faster Workflow</h3>
                      <p className="text-slate-500 leading-relaxed text-sm">
                          Stop manually creating POs. With one click, Crontal converts a winning quote into a formal PDF Purchase Order, populated with all agreed terms.
                      </p>
                  </div>
              </div>
          </div>
      </section>

      {/* --- Section 5: CTA --- */}
      <section className="py-32 bg-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brandOrange/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-8 tracking-tight">Stop Buying Blindly.</h2>
              <div className="text-slate-400 text-lg mb-12 font-light max-w-xl mx-auto">
                  <p>Join the procurement teams reducing error rates by 90% and bid cycle times by 70%.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-center gap-6">
                  <ShimmerButton 
                      onClick={props.onStart}
                      className="px-10 py-4 bg-brandOrange text-white rounded-xl text-sm font-bold uppercase tracking-wide hover:bg-orange-500 transition shadow-[0_0_30px_rgba(249,115,22,0.4)]"
                  >
                      Run A Live Draft
                  </ShimmerButton>
                  <button 
                      onClick={props.onTechDemo}
                      className="px-10 py-4 border border-slate-700 text-slate-300 rounded-xl text-sm font-bold uppercase tracking-wide hover:bg-slate-800 hover:text-white transition"
                  >
                      See How It Works
                  </button>
              </div>
          </div>
      </section>

      <MarketingFooter onNavigate={props.onNavigate} />

    </div>
  );
}
