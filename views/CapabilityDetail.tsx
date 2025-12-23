
import React, { useState, useEffect } from 'react';
import { MarketingNavbar } from '../components/MarketingNavbar';
import { MarketingFooter } from '../components/MarketingFooter';
import { Language, CapabilityId } from '../types';
import { t } from '../utils/i18n';

interface CapabilityDetailProps {
    onStart: () => void;
    onNavigate: (page: string) => void;
    lang: Language;
    setLang: (lang: Language) => void;
    capabilityId: CapabilityId;
}

const EfficiencyDemo = ({ id }: { id: CapabilityId }) => {
    const [mode, setMode] = useState<'legacy' | 'auto'>('legacy');

    // Auto-toggle every few seconds if user doesn't interact? 
    // Better to let user toggle to see comparison.
    
    return (
        <div className="w-full max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden mt-12">
            <div className="flex border-b border-slate-100">
                <button 
                    onClick={() => setMode('legacy')}
                    className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${mode === 'legacy' ? 'bg-slate-100 text-slate-900 border-b-2 border-red-500' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    Manual Process (Legacy)
                </button>
                <button 
                    onClick={() => setMode('auto')}
                    className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-colors ${mode === 'auto' ? 'bg-slate-900 text-white border-b-2 border-brandOrange' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                    Crontal Automation
                </button>
            </div>
            
            <div className="h-[400px] relative bg-slate-50 overflow-hidden flex items-center justify-center p-8">
                {/* --- STRUCTURING DEMO --- */}
                {id === 'structuring' && (
                    mode === 'legacy' ? (
                        <div className="flex flex-col items-center animate-in fade-in">
                            <div className="w-64 h-80 bg-white border border-slate-300 shadow-sm p-4 relative rotate-2">
                                <div className="space-y-3 opacity-50 blur-[1px]">
                                    <div className="h-2 bg-slate-800 w-full rounded"></div>
                                    <div className="h-2 bg-slate-800 w-3/4 rounded"></div>
                                    <div className="h-2 bg-slate-800 w-5/6 rounded"></div>
                                    <div className="h-2 bg-slate-800 w-full rounded mt-4"></div>
                                    <div className="h-2 bg-slate-800 w-1/2 rounded"></div>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-slate-400 border-t-slate-600 rounded-full animate-spin"></div>
                                </div>
                            </div>
                            <div className="mt-6 flex items-center gap-2 text-slate-500 font-mono text-sm">
                                <span>Typing...</span>
                                <span className="w-1.5 h-4 bg-slate-500 animate-pulse"></span>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-500">
                            <div className="relative w-full max-w-lg bg-slate-900 rounded-xl shadow-2xl overflow-hidden border border-slate-800">
                                <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-center px-3 gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <div className="ml-auto text-[9px] text-slate-500 font-mono">JSON_OUTPUT_READY</div>
                                </div>
                                <div className="p-4 font-mono text-xs text-green-400 space-y-1">
                                    <div className="flex"><span className="text-purple-400">{"{"}</span></div>
                                    <div className="flex pl-4"><span className="text-blue-400">"item"</span>: <span className="text-amber-300">"Pipe"</span>,</div>
                                    <div className="flex pl-4"><span className="text-blue-400">"size"</span>: <span className="text-amber-300">"6 inch"</span>,</div>
                                    <div className="flex pl-4"><span className="text-blue-400">"spec"</span>: <span className="text-amber-300">"ASTM A106 Gr.B"</span>,</div>
                                    <div className="flex pl-4"><span className="text-blue-400">"qty"</span>: <span className="text-white">500</span></div>
                                    <div className="flex"><span className="text-purple-400">{"}"}</span></div>
                                </div>
                                {/* Scan Line */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.8)] animate-[scan_1.5s_ease-in-out_infinite]"></div>
                            </div>
                        </div>
                    )
                )}

                {/* --- VALIDATION DEMO --- */}
                {id === 'validation' && (
                    mode === 'legacy' ? (
                        <div className="flex flex-col items-center animate-in fade-in">
                            <div className="w-64 h-40 bg-white border border-slate-300 rounded-lg p-4 relative">
                                <div className="text-sm font-bold text-slate-800">Spec: A106 Gr.B</div>
                                <div className="text-xs text-slate-500 mt-1">Check vs NACE?</div>
                                <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center border border-slate-200 animate-bounce">
                                    <span className="text-2xl">?</span>
                                </div>
                            </div>
                            <p className="mt-8 text-sm text-red-500 font-bold">Risk: Human Error</p>
                        </div>
                    ) : (
                        <div className="flex gap-4 animate-in slide-in-from-right">
                            <div className="bg-white p-4 rounded-xl shadow-lg border border-green-100 flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">✓</div>
                                <div>
                                    <div className="text-sm font-bold text-slate-900">ASTM A106</div>
                                    <div className="text-[10px] text-green-600 font-bold uppercase">Standard Verified</div>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-lg border border-green-100 flex items-center gap-3 delay-100">
                                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">✓</div>
                                <div>
                                    <div className="text-sm font-bold text-slate-900">NACE MR0175</div>
                                    <div className="text-[10px] text-green-600 font-bold uppercase">Compliance Check</div>
                                </div>
                            </div>
                        </div>
                    )
                )}

                {/* --- SOURCING DEMO --- */}
                {id === 'sourcing' && (
                    mode === 'legacy' ? (
                        <div className="flex items-center gap-4 animate-in fade-in">
                            <div className="w-16 h-12 bg-white border border-slate-300 rounded flex items-center justify-center shadow-sm relative">
                                <span className="text-xs font-bold text-slate-400">Email</span>
                                <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full"></div>
                            </div>
                            <div className="w-8 h-px bg-slate-300"></div>
                            <div className="w-12 h-12 bg-slate-200 rounded-full animate-pulse"></div>
                        </div>
                    ) : (
                        <div className="relative w-full h-full flex items-center justify-center animate-in zoom-in-95">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-64 h-64 border border-dashed border-slate-300 rounded-full animate-[spin_10s_linear_infinite]"></div>
                            </div>
                            <div className="w-16 h-16 bg-brandOrange rounded-full shadow-lg flex items-center justify-center z-10 text-white font-bold">
                                AI
                            </div>
                            {/* Satellites */}
                            <div className="absolute top-1/2 left-1/4 w-10 h-10 bg-white shadow-md rounded-full flex items-center justify-center text-xs font-bold animate-bounce delay-0">S1</div>
                            <div className="absolute top-1/3 right-1/4 w-10 h-10 bg-white shadow-md rounded-full flex items-center justify-center text-xs font-bold animate-bounce delay-100">S2</div>
                            <div className="absolute bottom-1/3 right-1/3 w-10 h-10 bg-white shadow-md rounded-full flex items-center justify-center text-xs font-bold animate-bounce delay-200">S3</div>
                        </div>
                    )
                )}

                {/* --- COMPARISON DEMO --- */}
                {id === 'comparison' && (
                    mode === 'legacy' ? (
                        <div className="w-64 bg-white border border-slate-300 p-2 shadow-sm rotate-1 animate-in fade-in">
                            <div className="grid grid-cols-4 gap-1 text-[6px] text-slate-400">
                                {[...Array(20)].map((_, i) => <div key={i} className="h-2 bg-slate-100 rounded"></div>)}
                            </div>
                            <div className="mt-4 text-center text-xs text-slate-500">Confusion...</div>
                        </div>
                    ) : (
                        <div className="flex gap-4 items-end h-40 w-64 animate-in slide-in-from-bottom">
                            <div className="w-1/3 bg-slate-200 rounded-t-lg h-[60%] relative group">
                                <div className="absolute -top-6 left-0 right-0 text-center text-xs font-bold text-slate-400">$30k</div>
                            </div>
                            <div className="w-1/3 bg-green-500 rounded-t-lg h-[80%] relative shadow-lg shadow-green-500/30">
                                <div className="absolute -top-6 left-0 right-0 text-center text-xs font-bold text-green-600">$24k</div>
                                <div className="absolute bottom-2 left-0 right-0 text-center text-[8px] text-white font-bold uppercase">Winner</div>
                            </div>
                            <div className="w-1/3 bg-slate-200 rounded-t-lg h-[70%] relative">
                                <div className="absolute -top-6 left-0 right-0 text-center text-xs font-bold text-slate-400">$28k</div>
                            </div>
                        </div>
                    )
                )}

                {/* --- AWARDING DEMO --- */}
                {id === 'awarding' && (
                    mode === 'legacy' ? (
                        <div className="flex flex-col items-center gap-2 animate-in fade-in">
                            <div className="w-40 h-56 bg-white border border-slate-300 p-4 shadow-sm">
                                <div className="h-2 w-12 bg-slate-200 mb-4"></div>
                                <div className="space-y-2">
                                    <div className="h-1 bg-slate-100 w-full"></div>
                                    <div className="h-1 bg-slate-100 w-full"></div>
                                </div>
                            </div>
                            <div className="text-xs text-slate-400">Manual Typing...</div>
                        </div>
                    ) : (
                        <div className="relative animate-in zoom-in-95">
                            <div className="w-40 h-56 bg-white border border-slate-200 p-4 shadow-xl flex flex-col">
                                <div className="flex justify-between border-b border-slate-100 pb-2 mb-2">
                                    <div className="w-8 h-2 bg-slate-800"></div>
                                    <div className="w-4 h-2 bg-slate-200"></div>
                                </div>
                                <div className="space-y-1 flex-1">
                                    <div className="h-1 bg-slate-100 w-full"></div>
                                    <div className="h-1 bg-slate-100 w-3/4"></div>
                                </div>
                                <div className="mt-auto border-t border-slate-100 pt-2">
                                    <div className="h-4 w-16 bg-blue-100 rounded"></div>
                                </div>
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-12 border-4 border-green-600 text-green-600 font-black text-xl flex items-center justify-center -rotate-12 bg-white/90 backdrop-blur-sm animate-[stamp_0.3s_ease-out_forwards_0.3s] opacity-0">
                                SENT
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    )
};

export default function CapabilityDetail({ onStart, onNavigate, lang, setLang, capabilityId }: CapabilityDetailProps) {
    
    // Config based on ID
    const config = {
        structuring: {
            icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
            titleKey: 'cap_structuring_title',
            subKey: 'cap_structuring_subtitle',
            probKey: 'cap_structuring_problem',
            solKey: 'cap_structuring_solution',
            features: ['cap_structuring_feat_1', 'cap_structuring_feat_2', 'cap_structuring_feat_3', 'cap_structuring_feat_4'],
            color: "blue"
        },
        validation: {
            icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
            titleKey: 'cap_validation_title',
            subKey: 'cap_validation_subtitle',
            probKey: 'cap_validation_problem',
            solKey: 'cap_validation_solution',
            features: ['cap_validation_feat_1', 'cap_validation_feat_2', 'cap_validation_feat_3', 'cap_validation_feat_4'],
            color: "green"
        },
        sourcing: {
            icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
            titleKey: 'cap_sourcing_title',
            subKey: 'cap_sourcing_subtitle',
            probKey: 'cap_sourcing_problem',
            solKey: 'cap_sourcing_solution',
            features: ['cap_sourcing_feat_1', 'cap_sourcing_feat_2', 'cap_sourcing_feat_3', 'cap_sourcing_feat_4'],
            color: "brandOrange"
        },
        comparison: {
            icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
            titleKey: 'cap_comparison_title',
            subKey: 'cap_comparison_subtitle',
            probKey: 'cap_comparison_problem',
            solKey: 'cap_comparison_solution',
            features: ['cap_comparison_feat_1', 'cap_comparison_feat_2', 'cap_comparison_feat_3', 'cap_comparison_feat_4'],
            color: "purple"
        },
        awarding: {
            icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
            titleKey: 'cap_awarding_title',
            subKey: 'cap_awarding_subtitle',
            probKey: 'cap_awarding_problem',
            solKey: 'cap_awarding_solution',
            features: ['cap_awarding_feat_1', 'cap_awarding_feat_2', 'cap_awarding_feat_3', 'cap_awarding_feat_4'],
            color: "slate"
        }
    };

    const current = config[capabilityId];
    
    // Safe typing for keys
    const title = t(lang, current.titleKey as any);
    const sub = t(lang, current.subKey as any);
    const prob = t(lang, current.probKey as any);
    const sol = t(lang, current.solKey as any);

    // Color mapping for dynamic styles
    const bgColors: Record<string, string> = {
        blue: "bg-blue-500",
        green: "bg-green-500",
        brandOrange: "bg-brandOrange",
        purple: "bg-purple-500",
        slate: "bg-slate-600"
    };
    const textColors: Record<string, string> = {
        blue: "text-blue-500",
        green: "text-green-500",
        brandOrange: "text-brandOrange",
        purple: "text-purple-500",
        slate: "text-slate-600"
    };
    const borderColors: Record<string, string> = {
        blue: "border-blue-100",
        green: "border-green-100",
        brandOrange: "border-orange-100",
        purple: "border-purple-100",
        slate: "border-slate-100"
    };
    const lightBgColors: Record<string, string> = {
        blue: "bg-blue-50",
        green: "bg-green-50",
        brandOrange: "bg-orange-50",
        purple: "bg-purple-50",
        slate: "bg-slate-50"
    };

    const activeColor = bgColors[current.color] || bgColors.slate;
    const activeText = textColors[current.color] || textColors.slate;
    const activeBorder = borderColors[current.color] || borderColors.slate;
    const activeLightBg = lightBgColors[current.color] || lightBgColors.slate;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
            <MarketingNavbar onStart={onStart} onNavigate={onNavigate} lang={lang} setLang={setLang} />

            <div className="flex-1">
                {/* HERO SECTION */}
                <div className="bg-slate-900 text-white pt-24 pb-32 relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/2 ${activeColor}`}></div>
                    <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 mb-8 backdrop-blur-sm border border-white/10 ${activeText}`}>
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={current.icon} /></svg>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">{title}</h1>
                        <p className="text-xl md:text-2xl text-slate-400 font-light max-w-3xl mx-auto leading-relaxed">{sub}</p>
                    </div>
                </div>

                {/* EFFICIENCY DEMO - NEW SECTION */}
                <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-20 mb-24">
                    <div className="text-center mb-4">
                        <span className="bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-slate-700 shadow-lg">Efficiency Engine</span>
                    </div>
                    <EfficiencyDemo id={capabilityId} />
                </div>

                {/* CONTENT CARD - PROBLEM / SOLUTION */}
                <div className="max-w-7xl mx-auto px-6 mb-24">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="grid md:grid-cols-2">
                            <div className="p-12 md:p-16 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-center">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                    The Challenge
                                </h3>
                                <p className="text-lg md:text-xl text-slate-600 leading-relaxed font-medium">{prob}</p>
                            </div>
                            <div className={`p-12 md:p-16 ${activeLightBg} flex flex-col justify-center`}>
                                <h3 className={`text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2 ${activeText}`}>
                                    <span className={`w-2 h-2 rounded-full ${activeColor}`}></span>
                                    The Solution
                                </h3>
                                <p className="text-lg md:text-xl text-slate-800 leading-relaxed font-medium">{sol}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* DEEP CAPABILITIES GRID */}
                <div className="max-w-7xl mx-auto px-6 mb-24">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Core Features</h2>
                        <p className="text-slate-500">Built for the complexity of industrial supply chains.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {current.features.map((featKey, i) => (
                            <div key={i} className={`bg-white p-8 rounded-2xl border ${activeBorder} shadow-sm hover:shadow-md transition-all`}>
                                <div className={`w-10 h-10 rounded-full ${activeLightBg} ${activeText} flex items-center justify-center mb-4 font-bold text-sm`}>
                                    {i + 1}
                                </div>
                                <h3 className="font-bold text-slate-900 mb-2">{t(lang, featKey as any)}</h3>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="bg-slate-100 py-24 text-center">
                    <div className="max-w-2xl mx-auto px-6">
                        <h2 className="text-3xl font-bold text-slate-900 mb-6">See {title} In Action</h2>
                        <p className="text-slate-600 mb-10 text-lg">Don't just take our word for it. Try the interactive demo to see how much time you can save.</p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <button onClick={() => onNavigate('HOME')} className="px-8 py-4 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-white hover:border-slate-400 transition uppercase tracking-wide text-sm">Back to Overview</button>
                            <button onClick={onStart} className="px-8 py-4 rounded-xl bg-brandOrange text-white font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-200 uppercase tracking-wide text-sm">Start Interactive Demo</button>
                        </div>
                    </div>
                </div>
            </div>

            <MarketingFooter onNavigate={onNavigate} />
        </div>
    );
}
