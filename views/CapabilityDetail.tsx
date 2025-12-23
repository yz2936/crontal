
import React from 'react';
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

                {/* CONTENT CARD - PROBLEM / SOLUTION */}
                <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-20 mb-24">
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

                {/* VISUAL FLOW (Process Visualization) */}
                <div className="max-w-5xl mx-auto px-6 mb-24">
                    <div className="bg-slate-900 rounded-3xl p-12 text-center relative overflow-hidden">
                        {/* Background Decoration */}
                        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>
                        
                        <h2 className="text-2xl font-bold text-white mb-12 relative z-10">Process Workflow</h2>
                        
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
                            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 w-full md:w-64">
                                <div className="text-4xl mb-4 opacity-80">📄</div>
                                <div className="text-sm font-bold text-slate-300 uppercase tracking-wide">Input</div>
                                <div className="text-xs text-slate-500 mt-1">Unstructured Data</div>
                            </div>
                            
                            <div className="hidden md:flex flex-col items-center gap-1 text-slate-600">
                                <div className="h-px w-12 bg-slate-600"></div>
                                <svg className="w-4 h-4 -mr-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                            <div className="md:hidden text-slate-600 rotate-90 transform">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>

                            <div className={`bg-slate-800 p-8 rounded-2xl border ${activeBorder} w-full md:w-80 shadow-2xl relative overflow-hidden group`}>
                                <div className={`absolute top-0 left-0 w-full h-1 ${activeColor}`}></div>
                                <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">⚙️</div>
                                <div className="text-sm font-bold text-white uppercase tracking-wide">Crontal Engine</div>
                                <div className="text-xs text-slate-400 mt-1">AI Processing & Validation</div>
                            </div>

                            <div className="hidden md:flex flex-col items-center gap-1 text-slate-600">
                                <div className="h-px w-12 bg-slate-600"></div>
                                <svg className="w-4 h-4 -mr-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                            <div className="md:hidden text-slate-600 rotate-90 transform">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>

                            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 w-full md:w-64">
                                <div className="text-4xl mb-4 opacity-80">🚀</div>
                                <div className="text-sm font-bold text-slate-300 uppercase tracking-wide">Result</div>
                                <div className="text-xs text-slate-500 mt-1">Actionable Intelligence</div>
                            </div>
                        </div>
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
