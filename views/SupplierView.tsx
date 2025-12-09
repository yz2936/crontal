
import React, { useState, useEffect, useRef } from 'react';
import LZString from 'lz-string';
import { Rfq, Quote, Language, FileAttachment } from '../types';
import { t } from '../utils/i18n';
import { storageService } from '../services/storageService';

interface SupplierViewProps {
  rfq: Rfq | null;
  onSubmitQuote: (quote: Quote) => void;
  lang: Language;
  onExit: () => void;
}

export default function SupplierView({ rfq, onSubmitQuote, lang, onExit }: SupplierViewProps) {
  const [prices, setPrices] = useState<Record<number, number>>({});
  const [moqs, setMoqs] = useState<Record<number, number>>({});
  const [alternates, setAlternates] = useState<Record<number, string>>({});
  
  const [formData, setFormData] = useState({
      supplierName: '',
      currency: 'USD',
      leadTime: '',
      payment: '',
      validity: '',
      notes: ''
  });
  const [submittedLink, setSubmittedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [quoteHistory, setQuoteHistory] = useState<Quote[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      setQuoteHistory(storageService.getQuotes());
  }, []);

  // Standalone Page Layout Wrapper
  if (!rfq && viewMode === 'active') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center text-slate-400 gap-4">
              <p>{t(lang, 'no_active_rfq')}</p>
              <div className="flex gap-4">
                <button onClick={() => setViewMode('history')} className="text-accent hover:underline text-sm">{t(lang, 'nav_history')}</button>
                <button onClick={onExit} className="text-slate-500 hover:underline text-sm">{t(lang, 'return_to_buyer')}</button>
              </div>
          </div>
      );
  }

  const handlePriceChange = (line: number, val: string) => {
      setPrices(prev => ({ ...prev, [line]: parseFloat(val) || 0 }));
  };

  const handleMoqChange = (line: number, val: string) => {
      setMoqs(prev => ({ ...prev, [line]: parseInt(val) || 0 }));
  };

  const handleAltChange = (line: number, val: string) => {
      setAlternates(prev => ({ ...prev, [line]: val }));
  };

  const calculateTotal = () => {
      if (!rfq) return 0;
      let total = 0;
      rfq.line_items.forEach(item => {
          const price = prices[item.line] || 0;
          total += price * (item.quantity || 0);
      });
      return total;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        // Force update state with new files
        const newFiles = Array.from(e.target.files);
        setAttachedFiles(prev => [...prev, ...newFiles]);
    }
    // Reset input value to allow selecting same file again if needed
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
      setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const fileToGenerativePart = (file: File): Promise<FileAttachment> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Handle empty files or read errors
            if (!result || !result.includes(',')) {
                resolve({ name: file.name, mimeType: file.type, data: "" });
                return;
            }
            const base64String = result.split(',')[1];
            resolve({
                name: file.name,
                mimeType: file.type,
                data: base64String
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
      if (!rfq) return;

      setIsSending(true);

      // Process attachments
      const processedAttachments: FileAttachment[] = [];
      for (const file of attachedFiles) {
          try {
              const attachment = await fileToGenerativePart(file);
              processedAttachments.push(attachment);
          } catch (e) {
              console.error("File read error", e);
          }
      }

      // Ensure Unique ID for every submission to allow multiple quotes for same RFQ
      const uniqueId = `QT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const quote: Quote = {
          id: uniqueId,
          rfqId: rfq.id,
          projectName: rfq.project_name || "Untitled RFP",
          supplierName: formData.supplierName || "Unnamed Supplier",
          currency: formData.currency,
          total: calculateTotal(),
          leadTime: formData.leadTime,
          payment: formData.payment,
          validity: formData.validity,
          notes: formData.notes,
          attachments: processedAttachments,
          email: '',
          phone: '',
          timestamp: Date.now(),
          items: rfq.line_items.map(item => ({
              line: item.line,
              quantity: item.quantity,
              unitPrice: prices[item.line] || 0,
              lineTotal: (prices[item.line] || 0) * (item.quantity || 0),
              rfqDescription: item.description, // Store snapshot for history
              moq: moqs[item.line] || null,
              alternates: alternates[item.line] || ""
          }))
      };

      // 1. Save locally (Supplier's own record)
      const updatedHistory = storageService.saveQuote(quote);
      setQuoteHistory(updatedHistory);

      // 2. Broadcast to Buyer (Real-time Simulation - Local)
      storageService.broadcastNewQuote(quote);

      // 3. Generate Secure Link (Remote / Cloudflare)
      const jsonQuote = JSON.stringify(quote);
      const compressed = LZString.compressToEncodedURIComponent(jsonQuote);
      
      const urlObj = new URL(window.location.href);
      urlObj.search = ''; // Clear params
      urlObj.searchParams.set('mode', 'quote_response');
      urlObj.searchParams.set('data', compressed);
      const responseUrl = urlObj.toString();

      // Simulate network delay for realism
      setTimeout(() => {
          setIsSending(false);
          setSubmittedLink(responseUrl);
          onSubmitQuote(quote); // Optimistic UI update
      }, 800);
  };

  if (submittedLink) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
            <div className="bg-white max-w-lg w-full rounded-2xl p-8 shadow-xl text-center space-y-6 animate-in zoom-in-95">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{t(lang, 'quote_submitted_title')}</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                    {t(lang, 'quote_submitted_desc')}
                </p>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2 block">Secure Response Link</label>
                     <div className="bg-white border border-slate-200 rounded p-2 text-xs text-slate-500 break-all font-mono mb-3 max-h-24 overflow-y-auto">
                         {submittedLink}
                     </div>
                     <button 
                        onClick={() => {
                            navigator.clipboard.writeText(submittedLink);
                            setLinkCopied(true);
                            setTimeout(() => setLinkCopied(false), 2000);
                        }}
                        className={`w-full py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${linkCopied ? 'bg-green-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                     >
                         {linkCopied ? (
                             <>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                Copied!
                             </>
                         ) : (
                             t(lang, 'copy_response_link')
                         )}
                     </button>
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => { setSubmittedLink(null); setViewMode('history'); }}
                        className="text-slate-500 hover:text-slate-800 text-sm py-2 underline"
                    >
                        {t(lang, 'nav_history')}
                    </button>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen py-6 px-4 bg-slate-50/50 pb-24">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Sidebar */}
            <div className="md:w-64 flex-shrink-0 flex flex-col gap-4">
                 <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm sticky top-6">
                    <div className="flex items-center gap-3 mb-6">
                        <svg viewBox="0 0 40 40" fill="none" className="h-8 w-8 rounded-lg shadow-sm">
                            <rect width="40" height="40" rx="8" fill="#0B1121"/>
                            <path d="M12 20C12 15.5817 15.5817 12 20 12C22.25 12 24.28 12.93 25.76 14.43" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                            <path d="M12 20C12 24.4183 15.5817 28 20 28C22.25 28 24.28 27.07 25.76 25.57" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                            <path d="M22 20H32M32 20L28 16M32 20L28 24" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <div>
                            <h1 className="text-sm font-bold text-slate-900">Supplier Portal</h1>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <button 
                            onClick={() => setViewMode('active')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'active' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            {t(lang, 'nav_active')}
                        </button>
                        <button 
                            onClick={() => setViewMode('history')}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition ${viewMode === 'history' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            {t(lang, 'nav_history')}
                        </button>
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100">
                         <button 
                            onClick={onExit}
                            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-2"
                        >
                            ← {t(lang, 'return_to_buyer')}
                        </button>
                    </div>
                 </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
                {viewMode === 'history' ? (
                     <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900">{t(lang, 'nav_history')}</h2>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {quoteHistory.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">No history found on this device.</div>
                            ) : (
                                quoteHistory.map(q => (
                                    <div key={q.id} className="p-4 hover:bg-slate-50 flex justify-between items-center transition-colors">
                                        <div>
                                            <div className="font-medium text-slate-900">{q.projectName || "Untitled RFP"}</div>
                                            <div className="text-xs text-slate-500">Ref: {q.rfqId} • {new Date(q.timestamp).toLocaleDateString()}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-slate-900">{q.currency} {q.total.toLocaleString()}</div>
                                            <div className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block mt-1 font-bold">{t(lang, 'status_sent')}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                     </div>
                ) : (
                    // Active Quote View
                    rfq ? (
                    <div className="space-y-6">
                        {/* AI Summary Banner (If Exists) */}
                        {rfq.ai_summary && (
                            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 rounded-2xl border border-slate-700 relative overflow-hidden text-white shadow-lg">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8z" /></svg>
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">Executive Summary</div>
                                    </div>
                                    <p className="text-slate-100 text-sm font-medium leading-relaxed italic max-w-3xl">
                                        "{rfq.ai_summary}"
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-xl font-bold text-slate-900">{rfq.project_name}</h2>
                                            <span className="px-2 py-0.5 rounded text-blue-700 bg-blue-50 text-[10px] font-bold uppercase tracking-wide border border-blue-100">Open for Bid</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 font-mono">Ref: {rfq.id}</div>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {rfq.commercial.req_mtr && <span className="text-[10px] bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100 font-bold uppercase">MTR Required</span>}
                                            {rfq.commercial.req_avl && <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-100 font-bold uppercase">AVL Only</span>}
                                        </div>
                                    </div>
                                    <div className="text-right text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto">
                                        <div className="flex justify-between md:justify-end gap-4 mb-1">
                                            <span className="text-slate-400">Destination</span>
                                            <span className="font-bold">{rfq.commercial.destination || "Not Specified"}</span>
                                        </div>
                                        <div className="flex justify-between md:justify-end gap-4">
                                            <span className="text-slate-400">Incoterm</span>
                                            <span className="font-bold">{rfq.commercial.incoterm || "Not Specified"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wide border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 w-12 text-center">#</th>
                                            <th className="px-4 py-3 min-w-[200px]">{t(lang, 'description')}</th>
                                            <th className="px-4 py-3 w-32 text-center">{t(lang, 'size')}</th>
                                            <th className="px-4 py-3 text-right w-24">{t(lang, 'qty')}</th>
                                            <th className="px-4 py-3 w-24 bg-blue-50/50 text-blue-800">{t(lang, 'moq')}</th>
                                            <th className="px-4 py-3 w-32 bg-blue-50/50 text-blue-800">{t(lang, 'unit_price')}</th>
                                            <th className="px-4 py-3 w-40 bg-blue-50/50 text-blue-800">{t(lang, 'alternates')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rfq.line_items.map(item => (
                                            <tr key={item.item_id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-4 py-4 text-slate-400 font-mono text-xs text-center">{item.line}</td>
                                                <td className="px-4 py-4">
                                                    <div className="font-medium text-slate-900">{item.description}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{item.material_grade}</div>
                                                    {(item.tolerance || (item.test_reqs && item.test_reqs.length > 0)) && (
                                                        <div className="text-[10px] text-slate-500 mt-1 inline-block bg-slate-100 px-1.5 py-0.5 rounded">
                                                            {item.tolerance} {item.test_reqs?.join(', ')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-slate-600 text-xs text-center font-mono">
                                                    {item.size.outer_diameter.value ? `${item.size.outer_diameter.value}` : '-'} x 
                                                    {item.size.wall_thickness.value ? ` ${item.size.wall_thickness.value}` : ' -'}
                                                </td>
                                                <td className="px-4 py-4 text-right font-bold text-slate-700">{item.quantity} <span className="text-[10px] font-normal text-slate-400">{item.uom}</span></td>
                                                
                                                {/* Supplier Inputs */}
                                                <td className="px-2 py-3 bg-blue-50/10">
                                                    <input 
                                                        type="number" 
                                                        placeholder="-"
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                                                        onChange={(e) => handleMoqChange(item.line, e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-2 py-3 bg-blue-50/10">
                                                    <input 
                                                        type="number" 
                                                        placeholder="0.00"
                                                        className="w-full text-right bg-white border border-slate-200 rounded-lg px-2 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                                                        onChange={(e) => handlePriceChange(item.line, e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-2 py-3 bg-blue-50/10">
                                                    <textarea 
                                                        rows={1}
                                                        placeholder="..."
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm resize-none"
                                                        onChange={(e) => handleAltChange(item.line, e.target.value)}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Commercial Terms Card */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">{t(lang, 'commercial_terms')}</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-slate-500 mb-1 text-xs font-bold">{t(lang, 'supplier_name')}</label>
                                            <input 
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brandOrange/20 focus:border-brandOrange outline-none transition" 
                                                value={formData.supplierName}
                                                onChange={e => setFormData({...formData, supplierName: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-slate-500 mb-1 text-xs font-bold">{t(lang, 'currency')}</label>
                                            <select 
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brandOrange/20 focus:border-brandOrange outline-none transition"
                                                value={formData.currency}
                                                onChange={e => setFormData({...formData, currency: e.target.value})}
                                            >
                                                <option value="USD">USD</option>
                                                <option value="EUR">EUR</option>
                                                <option value="CNY">CNY</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-slate-500 mb-1 text-xs font-bold">{t(lang, 'lead_time')}</label>
                                            <input 
                                                type="number"
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brandOrange/20 focus:border-brandOrange outline-none transition" 
                                                value={formData.leadTime}
                                                onChange={e => setFormData({...formData, leadTime: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-slate-500 mb-1 text-xs font-bold">{t(lang, 'payment_terms')}</label>
                                            <input 
                                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-brandOrange/20 focus:border-brandOrange outline-none transition" 
                                                placeholder="e.g. Net 30"
                                                value={formData.payment}
                                                onChange={e => setFormData({...formData, payment: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Attachments Card */}
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">{t(lang, 'upload_mtr')}</h3>
                                <div className="flex-1 flex flex-col justify-center items-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition cursor-pointer group p-4" onClick={() => fileInputRef.current?.click()}>
                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm mb-2 group-hover:scale-110 transition-transform">
                                        <svg className="w-5 h-5 text-slate-400 group-hover:text-brandOrange" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 group-hover:text-slate-700">Click to upload files</p>
                                    <p className="text-[10px] text-slate-400">PDF, Excel, Images</p>
                                    <input 
                                        type="file" 
                                        multiple 
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        accept=".pdf,.jpg,.png,.xlsx"
                                    />
                                </div>
                                {attachedFiles.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {attachedFiles.map((file, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-slate-100 text-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-200">
                                                <span className="truncate max-w-[150px]">{file.name}</span>
                                                <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-slate-400 hover:text-red-500 font-bold">×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sticky Action Footer for Mobile */}
                        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:static md:bg-transparent md:border-0 md:shadow-none md:p-0 z-30">
                            <div className="max-w-6xl mx-auto flex justify-between items-center">
                                <div>
                                    <div className="text-xs text-slate-500">{t(lang, 'total_estimate')}</div>
                                    <div className="text-2xl font-bold text-slate-900 leading-none">
                                        {formData.currency} {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <button 
                                    onClick={handleSubmit}
                                    disabled={isSending}
                                    className="bg-slate-900 text-white hover:bg-slate-800 px-8 py-3 rounded-xl font-bold transition shadow-lg shadow-slate-900/20 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isSending ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            Sending...
                                        </>
                                    ) : t(lang, 'submit_quote')}
                                </button>
                            </div>
                        </div>
                    </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400">
                            <p>{t(lang, 'no_active_rfq')}</p>
                         </div>
                    )
                )}
            </div>
        </div>
    </div>
  );
}
