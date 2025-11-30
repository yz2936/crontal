
import React from 'react';
import { MarketingNavbar } from '../components/MarketingNavbar';
import { MarketingFooter } from '../components/MarketingFooter';

interface SupplierLandingPageProps {
  onBack: () => void;
  onStartDemo: () => void;
  onNavigate: (page: string) => void;
}

export default function SupplierLandingPage({ onBack, onStartDemo, onNavigate }: SupplierLandingPageProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      <MarketingNavbar onStart={onStartDemo} onNavigate={onNavigate} />

      {/* Hero */}
      <div className="flex-1 max-w-7xl mx-auto px-6 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                  <div className="inline-block px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-bold uppercase tracking-wider mb-6">
                      Zero Friction
                  </div>
                  <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-slate-900">
                      Stop Struggling With <br/>
                      <span className="text-brandOrange">Clunky Portals.</span>
                  </h1>
                  <p className="text-xl text-slate-500 mb-10 leading-relaxed">
                      Crontal is the first procurement platform suppliers actually love. No logins to remember. No passwords to reset. Just a secure link and a clean interface.
                  </p>
                  
                  <div className="flex flex-col gap-4">
                      <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">1</div>
                          <div>
                              <h3 className="font-bold text-lg">Receive Link</h3>
                              <p className="text-slate-500 text-sm">Get A Secure RFQ Link Via Email Or WhatsApp.</p>
                          </div>
                      </div>
                      <div className="h-8 border-l-2 border-slate-100 ml-4"></div>
                      <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">2</div>
                          <div>
                              <h3 className="font-bold text-lg">Input Pricing</h3>
                              <p className="text-slate-500 text-sm">Fill In Unit Prices Directly In Your Browser. Mobile Friendly.</p>
                          </div>
                      </div>
                      <div className="h-8 border-l-2 border-slate-100 ml-4"></div>
                      <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold shrink-0">3</div>
                          <div>
                              <h3 className="font-bold text-lg">Instant Submit</h3>
                              <p className="text-slate-500 text-sm">Click Submit. The Buyer Gets Your Quote Instantly. Done.</p>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Visual Mockup */}
              <div className="relative">
                  <div className="absolute inset-0 bg-brandOrange/5 rounded-3xl transform rotate-3 scale-105 -z-10"></div>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden relative">
                        {/* Mock Header */}
                        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                            </div>
                            <div className="text-[10px] font-bold text-slate-400">SUPPLIER VIEW</div>
                        </div>
                        {/* Mock Content */}
                        <div className="p-6">
                             <div className="flex justify-between items-start mb-6">
                                 <div>
                                     <div className="text-xs text-slate-400 font-bold uppercase">Project</div>
                                     <div className="text-lg font-bold text-slate-900">Texas LNG Expansion</div>
                                 </div>
                                 <div className="text-right">
                                     <div className="text-xs text-slate-400 font-bold uppercase">Status</div>
                                     <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Open</div>
                                 </div>
                             </div>

                             <table className="w-full text-sm mb-6">
                                 <thead>
                                     <tr className="text-slate-400 border-b border-slate-100 text-xs">
                                         <th className="py-2 text-left">Item</th>
                                         <th className="py-2 text-right">Qty</th>
                                         <th className="py-2 text-right">Price</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     <tr className="border-b border-slate-50">
                                         <td className="py-3 font-medium">Seamless Pipe 6"</td>
                                         <td className="py-3 text-right">500 m</td>
                                         <td className="py-3 text-right">
                                             <div className="bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded w-20 ml-auto text-right font-mono">$38.50</div>
                                         </td>
                                     </tr>
                                     <tr>
                                         <td className="py-3 font-medium">WN Flange #150</td>
                                         <td className="py-3 text-right">20 pcs</td>
                                         <td className="py-3 text-right">
                                             <div className="bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded w-20 ml-auto text-right font-mono">$120.00</div>
                                         </td>
                                     </tr>
                                 </tbody>
                             </table>
                             
                             <div className="bg-accent text-white text-center py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 cursor-pointer">
                                 Submit Quote
                             </div>
                        </div>
                  </div>
                  
                  {/* Floating Badges */}
                  <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-xl shadow-xl border border-slate-100 animate-bounce">
                      <div className="text-xs font-bold text-slate-400 uppercase mb-1">Total Quote</div>
                      <div className="text-2xl font-bold text-green-600">$21,650.00</div>
                  </div>
              </div>
          </div>
      </div>

      <MarketingFooter onNavigate={onNavigate} />
    </div>
  );
}
