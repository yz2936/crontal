
import React, { useState, useRef, useEffect } from 'react';
import LZString from 'lz-string';
import { Rfq, Quote, ChatMessage, Language, LineItem, FileAttachment, Size } from '../types';
import { parseRequest, clarifyRequest, generateRfqSummary, auditRfqSpecs } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { Walkthrough } from '../components/Walkthrough';
import { t } from '../utils/i18n';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BuyerViewProps {
  rfq: Rfq | null;
  setRfq: (rfq: Rfq | null) => void;
  quotes: Quote[];
  lang: Language;
}

export default function BuyerView({ rfq, setRfq, quotes, lang }: BuyerViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  
  // UI State
  const [activeStep, setActiveStep] = useState(1);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'price' | 'leadTime'>('price');
  const [awardEmail, setAwardEmail] = useState('');
  const [isInfoCollapsed, setIsInfoCollapsed] = useState(false); // New state for collapsing

  // Navigation State
  const [showNav, setShowNav] = useState(true);
  const [savedRfqs, setSavedRfqs] = useState<Rfq[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSavedRfqs(storageService.getRfqs());
    if (messages.length === 0 || (messages.length === 1 && messages[0].role === 'assistant')) {
        setMessages([{ role: 'assistant', content: t(lang, 'initial_greeting') }]);
    }
  }, [lang]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

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

  const handleSaveDraft = () => {
      if (rfq) {
          const updated = { ...rfq, status: 'draft' as const };
          const newList = storageService.saveRfq(updated);
          setSavedRfqs(newList);
          setRfq(updated);
          alert(t(lang, 'save_success'));
      }
  };

  const handleLoadRfq = (id: string) => {
      const target = savedRfqs.find(r => r.id === id);
      if (target) {
          setRfq(target);
          setMessages([{ role: 'assistant', content: t(lang, 'clarify_default_response') }]);
          // Auto expand info when loading
          setIsInfoCollapsed(false);
      }
  };

  const handleNewProject = () => {
      setRfq(null);
      setMessages([{ role: 'assistant', content: t(lang, 'initial_greeting') }]);
      setIsInfoCollapsed(false);
  };

  const handleDeleteProject = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm("Are you sure you want to delete this project?")) {
          const newList = storageService.deleteRfq(id);
          setSavedRfqs(newList);
          if (rfq?.id === id) {
              handleNewProject();
          }
      }
  };

  const loadSampleData = () => {
      const sampleRfq: Rfq = {
          id: `RFQ-DEMO-${Date.now().toString().slice(-4)}`,
          status: 'draft',
          created_at: Date.now(),
          project_name: "Texas LNG Expansion - Phase 2",
          project_description: "Urgent requirement for Seamless Carbon Steel pipes for high-pressure gas lines. MTRs required for all items.",
          commercial: {
              destination: "Houston, TX Port",
              incoterm: "DDP",
              paymentTerm: "Net 30",
              otherRequirements: "Strict Vendor List",
              req_mtr: true,
              req_avl: true,
              req_tpi: false,
              warranty_months: 18
          },
          original_text: "Sample Data",
          line_items: [
              {
                  item_id: "L1", line: 1, quantity: 400, uom: "m", description: "Seamless Pipe, API 5L Gr. B", 
                  material_grade: "API 5L Gr. B", raw_description: "", other_requirements: [],
                  size: { outer_diameter: { value: 8, unit: "in" }, wall_thickness: { value: 0.322, unit: "in" }, length: { value: 12, unit: "m" } }
              },
              {
                  item_id: "L2", line: 2, quantity: 120, uom: "pcs", description: "Flange, Weld Neck, RF, Class 300", 
                  material_grade: "ASTM A105", raw_description: "", other_requirements: [],
                  size: { outer_diameter: { value: 8, unit: "in" }, wall_thickness: { value: null, unit: null }, length: { value: null, unit: null } }
              },
              {
                  item_id: "L3", line: 3, quantity: 50, uom: "pcs", description: "Elbow 90 deg, Long Radius", 
                  material_grade: "ASTM A234 WPB", raw_description: "", other_requirements: [],
                  size: { outer_diameter: { value: 8, unit: "in" }, wall_thickness: { value: 0.322, unit: "in" }, length: { value: null, unit: null } }
              }
          ]
      };
      setRfq(sampleRfq);
      storageService.saveRfq(sampleRfq);
      setSavedRfqs(storageService.getRfqs());
      setMessages(prev => [...prev, { role: 'assistant', content: t(lang, 'rfq_created_msg', { count: '3' }) }]);
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
                status: 'draft',
                created_at: Date.now(),
                project_name: partial.project_name || "New Project",
                line_items: partial.line_items as LineItem[] || [],
                commercial: partial.commercial || { destination: '', incoterm: '', paymentTerm: '', otherRequirements: '', req_mtr: false, req_avl: false, req_tpi: false, warranty_months: 12 },
                original_text: text
            };
            setRfq(newRfq);
            // Auto save new project
            const updatedList = storageService.saveRfq(newRfq);
            setSavedRfqs(updatedList);

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
            storageService.saveRfq(updatedRfq); // Auto save updates
            
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

  // ... (Keep existing helpers: handleUpdateLineItem, handleDeleteItem, handleUpdateDimension, handleUpdateCommercial)
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

  const handleUpdateCommercial = (field: string, value: any) => {
      if (!rfq) return;
      setRfq({
          ...rfq,
          commercial: { ...rfq.commercial, [field]: value }
      });
  };

  const handleGenerateSummary = async () => {
    if (!rfq) return;
    setIsGeneratingSummary(true);
    try {
        const summary = await generateRfqSummary(rfq, lang);
        const updated = { ...rfq, ai_summary: summary };
        setRfq(updated);
        storageService.saveRfq(updated);
    } catch (e) {
        console.error(e);
    } finally {
        setIsGeneratingSummary(false);
    }
  };
  
  const handleAudit = async () => {
      if (!rfq) return;
      setIsAuditing(true);
      try {
          const warnings = await auditRfqSpecs(rfq, lang);
          const updated = { ...rfq, audit_warnings: warnings };
          setRfq(updated);
          storageService.saveRfq(updated);
          if(warnings.length === 0) {
              alert(t(lang, 'audit_clean'));
          }
      } catch(e) {
          console.error(e);
      } finally {
          setIsAuditing(false);
      }
  };

  const handleShareLink = () => {
    if (!rfq) return;
    
    // Mark as sent when shared
    const sentRfq = { ...rfq, status: 'sent' as const };
    setRfq(sentRfq);
    storageService.saveRfq(sentRfq);
    setSavedRfqs(storageService.getRfqs());

    const jsonStr = JSON.stringify(sentRfq);
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

      // Update status to awarded
      const awardedRfq = { ...rfq, status: 'awarded' as const };
      setRfq(awardedRfq);
      storageService.saveRfq(awardedRfq);
      setSavedRfqs(storageService.getRfqs());

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
    const title = "Request for Quotation";
    doc.text(title, 14, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`RFQ ID: ${rfq.id}`, 14, yPos); yPos += 6;
    doc.text(`Project: ${rfq.project_name || 'N/A'}`, 14, yPos); yPos += 6;
    if (rfq.ai_summary) {
        const splitSummary = doc.splitTextToSize(`Summary: ${rfq.ai_summary}`, 180);
        doc.text(splitSummary, 14, yPos);
        yPos += (splitSummary.length * 5) + 4;
    }
    
    doc.text(`Destination: ${rfq.commercial.destination}`, 14, yPos); yPos += 6;
    doc.text(`Incoterm: ${rfq.commercial.incoterm}`, 14, yPos); yPos += 6;
    doc.text(`Payment: ${rfq.commercial.paymentTerm}`, 14, yPos); yPos += 6;
    
    const reqs = [];
    if(rfq.commercial.req_mtr) reqs.push("MTR Required");
    if(rfq.commercial.req_avl) reqs.push("AVL Only");
    if(reqs.length > 0) {
        doc.text(`Requirements: ${reqs.join(', ')}`, 14, yPos);
        yPos += 10;
    } else {
        yPos += 4;
    }

    const tableData = rfq.line_items.map(item => [
        item.line,
        item.description,
        item.material_grade,
        item.quantity,
        item.uom,
        `${item.size.outer_diameter.value || ''}${item.size.outer_diameter.unit || ''} x ${item.size.wall_thickness.value || ''}${item.size.wall_thickness.unit || ''}`
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [['Line', 'Desc', 'Grade', 'Qty', 'UOM', 'Size']],
        body: tableData,
    });

    doc.save(`RFQ-${rfq.id}.pdf`);
  };

  const handleGeneratePO = () => {
      if (!selectedQuoteId || !rfq) return;
      const quote = quotes.find(q => q.id === selectedQuoteId);
      if (!quote) return;

      const doc = new jsPDF();
      // ... (Keep PO generation logic same as before)
      doc.text("PURCHASE ORDER", 14, 25);
      doc.save(`PO_${quote.supplierName}_${rfq.id}.pdf`);
  };

  const steps = [
      { selector: '#chat-box', text: t(lang, 'step1') },
      { selector: '#rfq-table', text: t(lang, 'step2') },
      { selector: '#quote-comparison', text: t(lang, 'step3') }
  ];

  return (
    <div className="flex flex-col md:flex-row gap-6 relative min-h-[80vh]">
      <Walkthrough steps={steps} isActive={isTourActive} onClose={() => setIsTourActive(false)} lang={lang} />
      
      {/* Sidebar Navigation */}
      <div className="md:w-64 flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-fit sticky top-4">
          <div className="p-4 border-b border-slate-100">
              <button 
                  onClick={handleNewProject}
                  className="w-full bg-accent text-white rounded-xl py-2.5 text-sm font-medium hover:bg-accent/90 transition shadow-sm flex items-center justify-center gap-2"
              >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  {t(lang, 'nav_new_project')}
              </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[calc(100vh-200px)]">
              <h3 className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{t(lang, 'nav_drafts')}</h3>
              {savedRfqs.length === 0 && (
                  <p className="px-3 text-xs text-slate-400 italic">No saved projects</p>
              )}
              {savedRfqs.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => handleLoadRfq(item.id)}
                    className={`group px-3 py-2.5 rounded-lg cursor-pointer flex items-center justify-between text-sm transition ${
                        rfq?.id === item.id ? 'bg-accent/10 text-accent font-medium' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                      <div className="truncate">
                          <div className="truncate">{item.project_name || "Untitled"}</div>
                          <div className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleDateString()} • {item.status || 'draft'}</div>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteProject(e, item.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition"
                      >
                          ×
                      </button>
                  </div>
              ))}
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6">
        
        {/* Progress Stepper */}
        {rfq && (
            <div className="flex items-center justify-center gap-2 mb-2">
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
        )}

        <div className="grid md:grid-cols-12 gap-6 items-start">
            {/* Left Col: Chat (4 cols) */}
            <div className="md:col-span-4 flex flex-col h-[600px] sticky top-4">
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
                        <div className="flex gap-2 relative items-end">
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
                                className="text-slate-400 hover:text-accent hover:bg-accent/5 p-2 rounded-xl transition h-10 w-10 flex items-center justify-center"
                                title={t(lang, 'upload_file')}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            </button>
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder={t(lang, 'chat_placeholder')}
                                className="flex-1 bg-slate-50 rounded-xl border-0 px-4 py-2 text-sm focus:ring-2 focus:ring-accent/20 focus:bg-white transition placeholder-slate-400 min-h-[40px] max-h-[150px] resize-none leading-relaxed"
                                rows={1}
                            />
                            <button 
                                onClick={handleSend}
                                disabled={isProcessing || (!input && attachedFiles.length === 0)}
                                className="bg-accent hover:bg-accent/90 text-white rounded-xl h-10 w-10 flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-accent/20"
                            >
                                <svg className="w-4 h-4 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Col: RFQ Data */}
            <div className="md:col-span-8 flex flex-col">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center" id="action-bar">
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{t(lang, 'live_preview')}</span>
                            {rfq && <span className="ml-2 text-[10px] text-slate-400 font-mono">#{rfq.id}</span>}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveDraft}
                                disabled={!rfq}
                                className="text-[10px] font-medium text-slate-600 hover:text-accent transition px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-50"
                            >
                                {t(lang, 'save_draft')}
                            </button>
                            <button 
                                onClick={handleGeneratePdf}
                                disabled={!rfq}
                                className="group flex items-center gap-1.5 text-[10px] font-medium bg-white border border-slate-200 hover:border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                            >
                                {t(lang, 'download_pdf')}
                            </button>
                            <button 
                                onClick={handleShareLink}
                                disabled={!rfq}
                                className="group flex items-center gap-1.5 text-[10px] bg-slate-900 text-white font-medium px-3 py-1.5 rounded-lg hover:bg-slate-800 transition disabled:opacity-50 shadow-md shadow-slate-200"
                            >
                                {t(lang, 'share_link')}
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-6 space-y-8" id="rfq-table">
                        {!rfq ? (
                            <div className="min-h-[400px] flex flex-col justify-center gap-6">
                                <div className="text-center mb-4">
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">{t(lang, 'dashboard_title')}</h3>
                                    <p className="text-sm text-slate-500">Select an option to begin your procurement process.</p>
                                </div>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div onClick={() => loadSampleData()} className="group cursor-pointer bg-slate-50 hover:bg-white border border-slate-200 hover:border-accent/50 p-6 rounded-2xl transition-all shadow-sm hover:shadow-md text-center flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900 text-sm">{t(lang, 'action_sample_title')}</h4>
                                            <p className="text-xs text-slate-500 mt-1">{t(lang, 'action_sample_desc')}</p>
                                        </div>
                                    </div>
                                    
                                    <div onClick={() => (textareaRef.current as HTMLElement)?.focus()} className="group cursor-pointer bg-slate-50 hover:bg-white border border-slate-200 hover:border-accent/50 p-6 rounded-2xl transition-all shadow-sm hover:shadow-md text-center flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900 text-sm">{t(lang, 'action_chat_title')}</h4>
                                            <p className="text-xs text-slate-500 mt-1">{t(lang, 'action_chat_desc')}</p>
                                        </div>
                                    </div>

                                    <div onClick={() => fileInputRef.current?.click()} className="group cursor-pointer bg-slate-50 hover:bg-white border border-slate-200 hover:border-accent/50 p-6 rounded-2xl transition-all shadow-sm hover:shadow-md text-center flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900 text-sm">{t(lang, 'action_upload_title')}</h4>
                                            <p className="text-xs text-slate-500 mt-1">{t(lang, 'action_upload_desc')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Collapsible Project Info Section */}
                                <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden transition-all duration-300 ease-in-out">
                                    {/* Info Header / Toggle Bar */}
                                    <div 
                                        onClick={() => setIsInfoCollapsed(!isInfoCollapsed)}
                                        className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t(lang, 'project_info')}</h3>
                                            
                                            {/* Summary View when collapsed */}
                                            {isInfoCollapsed && (
                                                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
                                                     <div className="h-4 w-[1px] bg-slate-300"></div>
                                                     <span className="text-sm font-semibold text-slate-900">{rfq.project_name || "Untitled Project"}</span>
                                                     <span className={`text-[10px] px-2 py-0.5 rounded-full border ${rfq.status === 'awarded' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
                                                        {rfq.status || 'draft'}
                                                     </span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                             {/* Only show actions in header when collapsed to save space */}
                                            {isInfoCollapsed && (
                                                 <div className="flex gap-2 mr-2" onClick={(e) => e.stopPropagation()}>
                                                    <button onClick={handleGenerateSummary} className="text-[10px] text-accent hover:underline">{t(lang, 'generate_summary')}</button>
                                                 </div>
                                            )}

                                            <button className="text-slate-400 hover:text-slate-600 transition p-1">
                                                {isInfoCollapsed ? (
                                                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                ) : (
                                                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isInfoCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}`}>
                                        <div className="p-4 space-y-4 pt-0">
                                            <div className="flex justify-end gap-2 mb-2">
                                                <button 
                                                    onClick={handleAudit}
                                                    disabled={isAuditing}
                                                    className="text-[10px] text-orange-600 hover:text-white hover:bg-orange-500 font-medium flex items-center gap-1 bg-white border border-orange-200 px-2 py-1 rounded transition disabled:opacity-50"
                                                >
                                                    {isAuditing ? t(lang, 'audit_running') : t(lang, 'audit_specs')}
                                                </button>
                                                <button 
                                                    onClick={handleGenerateSummary}
                                                    disabled={isGeneratingSummary}
                                                    className="text-[10px] text-accent hover:text-white hover:bg-accent font-medium flex items-center gap-1 bg-white border border-accent/20 px-2 py-1 rounded transition disabled:opacity-50"
                                                >
                                                    {isGeneratingSummary ? '...' : t(lang, 'generate_summary')}
                                                </button>
                                            </div>

                                            <div className="grid md:grid-cols-1 gap-4">
                                                <div className="group">
                                                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">{t(lang, 'project_name')}</label>
                                                    <input 
                                                        value={rfq.project_name || ''}
                                                        onChange={(e) => setRfq({...rfq, project_name: e.target.value})}
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 hover:border-slate-300 focus:border-accent focus:ring-1 focus:ring-accent outline-none font-medium text-sm transition"
                                                        placeholder="Enter project name"
                                                    />
                                                </div>
                                                <div className="group">
                                                    <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">{t(lang, 'project_description')}</label>
                                                    <textarea 
                                                        value={rfq.project_description || ''}
                                                        onChange={(e) => setRfq({...rfq, project_description: e.target.value})}
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 hover:border-slate-300 focus:border-accent focus:ring-1 focus:ring-accent outline-none text-xs transition min-h-[60px]"
                                                        placeholder="Provide context for the supplier..."
                                                    />
                                                </div>
                                                {rfq.ai_summary && (
                                                    <div className="bg-accent/5 rounded-lg p-3 border border-accent/10 animate-in fade-in">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-bold text-accent uppercase">{t(lang, 'ai_summary_label')}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-700 italic leading-relaxed">"{rfq.ai_summary}"</p>
                                                    </div>
                                                )}
                                                {rfq.audit_warnings && rfq.audit_warnings.length > 0 && (
                                                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-100 animate-in fade-in">
                                                        <div className="flex items-center gap-2 mb-1 text-orange-700">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                            <span className="text-[10px] font-bold uppercase">{t(lang, 'audit_warnings')}</span>
                                                        </div>
                                                        <ul className="list-disc list-inside text-xs text-orange-800 space-y-1">
                                                            {rfq.audit_warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>

                                            {/* EPC Commercial Terms */}
                                            <div className="pt-4 border-t border-slate-100 mt-4">
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                                                        <div className="group">
                                                            <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">{t(lang, 'destination')}</span>
                                                            <input 
                                                                value={rfq.commercial.destination || ''}
                                                                onChange={(e) => handleUpdateCommercial('destination', e.target.value)}
                                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 hover:border-slate-300 focus:border-accent focus:ring-1 focus:ring-accent transition outline-none font-medium"
                                                            />
                                                        </div>
                                                        <div className="group">
                                                            <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">{t(lang, 'incoterm')}</span>
                                                            <input 
                                                                value={rfq.commercial.incoterm || ''}
                                                                onChange={(e) => handleUpdateCommercial('incoterm', e.target.value)}
                                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 hover:border-slate-300 focus:border-accent focus:ring-1 focus:ring-accent transition outline-none font-medium"
                                                            />
                                                        </div>
                                                        <div className="group">
                                                            <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">{t(lang, 'payment')}</span>
                                                            <input 
                                                                value={rfq.commercial.paymentTerm || ''}
                                                                onChange={(e) => handleUpdateCommercial('paymentTerm', e.target.value)}
                                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 hover:border-slate-300 focus:border-accent focus:ring-1 focus:ring-accent transition outline-none font-medium"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="checkbox" checked={rfq.commercial.req_mtr} onChange={e => handleUpdateCommercial('req_mtr', e.target.checked)} className="rounded border-slate-300 text-accent focus:ring-accent" />
                                                            <span className="text-xs font-medium text-slate-700">{t(lang, 'req_mtr')}</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="checkbox" checked={rfq.commercial.req_avl} onChange={e => handleUpdateCommercial('req_avl', e.target.checked)} className="rounded border-slate-300 text-accent focus:ring-accent" />
                                                            <span className="text-xs font-medium text-slate-700">{t(lang, 'req_avl')}</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input type="checkbox" checked={rfq.commercial.req_tpi} onChange={e => handleUpdateCommercial('req_tpi', e.target.checked)} className="rounded border-slate-300 text-accent focus:ring-accent" />
                                                            <span className="text-xs font-medium text-slate-700">{t(lang, 'req_tpi')}</span>
                                                        </label>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-medium text-slate-700 whitespace-nowrap">{t(lang, 'warranty')}</span>
                                                            <input type="number" value={rfq.commercial.warranty_months} onChange={e => handleUpdateCommercial('warranty_months', parseInt(e.target.value))} className="w-12 text-center text-xs border border-slate-300 rounded" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Editable Items Table (Keeping as is) */}
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
                                    <div id="quote-comparison" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2 pb-20">
                                        {/* ... (Same comparison code as before) */}
                                        <div className="flex justify-between items-center px-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">{t(lang, 'received_quotes')}</h3>
                                                <span className="bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{quotes.length}</span>
                                            </div>
                                            {/* ... sort controls ... */}
                                        </div>
                                        
                                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {getSortedQuotes().map((q, idx) => {
                                                const isSelected = selectedQuoteId === q.id;
                                                return (
                                                    <div 
                                                        key={q.id} 
                                                        onClick={() => setSelectedQuoteId(q.id)}
                                                        className={`relative p-6 border rounded-2xl flex flex-col gap-4 cursor-pointer transition-all duration-300 group ${
                                                            isSelected 
                                                            ? 'border-accent ring-2 ring-accent ring-offset-2 bg-white shadow-xl scale-[1.02] z-10' 
                                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
                                                        }`}
                                                    >
                                                        {/* ... quote card content ... */}
                                                        <div className="flex justify-between items-start mt-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-colors ${isSelected ? 'border-accent bg-accent/10 text-accent' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                                                                    {q.supplierName.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <span className={`font-bold text-sm block ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>{q.supplierName}</span>
                                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Valid: {q.validity} days</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="py-2">
                                                            <span className={`block font-bold tracking-tight ${isSelected ? 'text-3xl text-accent' : 'text-2xl text-slate-900'}`}>
                                                                {q.currency} {q.total.toLocaleString()}
                                                            </span>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${parseInt(q.leadTime) < 15 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                                                                    {q.leadTime} days lead time
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        {isSelected && (
                                                            <div className="mt-4 flex flex-col gap-2">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleGenerateAwardEmail(); }}
                                                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2"
                                                                >
                                                                    {t(lang, 'generate_award')}
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleGeneratePO(); }}
                                                                    className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-2 rounded-xl text-xs transition flex items-center justify-center gap-2"
                                                                >
                                                                    {t(lang, 'generate_po_pdf')}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {selectedQuoteId && awardEmail && (
                                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 ring-1 ring-slate-100">
                                                <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                                                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t(lang, 'award_email_preview')}</h4>
                                                    <button 
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(awardEmail);
                                                            alert("Email copied to clipboard!");
                                                        }}
                                                        className="text-xs font-medium text-accent hover:text-white hover:bg-accent border border-accent/20 px-3 py-1.5 rounded-lg transition"
                                                    >
                                                        {t(lang, 'copy_email')}
                                                    </button>
                                                </div>
                                                <textarea 
                                                    readOnly
                                                    value={awardEmail}
                                                    className="w-full h-48 text-sm p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none font-mono leading-relaxed resize-none"
                                                />
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
    </div>
  );
}
