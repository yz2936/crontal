
import React, { useState } from 'react';

interface RoiPageProps {
    onBack: () => void;
    onStart: () => void;
}

export default function RoiPage({ onBack, onStart }: RoiPageProps) {
    const [rfqVolume, setRfqVolume] = useState(10); // RFQs per week
    const [hoursPerRfq, setHoursPerRfq] = useState(4); // Hours to draft/manage one RFQ manually
    const [hourlyRate, setHourlyRate] = useState(50); // Hourly cost of engineer

    // Calculations
    // Manual
    const manualHoursWeekly = rfqVolume * hoursPerRfq;
    const manualCostWeekly = manualHoursWeekly * hourlyRate;
    const manualCostYearly = manualCostWeekly * 52;

    // Crontal (Assuming 90% time reduction)
    const crontalHoursPerRfq = hoursPerRfq * 0.1; 
    const crontalHoursWeekly = rfqVolume * crontalHoursPerRfq;
    const crontalCostWeekly = crontalHoursWeekly * hourlyRate;
    const crontalCostYearly = crontalCostWeekly * 52;

    const savingsYearly = manualCostYearly - crontalCostYearly;
    const hoursSavedYearly = (manualHoursWeekly - crontalHoursWeekly) * 52;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* Nav */}
            <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
                <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
                    <svg viewBox="0 0 40 40" fill="none" className="h-8 w-8 rounded-lg">
                        <rect width="40" height="40" rx="8" fill="#0B1121"/>
                        <path d="M12 20C12 15.5817 15.5817 12 20 12C22.25 12 24.28 12.93 25.76 14.43" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                        <path d="M12 20C12 24.4183 15.5817 28 20 28C22.25 28 24.28 27.07 25.76 25.57" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                        <path d="M22 20H32M32 20L28 16M32 20L28 24" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="font-bold text-lg">Crontal</span>
                </div>
                <button onClick={onStart} className="text-sm font-semibold text-brandOrange hover:underline">Start Demo</button>
            </nav>

            <div className="max-w-6xl mx-auto px-6 py-12">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 text-slate-900">Calculate Your Savings</h1>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                        See the tangible impact of switching from manual spreadsheets to AI automation.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 items-start">
                    {/* Inputs */}
                    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                        <h3 className="text-xl font-bold mb-8 text-slate-800">Your Current Metrics</h3>
                        
                        <div className="space-y-8">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-semibold text-slate-600">RFQs per Week</label>
                                    <span className="text-accent font-bold">{rfqVolume}</span>
                                </div>
                                <input 
                                    type="range" min="1" max="50" step="1"
                                    value={rfqVolume}
                                    onChange={(e) => setRfqVolume(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brandOrange"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-semibold text-slate-600">Avg. Hours per RFQ (Drafting + Mgmt)</label>
                                    <span className="text-accent font-bold">{hoursPerRfq} hrs</span>
                                </div>
                                <input 
                                    type="range" min="1" max="20" step="0.5"
                                    value={hoursPerRfq}
                                    onChange={(e) => setHoursPerRfq(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brandOrange"
                                />
                                <p className="text-xs text-slate-400 mt-1">Includes parsing drawings, typing into Excel, emailing, and comparing quotes.</p>
                            </div>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-semibold text-slate-600">Procurement Eng. Hourly Rate ($)</label>
                                    <span className="text-accent font-bold">${hourlyRate}/hr</span>
                                </div>
                                <input 
                                    type="range" min="20" max="200" step="5"
                                    value={hourlyRate}
                                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brandOrange"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="space-y-6">
                        {/* Yearly Savings Card */}
                        <div className="bg-accent text-white p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-brandOrange/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative z-10">
                                <p className="text-slate-400 font-medium uppercase tracking-wider text-sm mb-2">Projected Annual Savings</p>
                                <div className="text-6xl font-bold mb-4 text-green-400">
                                    ${savingsYearly.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <p className="text-slate-300">
                                    And <span className="text-white font-bold">{hoursSavedYearly.toLocaleString()} hours</span> saved per year.
                                </p>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                            <h4 className="font-bold text-slate-700 mb-6">Annual Operational Cost</h4>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-slate-600">Manual Process</span>
                                        <span className="font-bold text-slate-900">${manualCostYearly.toLocaleString()}</span>
                                    </div>
                                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-slate-400 w-full"></div>
                                    </div>
                                </div>
                                
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-brandOrange">With Crontal</span>
                                        <span className="font-bold text-brandOrange">${crontalCostYearly.toLocaleString()}</span>
                                    </div>
                                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-brandOrange transition-all duration-500"
                                            style={{ width: `${(crontalCostYearly / manualCostYearly) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-6 text-center">
                                *Based on 90% efficiency gain in data entry and analysis time.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-16 text-center">
                    <button 
                        onClick={onStart}
                        className="bg-brandOrange hover:bg-orange-600 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-xl shadow-orange-200 transition hover:-translate-y-1"
                    >
                        Start Saving Today
                    </button>
                </div>
            </div>
        </div>
    );
}
