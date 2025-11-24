
import React, { useState, useEffect } from 'react';

export const AutoDemo: React.FC = () => {
  const [phase, setPhase] = useState(0); // 0: Input, 1: Processing, 2: Dashboard, 3: Quote, 4: PDF
  const [text, setText] = useState('');
  
  const fullText = "Need 500m of 6\" Sch40 Smls Pipe & 20 WN Flanges #150.";
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const runSequence = async () => {
      // Phase 0: Typing
      if (phase === 0) {
        if (text.length < fullText.length) {
          timeout = setTimeout(() => {
            setText(fullText.slice(0, text.length + 1));
          }, 40);
        } else {
          timeout = setTimeout(() => setPhase(1), 800);
        }
      }

      // Phase 1: AI Processing
      if (phase === 1) {
        timeout = setTimeout(() => setPhase(2), 2000);
      }

      // Phase 2: Dashboard/Table View
      if (phase === 2) {
        timeout = setTimeout(() => setPhase(3), 2500);
      }

      // Phase 3: Quote Comparison
      if (phase === 3) {
        timeout = setTimeout(() => setPhase(4), 2500);
      }

      // Phase 4: PDF Generation (Hold longer)
      if (phase === 4) {
        timeout = setTimeout(() => {
            setText('');
            setPhase(0);
        }, 5000); 
      }
    };

    runSequence();
    return () => clearTimeout(timeout);
  }, [phase, text]);

  return (
    <div className="relative w-full max-w-5xl mx-auto group">
      
      {/* Feature Badge Container - Explains what is happening */}
      <div className="absolute -top-12 left-0 right-0 flex justify-center z-30">
          <div className="bg-slate-900/90 backdrop-blur text-white px-6 py-2.5 rounded-full shadow-2xl border border-slate-700 flex items-center gap-3 transition-all duration-300 transform">
             <div className={`w-2 h-2 rounded-full ${phase === 4 ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : 'bg-accent animate-pulse'}`}></div>
             <p className="text-sm font-medium tracking-wide">
                 {phase === 0 && "Step 1: Drafting with Natural Language..."}
                 {phase === 1 && "Step 2: AI Extracting Engineering Specs..."}
                 {phase === 2 && "Step 3: Auto-Structured RFQ Data"}
                 {phase === 3 && "Step 4: Comparing Supplier Quotes"}
                 {phase === 4 && "Final Step: Instant Commercial Invoice Generation"}
             </p>
          </div>
      </div>

      {/* Main UI Container */}
      <div className="relative bg-slate-100 rounded-2xl border border-slate-300 shadow-2xl overflow-hidden h-[500px] flex flex-col">
        
        {/* App Header Mockup */}
        <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0">
            <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            <div className="text-xs font-bold text-slate-400 tracking-wider">CRONTAL BUYER PORTAL</div>
            <div className="w-4"></div>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
            
            {/* Left Sidebar (Static) */}
            <div className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col p-4 gap-2">
                <div className="w-full h-8 bg-accent text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-sm">
                    + New Project
                </div>
                <div className="space-y-2 mt-4">
                    <div className="h-6 w-3/4 bg-slate-100 rounded"></div>
                    <div className="h-6 w-full bg-slate-100 rounded"></div>
                    <div className="h-6 w-1/2 bg-slate-100 rounded"></div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-slate-50 relative p-6">
                
                {/* 1. Chat Interface (Phase 0 & 1) */}
                <div className={`absolute inset-6 bg-white rounded-2xl border border-slate-200 shadow-lg p-4 transition-all duration-500 transform origin-bottom-left ${phase >= 2 ? 'scale-90 opacity-0 translate-y-10' : 'scale-100 opacity-100'}`}>
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                         <span className="text-xs font-bold uppercase text-slate-400">Drafting Assistant</span>
                    </div>
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-3 rounded-lg rounded-bl-none text-sm text-slate-600 w-fit">
                            Hi! What do you need to source today?
                        </div>
                        {text && (
                            <div className="flex justify-end">
                                <div className="bg-slate-800 text-white p-3 rounded-lg rounded-br-none text-sm shadow-md">
                                    {text}
                                    <span className="animate-pulse">|</span>
                                </div>
                            </div>
                        )}
                        {phase === 1 && (
                            <div className="flex items-center gap-2 text-accent text-xs font-medium bg-accent/5 p-2 rounded-lg w-fit animate-in fade-in">
                                <div className="w-2 h-2 bg-accent rounded-full animate-bounce"></div>
                                Extracting ASTM Standards & Dimensions...
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Structured Table (Phase 2 & 3) */}
                <div className={`absolute inset-6 bg-white rounded-2xl border border-slate-200 shadow-lg flex flex-col transition-all duration-500 ${phase === 2 || phase === 3 ? 'opacity-100 translate-y-0 scale-100 z-10' : 'opacity-0 translate-y-4 scale-95 z-0'}`}>
                     <div className="h-12 border-b border-slate-100 flex items-center justify-between px-4 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                             <div className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded">AI AUDIT PASS</div>
                             <span className="text-xs font-bold text-slate-700">RFQ #2291 - Piping Material</span>
                        </div>
                        {phase === 3 && <div className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold animate-pulse">1 New Quote Received</div>}
                     </div>
                     <div className="p-4">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="text-slate-400 border-b border-slate-100">
                                    <th className="pb-2 pl-2">Line / Std</th>
                                    <th className="pb-2">Description</th>
                                    <th className="pb-2 text-center">OD (mm)</th>
                                    <th className="pb-2 text-center">WT (mm)</th>
                                    <th className="pb-2 text-right pr-2">Qty</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700 font-mono text-[10px]">
                                <tr className="border-b border-slate-50">
                                    <td className="py-2.5 pl-2">
                                        <div className="font-bold text-slate-900">001</div>
                                        <div className="text-slate-400 text-[9px]">API 5L</div>
                                    </td>
                                    <td className="py-2.5 font-medium">Smls Pipe Gr.B</td>
                                    <td className="py-2.5 text-center text-blue-600 bg-blue-50/30">168.3</td>
                                    <td className="py-2.5 text-center text-blue-600 bg-blue-50/30">7.11</td>
                                    <td className="py-2.5 text-right pr-2 font-bold">500 m</td>
                                </tr>
                                <tr>
                                    <td className="py-2.5 pl-2">
                                        <div className="font-bold text-slate-900">002</div>
                                        <div className="text-slate-400 text-[9px]">ASTM A105</div>
                                    </td>
                                    <td className="py-2.5 font-medium">WN Flange #150</td>
                                    <td className="py-2.5 text-center text-blue-600 bg-blue-50/30">168.3</td>
                                    <td className="py-2.5 text-center text-slate-300">-</td>
                                    <td className="py-2.5 text-right pr-2 font-bold">20 pcs</td>
                                </tr>
                            </tbody>
                        </table>
                        
                        {/* Quote Compare Overlay */}
                        {phase === 3 && (
                            <div className="absolute bottom-4 right-4 left-4 bg-slate-900 text-white p-4 rounded-xl shadow-xl animate-in slide-in-from-bottom-2">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-slate-400">BEST OFFER</span>
                                    <span className="text-xs font-bold text-green-400">$24,500.00</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="font-bold text-sm">Global Steel Co.</div>
                                        <div className="text-[10px] text-slate-400">Lead Time: 14 Days</div>
                                    </div>
                                    <button className="bg-green-500 text-slate-900 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-green-400 transition shadow-[0_0_15px_rgba(74,222,128,0.5)]">
                                        Generate PO
                                    </button>
                                </div>
                            </div>
                        )}
                     </div>
                </div>

                {/* 3. The PDF Generation (Phase 4) - The Highlight */}
                <div className={`absolute inset-0 z-20 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity duration-500 ${phase === 4 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                     <div className={`bg-white w-[350px] md:w-[450px] h-[550px] shadow-2xl relative animate-in zoom-in-95 duration-500 slide-in-from-bottom-8 flex flex-col`}>
                        {/* Professional PDF Header */}
                        <div className="p-4 border-b border-slate-100 flex justify-between items-start">
                             <div className="flex gap-2 items-center">
                                <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold font-serif">C</div>
                                <span className="font-bold text-slate-900 text-lg tracking-tight">CRONTAL</span>
                             </div>
                             <div className="text-right">
                                <h1 className="text-base font-bold text-slate-900 font-serif">Commercial Invoice</h1>
                                <p className="text-[9px] text-slate-500">Order #: 65619-00</p>
                                <p className="text-[9px] text-slate-500">Date: 22-Sep-2023</p>
                             </div>
                        </div>

                        <div className="p-4 flex-1 text-[8px] font-sans flex flex-col">
                            {/* Address Blocks */}
                            <div className="flex justify-between mb-4 gap-4">
                                <div className="w-1/2">
                                    <p className="font-bold text-slate-900 mb-1">BUYER:</p>
                                    <p className="text-slate-600">APPLETON MARINE, INC</p>
                                    <p className="text-slate-600">3030 E Pershing St</p>
                                    <p className="text-slate-600">Appleton, WI 54911</p>
                                </div>
                                <div className="w-1/2">
                                     <p className="font-bold text-slate-900 mb-1">DELIVERY TO:</p>
                                     <p className="text-slate-600">APPLETON MARINE, INC</p>
                                     <p className="text-slate-600">Same as Buyer</p>
                                </div>
                            </div>

                            {/* Detailed Grid Table */}
                            <div className="border border-slate-300 mb-2">
                                <div className="grid grid-cols-12 bg-slate-100 font-bold border-b border-slate-300 p-1">
                                    <div className="col-span-3">Size (OD*WT*L)</div>
                                    <div className="col-span-1">OD</div>
                                    <div className="col-span-1">WT</div>
                                    <div className="col-span-1">L</div>
                                    <div className="col-span-2 text-right">Qty</div>
                                    <div className="col-span-2 text-right">Price</div>
                                    <div className="col-span-2 text-right">Amount</div>
                                </div>
                                {/* Row 1 */}
                                 <div className="grid grid-cols-12 p-1 border-b border-slate-200">
                                    <div className="col-span-3">6" x Sch40 x 12m</div>
                                    <div className="col-span-1 text-slate-500">168.3</div>
                                    <div className="col-span-1 text-slate-500">7.11</div>
                                    <div className="col-span-1 text-slate-500">12000</div>
                                    <div className="col-span-2 text-right font-medium">500m</div>
                                    <div className="col-span-2 text-right text-slate-600">45.00</div>
                                    <div className="col-span-2 text-right font-bold">22,500.00</div>
                                </div>
                                 {/* Row 2 */}
                                 <div className="grid grid-cols-12 p-1 border-b border-slate-200">
                                    <div className="col-span-3">6" #150 WN</div>
                                    <div className="col-span-1 text-slate-500">168.3</div>
                                    <div className="col-span-1 text-slate-300">-</div>
                                    <div className="col-span-1 text-slate-300">-</div>
                                    <div className="col-span-2 text-right font-medium">20pcs</div>
                                    <div className="col-span-2 text-right text-slate-600">100.00</div>
                                    <div className="col-span-2 text-right font-bold">2,000.00</div>
                                </div>
                            </div>
                            
                            {/* Totals */}
                            <div className="flex justify-end mb-6">
                                 <div className="border border-slate-900 p-2 min-w-[120px] flex justify-between font-bold text-[9px]">
                                    <span>Total USD</span>
                                    <span>24,500.00</span>
                                 </div>
                            </div>

                            {/* Footer Terms */}
                            <div className="mt-auto space-y-1 text-[7px] text-slate-600">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p><span className="font-bold text-slate-900">Payment:</span> Net 30 Days</p>
                                        <p><span className="font-bold text-slate-900">Delivery:</span> 14 Days from PO</p>
                                        <p><span className="font-bold text-slate-900">Packing:</span> Plywooden Cases</p>
                                    </div>
                                    <div>
                                         <p><span className="font-bold text-slate-900">Quality:</span> ASTM A213 / A105</p>
                                         <p><span className="font-bold text-slate-900">Documents:</span> MTR, PL, CI</p>
                                    </div>
                                </div>
                                <div className="border-t border-slate-400 mt-4 pt-2 flex justify-between items-end">
                                    <span className="font-bold text-slate-900">AUTHORIZED SIGNATURE</span>
                                    <span className="font-script text-lg text-blue-900 -mb-2 mr-8 rotate-[-2deg]">Crontal Inc.</span>
                                </div>
                            </div>
                        </div>

                        {/* "Generated" Badge Animation */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-4 border-green-600 text-green-600 font-black text-2xl px-6 py-2 rounded -rotate-12 opacity-0 animate-[stamp_0.3s_ease-in_forwards_0.6s] shadow-xl bg-white/50 backdrop-blur-sm">
                            APPROVED
                        </div>
                     </div>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};
