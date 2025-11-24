
import React from 'react';

interface AboutProps {
    onBack: () => void;
    onStart: () => void;
}

export default function About({ onBack, onStart }: AboutProps) {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">
             {/* Nav */}
             <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-100">
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

            <div className="max-w-4xl mx-auto px-6 py-20">
                <div className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider mb-6">Our Vision</div>
                <h1 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">
                    The "Human-in-the-Loop" <br/>
                    <span className="text-accent">Procurement Pilot.</span>
                </h1>
                
                <div className="prose prose-lg text-slate-600">
                    <p className="text-xl leading-relaxed mb-10 text-slate-800">
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

                    <div className="bg-slate-50 p-8 rounded-2xl my-12 border border-slate-200">
                        <h4 className="font-bold text-lg mb-4 text-slate-900">Our Core Principles</h4>
                        <ul className="space-y-4">
                            <li className="flex gap-3">
                                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">1</div>
                                <span><strong>Structure First:</strong> Unstructured text is the enemy. We convert everything to structured JSON immediately.</span>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0">2</div>
                                <span><strong>Physics Aware:</strong> A pipe isn't just a string of text. It has physical properties. Our AI understands standards like ASTM and API.</span>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">3</div>
                                <span><strong>Zero Friction:</strong> No logins for suppliers. No complex onboarding. Just secure, instant links.</span>
                            </li>
                        </ul>
                    </div>

                    <p className="mb-8">
                        The future of procurement isn't about working harder. It's about working with better tools.
                    </p>

                    <button 
                        onClick={onStart}
                        className="bg-accent text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg"
                    >
                        Experience the Pilot
                    </button>
                </div>
            </div>
        </div>
    );
}
