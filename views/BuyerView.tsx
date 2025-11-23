import React, { useState, useRef, useEffect } from 'react';
import LZString from 'lz-string';
import { Rfq, Quote, ChatMessage, Language, LineItem, FileAttachment, Size } from '../types';
import { parseRequest, clarifyRequest } from '../services/geminiService';
import { Walkthrough } from '../components/Walkthrough';
import { t } from '../utils/i18n';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BuyerViewProps {
  rfq: Rfq | null;
  setRfq: (rfq: Rfq) => void;
  quotes: Quote[];
  lang: Language;
}

export default function BuyerView({ rfq, setRfq, quotes, lang }: BuyerViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  
  const [activeStep, setActiveStep] = useState(1);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'price' | 'leadTime'>('price');
  const [awardEmail, setAwardEmail] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length === 0 || (messages.length === 1 && messages[0].role === 'assistant')) {
        setMessages([{ role: 'assistant', content: t(lang, 'initial_greeting') }]);
    }
  }, [lang]);

  useEffect(() => {
    if (quotes.length > 0) setActiveStep(3);
    else if (rfq) setActiveStep(2);
    else setActiveStep(1);
  }, [rfq, quotes]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
      setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const fileToGenerativePart = (file: File): Promise<FileAttachment> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve({
                mimeType: file.type,
                data: base64String
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  const handleSend = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || isProcessing) return;
    
    const text = input.trim();
    const currentFiles = [...attachedFiles];
    
    setInput('');
    setAttachedFiles([]);
    
    const displayMessage = text || (currentFiles.length > 0 ? `[${t(lang, 'file_attached')}: ${currentFiles.map(f => f.name).join(', ')}]` : '');
    setMessages(prev => [...prev, { role: 'user', content: displayMessage }]);
    setIsProcessing(true);

    try {
        const attachments: FileAttachment[] = [];
        for (const file of currentFiles) {
            const attachment = await fileToGenerativePart(file);
            attachments.push(attachment);
        }

        let newRfq: Rfq;
        
        if (!rfq) {
            // New RFQ
            const partial = await parseRequest(text, null, attachments, lang, []);
            newRfq = {
                id: `RFQ-${Date.now().toString().slice(-4)}`,
                created_at: Date.now(),
                project_name: partial.project_name || "New Project",
                line_items: partial.line_items as LineItem[] || [],
                commercial: partial.commercial || { destination: '', incoterm: '', paymentTerm: '', otherRequirements: '' },
                original_text: text
            };
            setRfq(newRfq);
            setMessages(prev => [...prev, { role: 'assistant', content: t(lang, 'rfq_created_msg', { count: String(newRfq.line_items.length) }) }]);
        } else {
            // Update Existing RFQ
            const currentItems = rfq.line_items;
            const incremental = await parseRequest(text, rfq.project_name, attachments, lang, currentItems);
            
            const updatedRfq = { ...rfq };
            
            if (incremental.line_items) {
                 updatedRfq.line_items = incremental.line_items as LineItem[];
            }
            if (incremental.commercial?.destination) updatedRfq.commercial.destination = incremental.commercial.destination;
            if (incremental.commercial?.incoterm) updatedRfq.commercial.incoterm = incremental.commercial.incoterm;
            if (incremental.commercial?.paymentTerm) updatedRfq.commercial.paymentTerm = incremental.commercial.paymentTerm;

            setRfq(updatedRfq);
            
            const clarifyResponse = await clarifyRequest(updatedRfq, text, lang);
            setMessages(prev => [...prev, { role: 'assistant', content: clarifyResponse }]);
        }

    } catch (e) {
        console.error(e);
        setMessages(prev => [...prev, { role: 'assistant', content: t(lang, 'analyzing_error') }]);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleUpdateLineItem = (index: number, field: keyof LineItem, value: any) => {
      if (!rfq) return;
      const updatedItems = [...rfq.line_items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      setRfq({ ...rfq, line_items: updatedItems });
  };

  const handleDeleteItem = (index: number) => {
      if (!rfq) return;
      const updatedItems = rfq.line_items.filter((_, i) => i !== index);
      const reindexedItems = updatedItems.map((item, idx) => ({ ...item, line: idx + 1 }));
      setRfq({ ...rfq, line_items: reindexedItems });
  };

  const handleUpdateDimension = (index: number, dimType: keyof Size, field: 'value' | 'unit', value: any) => {
      if (!rfq) return;
      const updatedItems = [...rfq.line_items];
      const item = updatedItems[index];
      
      const newSize = { ...item.size, [dimType]: { ...item.size[dimType], [field]: value } };
      updatedItems[index] = { ...item, size: newSize };
      setRfq({ ...rfq, line_items: updatedItems });
  };

  const handleUpdateCommercial = (field: string, value: string) => {
      if (!rfq) return;
      setRfq({
          ...rfq,
          commercial: { ...rfq.commercial, [field]: value }
      });
  };

  const handleShareLink = () => {
    if (!rfq) return;
    
    // Compress the RFQ data to embed it in the URL
    // This allows sharing without a backend database
    const jsonStr = JSON.stringify(rfq);
    const compressed = LZString.compressToEncodedURIComponent(jsonStr);
    
    const url = new URL(window.location.href);
    url.searchParams.set('mode', 'supplier');
    url.searchParams.set('data', compressed);
    
    navigator.clipboard.writeText(url.toString());
    alert(t(lang, 'link_copied'));
  };

  const getSortedQuotes = () => {
      return [...quotes].sort((a, b) => {
          if (sortBy === 'price') return a.total - b.total;
          return parseInt(a.leadTime) - parseInt(b.leadTime);
      });
  };

  const handleGenerateAwardEmail = () => {
      if (!selectedQuoteId || !rfq) return;
      const quote = quotes.find(q => q.id === selectedQuoteId);
      if (!quote) return;

      const emailBody = `Subject: Award Notification - RFQ ${rfq.id} - ${rfq.project_name}

Dear ${quote.supplierName},

We are pleased to inform you that your quotation for RFQ ${rfq.id} has been accepted. 

Award Details:
- Total Value: ${quote.currency} ${quote.total.toLocaleString()}
- Lead Time: ${quote.leadTime} days
- Payment Terms: ${quote.payment}

Please proceed with the order confirmation.

Best regards,
[Your Name]`;
      setAwardEmail(emailBody);
  };

  const handleGeneratePdf = () => {
    if (!rfq) return;
    const doc = new jsPDF();
    
    let yPos = 20;
    
    doc.setFontSize(18);
    const title = selectedQuoteId ? "Award Letter" : "Request for Quotation";
    doc.text(title, 14, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`RFQ ID: ${rfq.id}`, 14, yPos); yPos += 6;
    doc.text(`Project: ${rfq.project_name || 'N/A'}`, 14, yPos); yPos += 6;
    
    if (selectedQuoteId) {
        const quote = quotes.find(q => q.id === selectedQuoteId);
        if (quote) {
            yPos += 6;
            doc.setFont("helvetica", "bold");
            doc.text("Awarded To:", 14, yPos); yPos += 6;
            doc.setFont("helvetica", "normal");
            doc.text(`${quote.supplierName}`, 14, yPos); yPos += 6;
            doc.text(`Total Value: ${quote.currency} ${quote.total.toLocaleString()}`, 14, yPos); yPos += 10;
        }
    }

    doc.text(`Destination: ${rfq.commercial.destination}`, 14, yPos); yPos += 6;
    doc.text(`Incoterm: ${rfq.commercial.incoterm}`, 14, yPos); yPos += 6;
    doc.text(`Payment Terms: ${rfq.commercial.paymentTerm}`, 14, yPos); yPos += 10;

    const tableData = rfq.line_items.map(item => [
        item.line,
        item.description,
        item.material_grade,
        item.quantity,
        item.uom,
        `${item.size.outer_diameter.value || ''}${item.size.outer_diameter.unit || ''} x ${item.size.wall_thickness.value || ''}${item.size.wall_thickness.unit || ''} x ${item.size.length.value || ''}${item.size.length.unit || ''}`
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [['Line', 'Desc', 'Grade', 'Qty', 'UOM', 'Size (OD x WT x L)']],
        body: tableData,
    });

    if (selectedQuoteId) {
        const finalY = (doc as any).lastAutoTable.finalY + 40;
        doc.text("_______________________", 14, finalY);
        doc.text("Buyer Signature", 14, finalY + 5);
        doc.text("_______________________", 120, finalY);
        doc.text("Supplier Signature", 120, finalY + 5);
    }

    doc.save(`RFQ-${rfq.id}${selectedQuoteId ? '-Award' : ''}.pdf`);
  };

  const steps = [
      { selector: '#chat-box', text: t(lang, 'step1') },
      { selector: '#rfq-table', text: t(lang, 'step2') },
      { selector: '#quote-comparison', text: t(lang, 'step3') }
  ];

  return (
    <div className="space-y-6 relative">
      <Walkthrough steps={steps} isActive={isTourActive} onClose={() => setIsTourActive(false)} lang={lang} />
      
      {/* Progress Stepper */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium transition-all shadow-sm ${
                    activeStep === step 
                    ? 'bg-white border-accent text-accent ring-2 ring-accent/10' 
                    : activeStep > step 
                        ? 'bg-slate-50 border-slate-200 text-slate-500' 
                        : 'bg-white border-slate-100 text-slate-300'
                }`}>
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${activeStep === step ? 'bg-accent text-white' : activeStep > step ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {activeStep > step ? '✓' : step}
                    </span>
                    <span>{t(lang, `step${step}` as any)}</span>
                </div>
                {step < 3 && <div className={`w-8 h-[2px] mx-2 rounded-full ${activeStep > step ? 'bg-green-500' : 'bg-slate-200'}`} />}
            </div>
        ))}
      </div>

      <div className="grid md:grid-cols-12 gap-6 items-start">
        {/* Left Col: Chat (4 cols) - Sticky */}
        <div className="md:col-span-4 flex flex-col md:sticky md:top-4 md:h-[calc(100vh-2rem)] h-[500px]">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden flex flex-col h-full" id="chat-box">
                <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{t(lang, 'drafting_assistant')}</span>
                    </div>
                    <button onClick={() => setIsTourActive(true)} className="text-[10px] text-accent hover:text-accent/80 font-medium px-2 py-1 bg-accent/5 rounded-md transition">{t(lang, 'guide_me')}</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/30">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] relative group ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                                    m.role === 'user' 
                                    ? 'bg-slate-900 text-white rounded-br-sm' 
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                                }`}>
                                    {m.content}
                                </div>
                                <span className="text-[10px] text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity px-1">
                                    {m.role === 'user' ? 'You' : 'Crontal AI'}
                                </span>
                            </div>
                        </div>
                    ))}
                    {isProcessing && (
                        <div className="flex justify-start">
                             <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-medium">{t(lang, 'analyzing_files')}</span>
                                <div className="flex space-x-1">
                                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce delay-75"></div>
                                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce delay-150"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
                
                {attachedFiles.length > 0 && (
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2">
                        {attachedFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-1 bg-white text-slate-600 text-[10px] font-medium px-2 py-1 rounded border border-slate-200 shadow-sm">
                                <span className="truncate max-w-[120px]">{file.name}</span>
                                <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500 ml-1">×</button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="p-3 bg-white border-t border-slate-100">
                    <div className="flex gap-2 relative">
                        <input 
                            type="file" 
                            multiple 
                            ref={fileInputRef} 
                            onChange={handleFileSelect} 
                            className="hidden" 
                            accept="image/*,application/pdf"
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="text-slate-400 hover:text-accent hover:bg-accent/5 p-2 rounded-xl transition"
                            title={t(lang, 'upload_file')}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        </button>
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={t(lang, 'chat_placeholder')}
                            className="flex-1 bg-slate-50 rounded-xl border-0 px-4 py-2 text-sm focus:ring-2 focus:ring-accent/20 focus:bg-white transition placeholder-slate-400"
                        />
                        <button 
                            onClick={handleSend}
                            disabled={isProcessing || (!input && attachedFiles.length === 0)}
                            className="bg-accent hover:bg-accent/90 text-white rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-accent/20"
                        >
                            {t(lang, 'send')}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Col: RFQ Data (8 cols) - Scrollable with Window */}
        <div className="md:col-span-8 flex flex-col">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center" id="action-bar">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{t(lang, 'live_preview')}</span>
                        {rfq && <span className="ml-2 text-[10px] text-slate-400 font-mono">#{rfq.id}</span>}
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleGeneratePdf}
                            disabled={!rfq}
                            className="group flex items-center gap-1.5 text-[10px] font-medium bg-white border border-slate-200 hover:border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                            <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            {selectedQuoteId ? t(lang, 'download_award_pdf') : t(lang, 'download_pdf')}
                        </button>
                        <button 
                            onClick={handleShareLink}
                            disabled={!rfq}
                            className="group flex items-center gap-1.5 text-[10px] bg-slate-900 text-white font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition disabled:opacity-50 shadow-md shadow-slate-200"
                        >
                            <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                            {t(lang, 'share_link')}
                        </button>
                    </div>
                </div>
                
                <div className="p-6 space-y-8" id="rfq-table">
                    {!rfq ? (
                        <div className="h-[400px] flex flex-col items-center justify-center text-slate-300 gap-4">
                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                                <svg className="w-8 h-8 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <p className="text-sm font-medium">{t(lang, 'no_rfq')}</p>
                        </div>
                    ) : (
                        <>
                            {/* Editable Commercial Terms */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                                <div className="group">
                                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">{t(lang, 'destination')}</span>
                                    <input 
                                        value={rfq.commercial.destination || ''}
                                        onChange={(e) => handleUpdateCommercial('destination', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 hover:border-slate-300 focus:border-accent focus:ring-1 focus:ring-accent focus:bg-white transition outline-none font-medium"
                                        placeholder={t(lang, 'tbd')}
                                    />
                                </div>
                                <div className="group">
                                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">{t(lang, 'incoterm')}</span>
                                    <input 
                                        value={rfq.commercial.incoterm || ''}
                                        onChange={(e) => handleUpdateCommercial('incoterm', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 hover:border-slate-300 focus:border-accent focus:ring-1 focus:ring-accent focus:bg-white transition outline-none font-medium"
                                        placeholder={t(lang, 'tbd')}
                                    />
                                </div>
                                <div className="group">
                                    <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">{t(lang, 'payment')}</span>
                                    <input 
                                        value={rfq.commercial.paymentTerm || ''}
                                        onChange={(e) => handleUpdateCommercial('paymentTerm', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 hover:border-slate-300 focus:border-accent focus:ring-1 focus:ring-accent focus:bg-white transition outline-none font-medium"
                                        placeholder={t(lang, 'tbd')}
                                    />
                                </div>
                            </div>

                            {/* Editable Items Table */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="text-[10px] font-medium text-slate-500 p-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                    <span>{t(lang, 'edit_mode_hint')}</span>
                                </div>
                                <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left whitespace-nowrap">
                                    <thead className="bg-white text-slate-500 font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 w-10 text-center bg-slate-50/50">{t(lang, 'line')}</th>
                                            <th className="px-4 py-3">{t(lang, 'desc')}</th>
                                            <th className="px-4 py-3">{t(lang, 'grade')}</th>
                                            <th className="px-4 py-3 bg-slate-50/30 border-x border-slate-100 text-center" colSpan={2}>{t(lang, 'od')}</th>
                                            <th className="px-4 py-3 bg-slate-50/30 border-r border-slate-100 text-center" colSpan={2}>{t(lang, 'wt')}</th>
                                            <th className="px-4 py-3 bg-slate-50/30 border-r border-slate-100 text-center" colSpan={2}>{t(lang, 'length')}</th>
                                            <th className="px-4 py-3 text-right w-20">{t(lang, 'qty')}</th>
                                            <th className="px-4 py-3 text-center w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {rfq.line_items.map((item, index) => (
                                            <tr key={item.item_id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-4 py-2.5 text-center text-slate-400 bg-slate-50/30 border-r border-slate-50 font-mono text-[10px]">{item.line}</td>
                                                <td className="px-4 py-2.5">
                                                    <input 
                                                        value={item.description} 
                                                        onChange={(e) => handleUpdateLineItem(index, 'description', e.target.value)}
                                                        className="w-24 md:w-full bg-transparent border border-transparent rounded px-1.5 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none font-medium text-slate-700 transition-all"
                                                    />
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <input 
                                                        value={item.material_grade || ''} 
                                                        onChange={(e) => handleUpdateLineItem(index, 'material_grade', e.target.value)}
                                                        className="w-16 bg-transparent border border-transparent rounded px-1.5 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none text-slate-600 transition-all"
                                                    />
                                                </td>
                                                {/* OD */}
                                                <td className="px-1 py-2.5 text-right border-l border-slate-50">
                                                    <input 
                                                        type="number"
                                                        value={item.size.outer_diameter.value || ''}
                                                        onChange={(e) => handleUpdateDimension(index, 'outer_diameter', 'value', Number(e.target.value))}
                                                        className="w-12 text-right bg-transparent border border-transparent rounded px-1 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none text-slate-700 font-mono transition-all"
                                                    />
                                                </td>
                                                <td className="px-1 py-2.5 border-r border-slate-50">
                                                    <input 
                                                        value={item.size.outer_diameter.unit || ''}
                                                        onChange={(e) => handleUpdateDimension(index, 'outer_diameter', 'unit', e.target.value)}
                                                        className="w-8 text-slate-400 text-[10px] bg-transparent focus:outline-none pl-1"
                                                    />
                                                </td>
                                                 {/* WT */}
                                                 <td className="px-1 py-2.5 text-right">
                                                    <input 
                                                        type="number"
                                                        value={item.size.wall_thickness.value || ''}
                                                        onChange={(e) => handleUpdateDimension(index, 'wall_thickness', 'value', Number(e.target.value))}
                                                        className="w-12 text-right bg-transparent border border-transparent rounded px-1 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none text-slate-700 font-mono transition-all"
                                                    />
                                                </td>
                                                <td className="px-1 py-2.5 border-r border-slate-50">
                                                    <input 
                                                        value={item.size.wall_thickness.unit || ''}
                                                        onChange={(e) => handleUpdateDimension(index, 'wall_thickness', 'unit', e.target.value)}
                                                        className="w-8 text-slate-400 text-[10px] bg-transparent focus:outline-none pl-1"
                                                    />
                                                </td>
                                                 {/* Length */}
                                                 <td className="px-1 py-2.5 text-right">
                                                    <input 
                                                        type="number"
                                                        value={item.size.length.value || ''}
                                                        onChange={(e) => handleUpdateDimension(index, 'length', 'value', Number(e.target.value))}
                                                        className="w-12 text-right bg-transparent border border-transparent rounded px-1 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none text-slate-700 font-mono transition-all"
                                                    />
                                                </td>
                                                <td className="px-1 py-2.5 border-r border-slate-50">
                                                    <input 
                                                        value={item.size.length.unit || ''}
                                                        onChange={(e) => handleUpdateDimension(index, 'length', 'unit', e.target.value)}
                                                        className="w-8 text-slate-400 text-[10px] bg-transparent focus:outline-none pl-1"
                                                    />
                                                </td>

                                                <td className="px-4 py-2.5 text-right">
                                                    <div className="flex justify-end items-center gap-1">
                                                        <input 
                                                            type="number"
                                                            value={item.quantity || 0} 
                                                            onChange={(e) => handleUpdateLineItem(index, 'quantity', Number(e.target.value))}
                                                            className="w-12 text-right bg-transparent border border-transparent rounded px-1 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none text-slate-700 font-bold transition-all"
                                                        />
                                                        <input 
                                                            value={item.uom || ''} 
                                                            onChange={(e) => handleUpdateLineItem(index, 'uom', e.target.value)}
                                                            className="w-8 text-left bg-transparent border border-transparent rounded px-1 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none text-slate-400 text-[10px] transition-all"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <button 
                                                        onClick={() => handleDeleteItem(index)}
                                                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                        title={t(lang, 'delete_item')}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            </div>

                            {/* Comparison Section */}
                            {quotes.length > 0 && (
                                <div id="quote-comparison" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2">
                                     <div className="flex justify-between items-center px-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">{t(lang, 'received_quotes')}</h3>
                                            <span className="bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{quotes.length}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] bg-slate-100 p-1 rounded-lg">
                                            <span className="text-slate-500 px-2 font-medium">{t(lang, 'sort_by')}</span>
                                            <button onClick={() => setSortBy('price')} className={`px-2 py-1 rounded-md transition-all font-medium ${sortBy === 'price' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{t(lang, 'price')}</button>
                                            <button onClick={() => setSortBy('leadTime')} className={`px-2 py-1 rounded-md transition-all font-medium ${sortBy === 'leadTime' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{t(lang, 'delivery')}</button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {getSortedQuotes().map((q, idx) => (
                                            <div 
                                                key={q.id} 
                                                onClick={() => setSelectedQuoteId(q.id)}
                                                className={`relative p-5 border rounded-xl flex flex-col gap-3 cursor-pointer transition-all group ${
                                                    selectedQuoteId === q.id 
                                                    ? 'border-accent bg-accent/5 ring-1 ring-accent shadow-md' 
                                                    : 'border-slate-200 bg-white hover:border-accent/40 hover:shadow-lg'
                                                }`}
                                            >
                                                {idx === 0 && sortBy === 'price' && (
                                                    <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold uppercase tracking-wide rounded-full shadow-sm">
                                                        {t(lang, 'best_offer')}
                                                    </div>
                                                )}
                                                
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedQuoteId === q.id ? 'border-accent bg-accent' : 'border-slate-300 group-hover:border-accent/50'}`}>
                                                            {selectedQuoteId === q.id && <div className="w-2 h-2 bg-white rounded-full"/>}
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-slate-900 text-sm block">{q.supplierName}</span>
                                                            <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">Valid: {q.validity} days</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-bold text-slate-900 text-lg block">{q.currency} {q.total.toLocaleString()}</span>
                                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${parseInt(q.leadTime) < 15 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{q.leadTime} days</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="pt-3 border-t border-slate-100/50 flex justify-between items-end text-[10px] text-slate-500">
                                                    <div>
                                                        <span className="block font-medium text-slate-400 mb-0.5">Payment Terms</span>
                                                        <span>{q.payment}</span>
                                                    </div>
                                                    {q.notes && (
                                                        <div className="text-right max-w-[60%]">
                                                            <span className="block font-medium text-slate-400 mb-0.5">Notes</span>
                                                            <span className="truncate block">{q.notes}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {selectedQuoteId && (
                                        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4 animate-in fade-in zoom-in-95 shadow-2xl">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">{t(lang, 'select_to_award')}</h4>
                                                </div>
                                                <button 
                                                    onClick={handleGenerateAwardEmail}
                                                    className="text-[10px] bg-white text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-100 font-bold transition shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
                                                >
                                                    {t(lang, 'generate_award')}
                                                </button>
                                            </div>
                                            
                                            {awardEmail && (
                                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                    <div className="flex justify-between items-end">
                                                        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{t(lang, 'award_email_preview')}</label>
                                                        <button 
                                                            onClick={() => navigator.clipboard.writeText(awardEmail)}
                                                            className="text-[10px] text-accent hover:text-white transition"
                                                        >
                                                            {t(lang, 'copy_email')}
                                                        </button>
                                                    </div>
                                                    <textarea 
                                                        readOnly
                                                        value={awardEmail}
                                                        className="w-full h-40 text-xs p-4 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 focus:outline-none focus:border-slate-600 font-mono leading-relaxed"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}