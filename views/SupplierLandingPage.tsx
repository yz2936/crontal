import React from 'react';

interface SupplierLandingPageProps {
  onBack: () => void;
  onStartDemo: () => void;
}

export default function SupplierLandingPage({ onBack, onStartDemo }: SupplierLandingPageProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      
      {/* Navbar */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
          <svg viewBox="0 0 40 40" fill="none" className="h-8 w-8 rounded-lg shadow-sm">
                <rect width="40" height="40" rx="8" fill="#0B1121"/>
                <path d="M12 20C12 15.5817 15.5817 12 20 12C22.25 12 24.28 12.93 25.76 14.43" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M12 20C12 24.4183 15.5817 28 20 28C22.25 28 24.28 27.07 25.76 25.57" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M22 20H32M32 20L28 16M32 20L28 24" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          <span className="font-bold text-lg">Crontal <span className="text-slate-400 font-normal">| Suppliers</span></span>
        </div>
        <button onClick={onStartDemo} className="bg-accent text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition">
          See Buyer View
        </button>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                  <div className="inline-block px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-bold uppercase tracking-wider mb-6">
                      Zero Friction
                  </div>
                  <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-slate-900">
                      Stop struggling with <br/>
                      <span className="text-brandOrange">clunky portals.</span>
                  </h1>
                  <p className="text-xl text-slate-500 mb-10 leading-relaxed">
                      Crontal is the first procurement platform suppliers actually love. No logins to remember. No passwords to reset. Just a secure link and a clean interface.
                  </p>
                  
                  <div className="flex flex-col gap-4">
                      <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">1</div>
                          <div>
                              <h3 className="font-bold text-lg">Receive Link</h3>
                              <p className="text-slate-500 text-sm">Get a secure RFQ link via email or WhatsApp.</p>
                          </div>
                      </div>
                      <div className="h-8 border-l-2 border-slate-100 ml-4"></div>
                      <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">2</div>
                          <div>
                              <h3 className="font-bold text-lg">Input Pricing</h3>
                              <p className="text-slate-500 text-sm">Fill in unit prices directly in your browser. Mobile friendly.</p>
                          </div>
                      </div>
                      <div className="h-8 border-l-2 border-slate-100 ml-4"></div>
                      <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold shrink-0">3</div>
                          <div>
                              <h3 className="font-bold text-lg">Instant Submit</h3>
                              <p className="text-slate-500 text-sm">Click submit. The buyer gets your quote instantly. Done.</p>
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

      {/* Feature Grid */}
      <div className="bg-slate-50 py-24">
          <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                  <h2 className="text-3xl font-bold text-slate-900">Why suppliers prefer Crontal</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-4 font-bold text-xl">Aa</div>
                      <h3 className="font-bold text-lg mb-2">Native Language Specs</h3>
                      <p className="text-slate-500 text-sm">We translate the buyer's technical specs into your local language automatically, reducing misunderstandings.</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-brandOrange mb-4">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      </div>
                      <h3 className="font-bold text-lg mb-2">100% Mobile Ready</h3>
                      <p className="text-slate-500 text-sm">Review requests and submit quotes from your phone while you are on the factory floor.</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <h3 className="font-bold text-lg mb-2">Instant Confirmation</h3>
                      <p className="text-slate-500 text-sm">Get immediate digital confirmation that your quote was received and viewed by the buyer.</p>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
}