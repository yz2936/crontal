
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
  const [quoteHistory, setQuoteHistory] = useState<Quote[]>([]);
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
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

      // Save locally (Supplier's own record - keeps full files)
      const updatedHistory = storageService.saveQuote(quote);
      setQuoteHistory(updatedHistory);

      // Prepare Quote for Link
      // CRITICAL: We MUST strip the file data for the URL generation.
      // Browsers limit URLs to ~2KB-8KB. Even a small PDF is 50KB+.
      // We keep the metadata (name, type) so the Buyer knows a file was attached.
      const quoteForLink = { ...quote };
      quoteForLink.attachments = quote.attachments?.map(a => ({
          name: a.name,
          mimeType: a.mimeType,
          data: "" // STRIPPED FOR URL LINK SAFETY
      }));

      // Generate Response Link
      try {
        const jsonStr = JSON.stringify(quoteForLink);
        const compressed = LZString.compressToEncodedURIComponent(jsonStr);
        const url = `${window.location.origin}${window.location.pathname}?mode=quote_response&data=${compressed}`;
        
        setSubmittedLink(url);
        onSubmitQuote(quote); // Optimistic update
      } catch (e) {
        console.error("Link generation failed", e);
        alert("Error generating link. Please try again.");
      }
  };

  const copyToClipboard = () => {
      if (submittedLink) {
          navigator.clipboard.writeText(submittedLink);
          alert(t(lang, 'link_copied'));
      }
  };

  if (submittedLink) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
            <div className="bg-white max-w-lg w-full rounded-2xl p-8 shadow-xl text-center space-y-6 animate-in zoom-in-95">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{t(lang, 'quote_submitted_title')}</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                    {t(lang, 'quote_submitted_desc')}
                </p>
                
                <div className="bg-slate-100 p-4 rounded-xl break-all text-xs font-mono text-slate-600 border border-slate-200 max-h-32 overflow-y-auto">
                    {submittedLink}
                </div>

                {attachedFiles.length > 0 && (
                    <div className="text-[10px] text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 flex items-start gap-2 text-left">
                        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>Note: {attachedFiles.length} file(s) were attached. For this demo link, only file metadata is transmitted to keep the URL short.</span>
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={copyToClipboard}
                        className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
                    >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                         {t(lang, 'copy_response_link')}
                    </button>
                    <button 
                        onClick={() => { setSubmittedLink(null); setViewMode('history'); }}
                        className="text-slate-500 hover:text-slate-800 text-sm py-2"
                    >
                        {t(lang, 'nav_history')}
                    </button>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen py-6 px-4 bg-slate-50/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Sidebar */}
            <div className="md:w-64 flex-shrink-0 flex flex-col gap-4">
                 <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-8 w-8 rounded-lg bg-accent/10 border border-accent flex items-center justify-center">
                            <span className="text-accent font-bold text-lg">C</span>
                        </div>
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
                                    <div key={q.id} className="p-4 hover:bg-slate-50 flex justify-between items-center">
                                        <div>
                                            <div className="font-medium text-slate-900">{q.projectName || "Untitled RFP"}</div>
                                            <div className="text-xs text-slate-500">Ref: {q.rfqId} • {new Date(q.timestamp).toLocaleDateString()}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-slate-900">{q.currency} {q.total.toLocaleString()}</div>
                                            <div className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block mt-1">{t(lang, 'status_sent')}</div>
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
                            <div className="bg-gradient-to-r from-accent/10 to-transparent p-5 rounded-2xl border border-accent/20 relative overflow-hidden bg-white">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8z" /></svg>
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="px-2 py-0.5 bg-accent text-white text-[10px] font-bold rounded-full uppercase tracking-wide">Executive Summary</div>
                                        <span className="text-[10px] text-slate-400">Powered by Gemini</span>
                                    </div>
                                    <p className="text-slate-800 text-sm font-medium leading-relaxed italic max-w-3xl">
                                        "{rfq.ai_summary}"
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl shadow-slate-200/50">
                            <div className="flex flex-col md:flex-row justify-between items-start mb-6 border-b border-slate-100 pb-4 gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-semibold text-slate-900">{t(lang, 'rfq_label')} {rfq.id}</h2>
                                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-medium border border-blue-100">Open for Quote</span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1"><span className="font-semibold">{t(lang, 'project_label')}</span> {rfq.project_name}</p>
                                    {rfq.project_description && (
                                        <p className="text-xs text-slate-400 mt-1 max-w-xl">{rfq.project_description}</p>
                                    )}
                                    <div className="flex gap-2 mt-3">
                                        {rfq.commercial.req_mtr && <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 font-medium">MTR Required</span>}
                                        {rfq.commercial.req_avl && <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-100 font-medium">AVL Only</span>}
                                        {rfq.commercial.req_tpi && <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100 font-medium">TPI Required</span>}
                                    </div>
                                </div>
                                <div className="text-right text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <p><span className="font-semibold">{t(lang, 'dest_label')}</span> {rfq.commercial.destination || t(lang, 'notSpecified')}</p>
                                    <p><span className="font-semibold">{t(lang, 'incoterm_label')}</span> {rfq.commercial.incoterm || t(lang, 'notSpecified')}</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-slate-100">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium">
                                        <tr>
                                            <th className="px-4 py-3 border-r border-slate-100 w-12">{t(lang, 'line')}</th>
                                            <th className="px-4 py-3 w-1/4">{t(lang, 'description')}</th>
                                            <th className="px-4 py-3 w-32 bg-slate-100/50 text-center border-x border-slate-100">{t(lang, 'size')} (OD x WT)</th>
                                            <th className="px-4 py-3 text-right w-20">{t(lang, 'qty')}</th>
                                            {/* Supplier Input Columns */}
                                            <th className="px-4 py-3 w-20 bg-slate-50">{t(lang, 'moq')}</th>
                                            <th className="px-4 py-3 w-32 bg-slate-50">{t(lang, 'unit_price')}</th>
                                            <th className="px-4 py-3 w-40 bg-slate-50">{t(lang, 'alternates')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {rfq.line_items.map(item => (
                                            <tr key={item.item_id} className="hover:bg-slate-50/50 group">
                                                <td className="px-4 py-3 text-slate-400 font-mono text-xs border-r border-slate-100 align-top">{item.line}</td>
                                                <td className="px-4 py-3 font-medium text-slate-800 align-top">
                                                    <div className="text-sm">{item.description}</div>
                                                    <div className="text-xs text-slate-500 mt-1">{item.material_grade}</div>
                                                    {(item.tolerance || (item.test_reqs && item.test_reqs.length > 0)) && (
                                                        <div className="text-[10px] text-slate-400 mt-1 bg-slate-100 inline-block px-1 rounded">
                                                            {item.tolerance} {item.test_reqs?.join(', ')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 text-xs text-center border-x border-slate-100 font-mono align-top pt-4">
                                                    {item.size.outer_diameter.value ? `${item.size.outer_diameter.value}${item.size.outer_diameter.unit}` : '-'} x 
                                                    {item.size.wall_thickness.value ? ` ${item.size.wall_thickness.value}${item.size.wall_thickness.unit}` : ' -'}
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-700 font-medium align-top pt-4">{item.quantity} {item.uom}</td>
                                                
                                                {/* Supplier Inputs */}
                                                <td className="px-2 py-3 bg-slate-50/30 align-top">
                                                    <input 
                                                        type="number" 
                                                        placeholder="Min"
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:border-accent focus:ring-1 focus:ring-accent outline-none shadow-sm"
                                                        onChange={(e) => handleMoqChange(item.line, e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-2 py-3 bg-slate-50/30 align-top">
                                                    <input 
                                                        type="number" 
                                                        placeholder="0.00"
                                                        className="w-full text-right bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none shadow-sm"
                                                        onChange={(e) => handlePriceChange(item.line, e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-2 py-3 bg-slate-50/30 align-top">
                                                    <textarea 
                                                        rows={2}
                                                        placeholder="Remarks..."
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:border-accent focus:ring-1 focus:ring-accent outline-none shadow-sm resize-none"
                                                        onChange={(e) => handleAltChange(item.line, e.target.value)}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="mt-6 flex justify-end items-center gap-4 pt-4 border-t border-slate-100">
                                <span className="text-sm text-slate-500">{t(lang, 'total_estimate')}</span>
                                <span className="text-2xl font-bold text-slate-900">
                                    {formData.currency} {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xl shadow-slate-200/50">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">{t(lang, 'commercial_terms')}</h3>
                            <div className="grid md:grid-cols-2 gap-6 text-sm">
                                <div>
                                    <label className="block text-slate-500 mb-1.5 text-xs font-medium">{t(lang, 'supplier_name')}</label>
                                    <input 
                                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:ring-2 focus:ring-accent/10 focus:border-accent outline-none" 
                                        value={formData.supplierName}
                                        onChange={e => setFormData({...formData, supplierName: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-500 mb-1.5 text-xs font-medium">{t(lang, 'currency')}</label>
                                    <select 
                                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-white focus:ring-2 focus:ring-accent/10 focus:border-accent outline-none"
                                        value={formData.currency}
                                        onChange={e => setFormData({...formData, currency: e.target.value})}
                                    >
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                        <option value="CNY">CNY</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-500 mb-1.5 text-xs font-medium">{t(lang, 'lead_time')}</label>
                                    <input 
                                        type="number"
                                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:ring-2 focus:ring-accent/10 focus:border-accent outline-none" 
                                        value={formData.leadTime}
                                        onChange={e => setFormData({...formData, leadTime: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-500 mb-1.5 text-xs font-medium">{t(lang, 'payment_terms')}</label>
                                    <input 
                                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 focus:ring-2 focus:ring-accent/10 focus:border-accent outline-none" 
                                        placeholder="e.g. Net 30"
                                        value={formData.payment}
                                        onChange={e => setFormData({...formData, payment: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* File Upload Section for MTRs */}
                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <label className="block text-slate-500 mb-2 text-xs font-medium uppercase tracking-wider">{t(lang, 'upload_mtr')}</label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="file" 
                                        multiple 
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        accept=".pdf,.jpg,.png,.xlsx"
                                    />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-accent transition flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        Select Files
                                    </button>
                                    {attachedFiles.length > 0 && (
                                        <div className="text-xs text-slate-500">
                                            {attachedFiles.length} {t(lang, 'mtr_attached')}
                                        </div>
                                    )}
                                </div>
                                {attachedFiles.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {attachedFiles.map((file, i) => (
                                            <div key={i} className="flex items-center gap-1 bg-slate-100 text-slate-600 text-[10px] px-2 py-1 rounded border border-slate-200">
                                                <span className="truncate max-w-[150px]">{file.name}</span>
                                                <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 ml-1">×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 flex justify-end">
                                <button 
                                    onClick={handleSubmit}
                                    className="bg-slate-900 text-white hover:bg-slate-800 px-8 py-3 rounded-xl font-medium transition shadow-lg shadow-slate-300 transform hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    {t(lang, 'submit_quote')}
                                </button>
                            </div>
                        </div>
                        
                        <p className="text-center text-xs text-slate-400 pb-8">
                            Powered by Crontal
                        </p>
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
