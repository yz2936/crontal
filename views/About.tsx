
import React from 'react';
import { MarketingNavbar } from '../components/MarketingNavbar';
import { MarketingFooter } from '../components/MarketingFooter';

interface AboutProps {
    onBack: () => void;
    onStart: () => void;
    onNavigate: (page: string) => void;
}

export default function About({ onBack, onStart, onNavigate }: AboutProps) {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
             <MarketingNavbar onStart={onStart} onNavigate={onNavigate} />

            <div className="flex-1 max-w-4xl mx-auto px-6 py-20">
                <div className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider mb-6">Our Vision</div>
                <h1 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">
                    The "Human-In-The-Loop" <br/>
                    <span className="text-brandOrange">Procurement Pilot.</span>
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
                                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
                                <span><strong>Structure First:</strong> Unstructured text is the enemy. We convert everything to structured JSON immediately.</span>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
                                <span><strong>Physics Aware:</strong> A pipe isn't just a string of text. It has physical properties. Our AI understands standards like ASTM and API.</span>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
                                <span><strong>Zero Friction:</strong> No logins for suppliers. No complex onboarding. Just secure, instant links.</span>
                            </li>
                        </ul>
                    </div>

                    <button 
                        onClick={onStart}
                        className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg"
                    >
                        Experience The Pilot
                    </button>
                </div>
            </div>

            <MarketingFooter onNavigate={onNavigate} />
        </div>
    );
}
