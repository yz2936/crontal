
import React, { useState } from 'react';
import { Rfq, ChatMessage, FileAttachment, Language, Quote } from '../types';
import { parseRequest } from '../services/geminiService';
import { t } from '../utils/i18n';

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
                if (!result) {
                    reject(new Error("Failed to read file"));
                    return;
                }
                const base64String = result.split(',')[1];
                resolve({
                    name: file.name,
                    mimeType: file.type,
                    data: base64String,
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleSend = async () => {
        if ((!inputText.trim() && attachedFiles.length === 0) || isProcessing) return;
        
        let displayContent = inputText;
        if (attachedFiles.length > 0) {
            const fileNames = attachedFiles.map(f => f.name).join(', ');
            displayContent = displayContent.trim()
                ? `${displayContent}\n\n[Files Attached: ${fileNames}]`
                : `[Files Attached: ${fileNames}]`;
        }

        const userMessage: ChatMessage = { role: 'user', content: displayContent };
        setChatHistory(prev => [...prev, userMessage]);
        
        const currentInput = inputText;
        const currentFiles = [...attachedFiles];
        
        setInputText(''); 
        setAttachedFiles([]);
        setIsProcessing(true);

        try {
            const processedFiles: FileAttachment[] = [];
            for (const file of currentFiles) {
                processedFiles.push(await fileToGenerativePart(file));
            }

            const currentItems = rfq ? rfq.line_items : [];
            const projectName = rfq ? rfq.project_name : null;

            const result = await parseRequest(currentInput, projectName, processedFiles, lang, currentItems);
            
            if (rfq) {
                const updatedRfq: Rfq = {
                    ...rfq,
                    project_name: result.rfqUpdates.project_name || rfq.project_name,
                    line_items: result.rfqUpdates.line_items && result.rfqUpdates.line_items.length > 0 
                        ? result.rfqUpdates.line_items 
                        : rfq.line_items,
                    commercial: {
                        ...rfq.commercial,
                        ...(result.rfqUpdates.commercial || {}),
                    }
                };
                setRfq(updatedRfq);
            } else {
                const newRfq: Rfq = {
                    id: `RFQ-${Date.now()}`,
                    project_name: result.rfqUpdates.project_name || "New Industrial Request",
                    status: 'draft',
                    line_items: result.rfqUpdates.line_items || [],
                    original_text: currentInput,
                    created_at: Date.now(),
                    commercial: {
                        destination: result.rfqUpdates.commercial?.destination || "",
                        incoterm: result.rfqUpdates.commercial?.incoterm || "",
                        paymentTerm: result.rfqUpdates.commercial?.paymentTerm || "",
                        otherRequirements: result.rfqUpdates.commercial?.otherRequirements || "",
                        req_mtr: false,
                        req_avl: false,
                        req_tpi: false,
                        warranty_months: 12
                    }
                };
                setRfq(newRfq);
            }
            
            setIsHeaderInfoOpen(true); 
            setChatHistory(prev => [...prev, { 
                role: 'assistant', 
                content: result.responseText 
            }]);

        } catch (error: any) {
            console.error("BuyerView Error:", error);
            setChatHistory(prev => [...prev, { 
                role: 'assistant', 
                content: t(lang, 'analyzing_error') 
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col h-[75vh] bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center shrink-0">
                <h3 className="text-white font-bold text-sm tracking-tight">{t(lang, 'drafting_assistant')}</h3>
                <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">AI Agent Active</span>
                </div>
            </div>

            {/* Chat Display Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                {chatHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                             <span className="text-3xl">🤖</span>
                        </div>
                        <p className="text-sm text-slate-500 max-w-sm italic leading-relaxed">
                            {t(lang, 'initial_greeting')}
                        </p>
                    </div>
                )}
                {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                            msg.role === 'user' 
                                ? 'bg-slate-900 text-white shadow-lg' 
                                : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                        }`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Input & Upload Controls */}
            <div className="p-4 border-t border-slate-100 bg-white">
                {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-slate-50">
                        {attachedFiles.map((f, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-[10px] font-bold border border-slate-200">
                                <span className="truncate max-w-[120px]">{f.name}</span>
                                <button onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700 transition">×</button>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="flex gap-2">
                    <button 
                        onClick={() => document.getElementById('file-upload-buyerview')?.click()}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition shadow-sm"
                        title={t(lang, 'upload_file')}
                        disabled={isProcessing}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    </button>
                    <input 
                        id="file-upload-buyerview"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files) {
                                setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                            }
                        }}
                        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
                    />
                    <textarea 
                        rows={1}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={t(lang, 'chat_placeholder')}
                        className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none text-sm resize-none bg-slate-50 transition-all placeholder:text-slate-400"
                        disabled={isProcessing}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={isProcessing || (!inputText.trim() && attachedFiles.length === 0)}
                        className="px-8 py-3 rounded-2xl bg-accent text-white font-bold hover:bg-accent/90 transition shadow-xl shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isProcessing ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                <span>{t(lang, 'send')}</span>
                            </>
                        )}
                    </button>
                </div>

                {isHeaderInfoOpen && rfq && (
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex justify-between items-center animate-in slide-in-from-top-2">
                        <div>
                            <p className="text-[10px] text-emerald-700 font-black uppercase tracking-widest">{t(lang, 'project_info')}</p>
                            <p className="text-sm text-emerald-900 font-bold mt-1">{rfq.project_name}</p>
                        </div>
                        <button onClick={() => setIsHeaderInfoOpen(false)} className="text-emerald-400 hover:text-emerald-600 transition">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
