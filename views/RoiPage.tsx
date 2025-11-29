import React, { useState } from 'react';

interface RoiPageProps {
    onBack: () => void;
    onStart: () => void;
}

export default function RoiPage({ onBack, onStart }: RoiPageProps) {
    const [rfqVolume, setRfqVolume] = useState(20);
    const [timePerRfq, setTimePerRfq] = useState(4); // hours
    const [hourlyRate, setHourlyRate] = useState(65); // USD
    
    // Calculations
    const manualCost = rfqVolume * timePerRfq * hourlyRate;
    const crontalTime = rfqVolume * 0.25; // 15 mins per RFQ
    const crontalCost = crontalTime * hourlyRate;
    const savings = manualCost - crontalCost;
    const hoursSaved = (rfqVolume * timePerRfq) - crontalTime;

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">
             {/* Nav */}
             <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur z-50">
                <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
                    <svg viewBox="0 0 40 40" fill="none" className="h-8 w-8 rounded-lg shadow-sm">
                        <rect width="40" height="40" rx="8" fill="#0B1121"/>
                        <path d="M12 20C12 15.5817 15.5817 12 20 12C22.25 12 24.28 12.93 25.76 14.43" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                        <path d="M12 20C12 24.4183 15.5817 28 20 28C22.25 28 24.28 27.07 25.76 25.57" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                        <path d="M22 20H32M32 20L28 16M32 20L28 24" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="font-bold text-lg">Crontal <span className="text-slate-400 font-normal">| ROI Calculator</span></span>
                </div>
                <button onClick={onStart} className="bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 transition">
                    Start Saving
                </button>
            </nav>

            <div className="max-w-5xl mx-auto px-6 py-16">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold mb-4 text-slate-900">Calculate your Engineering Time Savings</h1>
                    <p className="text-slate-500 text-lg">See exactly how much manual data entry is costing your procurement team.</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 items-start">
                    
                    {/* Inputs */}
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
                        <h3 className="font-bold text-slate-900 mb-6">Your Inputs</h3>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">RFQs Processed per Month</label>
                                <input 
                                    type="range" 
                                    min="1" max="100" 
                                    value={rfqVolume} 
                                    onChange={e => setRfqVolume(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brandOrange"
                                />
                                <div className="mt-2 text-right font-mono font-bold text-brandOrange">{rfqVolume} RFQs</div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Avg. Hours Spent per RFQ (Manual)</label>
                                <div className="text-xs text-slate-400 mb-2">Reading specs, typing into Excel, fixing errors.</div>
                                <input 
                                    type="number" 
                                    value={timePerRfq}
                                    onChange={e => setTimePerRfq(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brandOrange/20 focus:border-brandOrange outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Avg. Engineer Hourly Rate ($)</label>
                                <input 
                                    type="number" 
                                    value={hourlyRate}
                                    onChange={e => setHourlyRate(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brandOrange/20 focus:border-brandOrange outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-brandOrange/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            
                            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Estimated Monthly Savings</h3>
                            <div className="text-5xl font-bold text-white mb-1">
                                ${savings.toLocaleString(undefined, {maximumFractionDigits: 0})}
                            </div>
                            <div className="text-emerald-400 font-medium text-sm">
                                + {hoursSaved.toLocaleString()} Engineering Hours Saved
                            </div>

                            <div className="mt-8 pt-8 border-t border-slate-700 grid grid-cols-2 gap-8">
                                <div>
                                    <div className="text-slate-400 text-xs mb-1">Manual Process</div>
                                    <div className="text-xl font-bold text-red-400">${manualCost.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div className="text-slate-400 text-xs mb-1">With Crontal</div>
                                    <div className="text-xl font-bold text-brandOrange">${crontalCost.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-white border border-slate-100 rounded-xl shadow-sm">
                            <h4 className="font-bold text-slate-900 mb-4">The "Hidden" Cost of Errors</h4>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                This calculator only measures time. It doesn't include the cost of <strong>incorrect material grades</strong>, <strong>missed delivery dates</strong>, or <strong>manufacturing rework</strong> caused by manual data entry errors.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}