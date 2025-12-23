import React, { useState } from 'react';
import { Rfq, ChatMessage, FileAttachment, Language, Quote } from '../types.ts';
import { parseRequest } from '../services/geminiService.ts';
import { t } from '../utils/i18n.ts';

interface BuyerViewProps {
    rfq: Rfq | null;
    setRfq: (rfq: Rfq | null) => void;
    quotes: Quote[];
    lang: Language;
}

export default function BuyerView({ rfq, setRfq, lang }: BuyerViewProps) {
    const [inputText, setInputText] = useState('');
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isHeaderInfoOpen, setIsHeaderInfoOpen] = useState(false);

    const fileToGenerativePart = (file: File): Promise<FileAttachment> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                if (!result) return reject(new Error("Empty file"));
                const base64String = result.split(',')[1];
                resolve({ name: file.name, mimeType: file.type, data: base64String });
            };
            reader.readAsDataURL(file);
        });
    };

    const handleSend = async () => {
        if ((!inputText.trim() && attachedFiles.length === 0) || isProcessing) return;
        
        let displayContent = inputText;
        if (attachedFiles.length > 0) {
            const fileNames = attachedFiles.map(f => f.name).join(', ');
            displayContent += `\n\n[Attached: ${fileNames}]`;
        }

        setChatHistory(prev => [...prev, { role: 'user', content: displayContent }]);
        setIsProcessing(true);

        try {
            const processedFiles = await Promise.all(attachedFiles.map(fileToGenerativePart));
            const currentItems = rfq ? rfq.line_items : [];
            const result = await parseRequest(inputText, rfq?.project_name || null, processedFiles, lang, currentItems);
            
            if (rfq) {
                setRfq({
                    ...rfq,
                    project_name: result.rfqUpdates.project_name || rfq.project_name,
                    line_items: result.rfqUpdates.line_items?.length ? result.rfqUpdates.line_items : rfq.line_items,
                    commercial: { ...rfq.commercial, ...(result.rfqUpdates.commercial || {}) }
                });
            } else {
                setRfq({
                    id: `RFQ-${Date.now()}`,
                    project_name: result.rfqUpdates.project_name || "New Industrial RFP",
                    status: 'draft',
                    line_items: result.rfqUpdates.line_items || [],
                    original_text: inputText,
                    created_at: Date.now(),
                    commercial: result.rfqUpdates.commercial || {
                        destination: "", incoterm: "", paymentTerm: "", otherRequirements: "",
                        req_mtr: false, req_avl: false, req_tpi: false, warranty_months: 12
                    }
                });
            }
            
            setChatHistory(prev => [...prev, { role: 'assistant', content: result.responseText }]);
            setIsHeaderInfoOpen(true);
            setInputText('');
            setAttachedFiles([]);
        } catch (error) {
            console.error(error);
            setChatHistory(prev => [...prev, { role: 'assistant', content: t(lang, 'analyzing_error') }]);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-[75vh] bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl">
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center shrink-0">
                <h3 className="text-white font-bold text-sm tracking-tight">{t(lang, 'drafting_assistant')}</h3>
                <div className="flex gap-2 items-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">AI Core v3</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                {chatHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 text-3xl">🤖</div>
                        <p className="text-sm text-slate-500 max-w-sm italic leading-relaxed">{t(lang, 'initial_greeting')}</p>
                    </div>
                )}
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white">
                {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {attachedFiles.map((f, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-full text-[10px] font-bold text-slate-600 border border-slate-200">
                                <span className="truncate max-w-[120px]">{f.name}</span>
                                <button onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700">×</button>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => document.getElementById('file-upload-buyerview')?.click()}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 hover:bg-slate-100 transition shadow-sm"
                        disabled={isProcessing}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    </button>
                    <input id="file-upload-buyerview" type="file" multiple className="hidden" onChange={(e) => e.target.files && setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)])} />
                    <textarea 
                        rows={1}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                        placeholder={t(lang, 'chat_placeholder')}
                        className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-brandOrange/20 focus:border-brandOrange outline-none text-sm resize-none bg-slate-50"
                        disabled={isProcessing}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isProcessing || (!inputText.trim() && attachedFiles.length === 0)}
                        className="px-8 py-3 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition shadow-xl disabled:opacity-50 flex items-center gap-2"
                    >
                        {isProcessing ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : t(lang, 'send')}
                    </button>
                </div>

                {isHeaderInfoOpen && rfq && (
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex justify-between items-center animate-in slide-in-from-top-2">
                        <div>
                            <p className="text-[10px] text-emerald-700 font-black uppercase tracking-widest">{t(lang, 'project_info')}</p>
                            <p className="text-sm text-emerald-900 font-bold mt-1">{rfq.project_name}</p>
                        </div>
                        <button onClick={() => setIsHeaderInfoOpen(false)} className="text-emerald-400 hover:text-emerald-600">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}