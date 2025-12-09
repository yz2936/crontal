import React, { useState, useRef } from 'react';
import LZString from 'lz-string';
import { Rfq, Quote, Language, FileAttachment, SupplierFilters } from '../types';
import { parseRequest, analyzeRfqRisks, findSuppliers } from '../services/geminiService';
import { t } from '../utils/i18n';

interface BuyerViewProps {
    rfq: Rfq | null;
    setRfq: (rfq: Rfq | null) => void;
    quotes: Quote[];
    lang: Language;
}

export default function BuyerView({ rfq, setRfq, quotes, lang }: BuyerViewProps) {
    const [activeTab, setActiveTab] = useState<'DRAFT' | 'RISK' | 'SOURCE' | 'COMPARE'>('DRAFT');
    const [chatInput, setChatInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [chatHistory, setChatHistory] = useState<{role: 'user'|'ai', text: string}[]>([]);
    const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
    const [showSidebar, setShowSidebar] = useState(true);
    
    // Risk & Sourcing State
    const [isAnalyzingRisk, setIsAnalyzingRisk] = useState(false);
    const [isSourcing, setIsSourcing] = useState(false);
    const [supplierFilters] = useState<SupplierFilters>({ region: 'Global', types: [], certs: [] });

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helpers for Dashboard
    const getBestPriceId = () => {
        if (quotes.length === 0) return '';
        return quotes.reduce((min, p) => p.total < min.total ? p : min, quotes[0]).id;
    };

    const getFastestLeadTimeId = () => {
        if (quotes.length === 0) return '';
        const parseDays = (s: string) => parseInt(s.replace(/\D/g, '')) || 999;
        return quotes.reduce((min, p) => parseDays(p.leadTime) < parseDays(min.leadTime) ? p : min, quotes[0]).id;
    };

    const getRecommendation = () => {
        if (quotes.length === 0) return "Waiting for quotes to generate insights.";
        const bestPrice = quotes.find(q => q.id === getBestPriceId());
        const fastest = quotes.find(q => q.id === getFastestLeadTimeId());
        
        if (bestPrice?.id === fastest?.id) {
            return `${bestPrice?.supplierName} is the clear winner for both price and speed.`;
        }
        return `${bestPrice?.supplierName} offers the best price, but ${fastest?.supplierName} is faster.`;
    };

    // Handlers
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64 = (ev.target?.result as string).split(',')[1];
                setAttachedFiles(prev => [...prev, {
                    name: file.name,
                    mimeType: file.type,
                    data: base64
                }]);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleChatSubmit = async () => {
        if ((!chatInput.trim() && attachedFiles.length === 0) || isProcessing) return;

        const userMsg = chatInput;
        setChatInput('');
        setIsProcessing(true);
        setChatHistory(prev => [...prev, { role: 'user', text: userMsg || (attachedFiles.length ? "Attached files for processing" : "") }]);

        try {
            const currentItems = rfq ? rfq.line_items : [];
            const result = await parseRequest(
                userMsg, 
                rfq?.project_name || null, 
                attachedFiles, 
                lang, 
                currentItems
            );

            // Update RFQ State
            const newRfq: Rfq = rfq ? { ...rfq } : {
                id: `RFQ-${Date.now()}`,
                project_name: result.rfqUpdates.project_name || "New Project",
                line_items: [],
                commercial: {
                    destination: "", incoterm: "", paymentTerm: "", otherRequirements: "",
                    req_mtr: false, req_avl: false, req_tpi: false, warranty_months: 12
                },
                created_at: Date.now(),
                status: 'draft',
                original_text: userMsg
            };

            // Merge updates
            if (result.rfqUpdates.project_name) newRfq.project_name = result.rfqUpdates.project_name;
            if (result.rfqUpdates.line_items) newRfq.line_items = result.rfqUpdates.line_items; // Full replacement from service logic
            if (result.rfqUpdates.commercial) newRfq.commercial = { ...newRfq.commercial, ...result.rfqUpdates.commercial };

            setRfq(newRfq);
            setChatHistory(prev => [...prev, { role: 'ai', text: result.responseText }]);
            setAttachedFiles([]); // Clear files after processing

        } catch (error) {
            console.error(error);
            setChatHistory(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an error processing that request." }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRunRiskAnalysis = async () => {
        if (!rfq) return;
        setIsAnalyzingRisk(true);
        try {
            const risks = await analyzeRfqRisks(rfq, lang);
            setRfq({ ...rfq, risks });
        } finally {
            setIsAnalyzingRisk(false);
        }
    };

    const handleFindSuppliers = async () => {
        if (!rfq) return;
        setIsSourcing(true);
        try {
            const candidates = await findSuppliers(rfq, supplierFilters);
            setRfq({ ...rfq, invited_suppliers: candidates });
        } finally {
            setIsSourcing(false);
        }
    };

    const generateSupplierLink = (rfq: Rfq) => {
        // Remove sensitive internal data if needed, mostly clean
        const shareableRfq = JSON.stringify(rfq);
        const compressed = LZString.compressToEncodedURIComponent(shareableRfq);
        const url = `${window.location.origin}${window.location.pathname}?mode=supplier&data=${compressed}`;
        navigator.clipboard.writeText(url);
        alert(t(lang, 'link_copied'));
    };

    if (!rfq) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto text-center px-4">
                <div className="w-16 h-16 bg-brandOrange/10 rounded-2xl flex items-center justify-center mb-6 text-brandOrange animate-bounce">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{t(lang, 'drafting_assistant')}</h2>
                <p className="text-slate-500 mb-8">{t(lang, 'initial_greeting')}</p>
                
                <div className="w-full relative">
                    <textarea 
                        className="w-full rounded-2xl border border-slate-200 p-4 pr-12 shadow-sm focus:ring-2 focus:ring-brandOrange/50 focus:border-brandOrange outline-none resize-none min-h-[120px]"
                        placeholder={t(lang, 'chat_placeholder')}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleChatSubmit();
                            }
                        }}
                    />
                    <div className="absolute bottom-3 right-3 flex gap-2">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 rounded-lg text-slate-400 hover:text-brandOrange hover:bg-orange-50 transition"
                            title={t(lang, 'upload_file')}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        </button>
                        <button 
                            onClick={handleChatSubmit}
                            disabled={isProcessing}
                            className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                        </button>
                    </div>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.xlsx,.csv,.jpg,.png" />
                </div>
                {attachedFiles.length > 0 && (
                    <div className="mt-4 flex gap-2">
                        {attachedFiles.map((f, i) => (
                            <span key={i} className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{f.name}</span>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6">
            
            {/* LEFT SIDEBAR: CHAT & HISTORY */}
            {showSidebar && (
                <div className="w-80 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden shrink-0">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 text-sm">{t(lang, 'action_chat_title')}</h3>
                        <button onClick={() => setRfq(null)} className="text-xs text-slate-400 hover:text-red-500">New</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-br-none' : 'bg-slate-100 text-slate-700 rounded-bl-none'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="flex justify-start">
                                <div className="bg-slate-100 rounded-2xl rounded-bl-none px-3 py-2 flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-white">
                        <div className="relative">
                            <input 
                                className="w-full rounded-xl border border-slate-200 pl-3 pr-10 py-2 text-sm focus:border-brandOrange outline-none"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                placeholder="Edit / Add Items..."
                                onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                            />
                            <button 
                                onClick={handleChatSubmit}
                                disabled={isProcessing}
                                className="absolute right-2 top-2 text-slate-400 hover:text-brandOrange"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                
                {/* TABS HEADER */}
                <div className="h-14 border-b border-slate-100 flex items-center px-6 gap-6 bg-slate-50">
                    <button 
                        onClick={() => setActiveTab('DRAFT')}
                        className={`text-sm font-bold h-full border-b-2 px-1 transition-colors ${activeTab === 'DRAFT' ? 'border-brandOrange text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        {t(lang, 'step1_short')}
                    </button>
                    <button 
                        onClick={() => { setActiveTab('RISK'); handleRunRiskAnalysis(); }}
                        className={`text-sm font-bold h-full border-b-2 px-1 transition-colors ${activeTab === 'RISK' ? 'border-brandOrange text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        {t(lang, 'step2_short')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('SOURCE')}
                        className={`text-sm font-bold h-full border-b-2 px-1 transition-colors ${activeTab === 'SOURCE' ? 'border-brandOrange text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        Find Suppliers
                    </button>
                    <button 
                        onClick={() => setActiveTab('COMPARE')}
                        className={`text-sm font-bold h-full border-b-2 px-1 transition-colors ${activeTab === 'COMPARE' ? 'border-brandOrange text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        {t(lang, 'step3_short')}
                    </button>

                    <div className="ml-auto flex items-center gap-2">
                         <div className="text-xs text-slate-500 mr-2">{rfq.project_name}</div>
                         <button onClick={() => setShowSidebar(!showSidebar)} className="text-slate-400 hover:text-slate-600">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showSidebar ? "M4 6h16M4 12h16M4 18h16" : "M4 6h16M4 12h16M4 18h16"} /></svg>
                         </button>
                    </div>
                </div>

                {/* TAB CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    
                    {/* --- DRAFT TAB --- */}
                    {activeTab === 'DRAFT' && (
                        <div>
                             <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3">#</th>
                                            <th className="px-4 py-3">{t(lang, 'description')}</th>
                                            <th className="px-4 py-3">{t(lang, 'size')}</th>
                                            <th className="px-4 py-3">{t(lang, 'grade')}</th>
                                            <th className="px-4 py-3 text-right">{t(lang, 'qty')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rfq.line_items.map(item => (
                                            <tr key={item.item_id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-mono text-xs text-slate-400">{item.line}</td>
                                                <td className="px-4 py-3 font-medium text-slate-900">{item.description}</td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    {item.size.outer_diameter.value ? `${item.size.outer_diameter.value}"` : '-'} 
                                                    {item.size.wall_thickness.value ? ` x ${item.size.wall_thickness.value}` : ''}
                                                </td>
                                                <td className="px-4 py-3 text-blue-600 font-medium">{item.material_grade}</td>
                                                <td className="px-4 py-3 text-right font-bold">{item.quantity} {item.uom}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                             
                             <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">{t(lang, 'commercial_terms')}</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between"><span className="text-slate-500">{t(lang, 'destination')}</span> <span className="font-bold">{rfq.commercial.destination || "TBD"}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">{t(lang, 'incoterm')}</span> <span className="font-bold">{rfq.commercial.incoterm || "TBD"}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">{t(lang, 'payment')}</span> <span className="font-bold">{rfq.commercial.paymentTerm || "TBD"}</span></div>
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}

                    {/* --- RISK TAB --- */}
                    {activeTab === 'RISK' && (
                        <div className="space-y-4">
                             {isAnalyzingRisk && <div className="text-center text-slate-500 py-8 animate-pulse">{t(lang, 'audit_running')}</div>}
                             
                             {!isAnalyzingRisk && rfq.risks && rfq.risks.map((risk, i) => (
                                 <div key={i} className={`p-4 rounded-xl border flex gap-4 ${risk.impact_level === 'High' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                                     <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${risk.impact_level === 'High' ? 'bg-red-200 text-red-700' : 'bg-amber-200 text-amber-700'}`}>
                                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                     </div>
                                     <div>
                                         <div className="flex gap-2 items-center mb-1">
                                             <span className="text-xs font-bold uppercase tracking-wide opacity-70">{risk.category} Risk</span>
                                             <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${risk.impact_level === 'High' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'}`}>{risk.impact_level} Impact</span>
                                         </div>
                                         <h4 className="font-bold text-slate-900">{risk.risk}</h4>
                                         <p className="text-sm text-slate-600 mt-1">{risk.recommendation}</p>
                                     </div>
                                 </div>
                             ))}
                             {!isAnalyzingRisk && (!rfq.risks || rfq.risks.length === 0) && (
                                 <div className="text-center py-12 text-slate-400">
                                     <div className="text-4xl mb-2">✅</div>
                                     <div>{t(lang, 'audit_clean')}</div>
                                 </div>
                             )}
                        </div>
                    )}

                    {/* --- SOURCE TAB --- */}
                    {activeTab === 'SOURCE' && (
                        <div>
                             <div className="flex gap-4 mb-6">
                                 <button onClick={handleFindSuppliers} disabled={isSourcing} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-800 transition disabled:opacity-50">
                                     {isSourcing ? "Searching..." : "Auto-Source Suppliers"}
                                 </button>
                                 <button onClick={() => generateSupplierLink(rfq)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold hover:bg-slate-50 transition">
                                     {t(lang, 'share_link')}
                                 </button>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {rfq.invited_suppliers?.map(sup => (
                                     <div key={sup.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition">
                                         <div className="flex justify-between items-start mb-2">
                                             <h4 className="font-bold text-slate-900">{sup.name}</h4>
                                             {sup.match_reason && <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded font-bold uppercase">{sup.match_reason}</span>}
                                         </div>
                                         <div className="text-xs text-slate-500 mb-3">{sup.location} • {sup.website}</div>
                                         <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded italic">"{sup.rationale}"</p>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    )}

                    {/* --- COMPARE TAB (DASHBOARD) --- */}
                    {activeTab === 'COMPARE' && (
                        <div className="space-y-8">
                             {/* TOP DASHBOARD METRICS */}
                             {quotes.length > 0 ? (
                                <div className="space-y-4 mb-6 animate-in slide-in-from-top-2">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t(lang, 'best_offer')}</div>
                                            <div className="text-lg font-bold text-green-600 flex items-center gap-2">
                                                {quotes.find(q => q.id === getBestPriceId())?.currency} {quotes.find(q => q.id === getBestPriceId())?.total.toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Average Bid</div>
                                            <div className="text-lg font-bold text-slate-700">
                                                {(quotes.reduce((acc, curr) => acc + curr.total, 0) / quotes.length).toLocaleString(undefined, {maximumFractionDigits: 0})}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t(lang, 'fastest_delivery')}</div>
                                            <div className="text-lg font-bold text-blue-600">
                                                {quotes.find(q => q.id === getFastestLeadTimeId())?.leadTime} Days
                                            </div>
                                        </div>
                                        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Response Rate</div>
                                            <div className="text-lg font-bold text-slate-700">
                                                {quotes.length} / {Math.max(quotes.length, (rfq.invited_suppliers?.length || 1))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Recommendation Banner */}
                                    <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                                            <svg className="w-5 h-5 text-brandOrange" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">AI Insight</div>
                                            <div className="text-sm font-medium leading-tight">{getRecommendation()}</div>
                                        </div>
                                    </div>
                                    
                                    {/* Quote Table */}
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-3">Supplier</th>
                                                    <th className="px-4 py-3">Total Price</th>
                                                    <th className="px-4 py-3">Lead Time</th>
                                                    <th className="px-4 py-3">Validity</th>
                                                    <th className="px-4 py-3">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {quotes.map(q => (
                                                    <tr key={q.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-bold text-slate-900">{q.supplierName}</td>
                                                        <td className="px-4 py-3 text-green-700 font-mono font-bold">{q.currency} {q.total.toLocaleString()}</td>
                                                        <td className="px-4 py-3">{q.leadTime} Days</td>
                                                        <td className="px-4 py-3">{q.validity}</td>
                                                        <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold uppercase">Received</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                </div>
                             ) : (
                                 <div className="text-center py-16 text-slate-400">
                                     <div className="text-4xl mb-4">📭</div>
                                     <p>No quotes received yet.</p>
                                     <p className="text-sm mt-2">Share the supplier link to start receiving bids.</p>
                                 </div>
                             )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}