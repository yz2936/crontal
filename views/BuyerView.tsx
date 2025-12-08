
import React, { useState, useRef, useEffect } from 'react';
import { Rfq, Quote, Language, ColumnConfig, LineItem, FileAttachment, ChatMessage, RiskAnalysisItem } from '../types';
import { parseRequest, analyzeRfqRisks, auditRfqSpecs } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { t } from '../utils/i18n';
import LZString from 'lz-string';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BuyerViewProps {
    rfq: Rfq | null;
    setRfq: (rfq: Rfq | null) => void;
    quotes: Quote[];
    lang: Language;
}

export default function BuyerView({ rfq, setRfq, quotes, lang }: BuyerViewProps) {
    const [inputText, setInputText] = useState('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    
    // Navigation & View State
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
    const [savedRfqs, setSavedRfqs] = useState<Rfq[]>([]);
    
    // Comparison State
    const [viewQuoteDetails, setViewQuoteDetails] = useState<Quote | null>(null);

    // Risk Analysis State
    const [isRiskAnalyzing, setIsRiskAnalyzing] = useState(false);
    const [showRiskModal, setShowRiskModal] = useState(false);
    const [auditWarnings, setAuditWarnings] = useState<string[]>([]);
    const [isAuditing, setIsAuditing] = useState(false);

    // UI State
    const [isHeaderInfoOpen, setIsHeaderInfoOpen] = useState(true); 
    const prevItemCount = useRef(0);
    const [linkCopied, setLinkCopied] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);

    // Load drafts on mount
    useEffect(() => {
        setSavedRfqs(storageService.getRfqs());
    }, [rfq]); 

    // Auto-switch to Comparison Step if Quotes exist (e.g. after import)
    useEffect(() => {
        if (quotes && quotes.length > 0 && currentStep !== 3) {
            setCurrentStep(3);
        }
    }, [quotes]);

    // Scroll to bottom of chat
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatHistory, isProcessing]);

    // Auto-focus logic for new items
    useEffect(() => {
        if (rfq && rfq.line_items.length > prevItemCount.current) {
            const newIndex = rfq.line_items.length - 1;
            setTimeout(() => {
                const el = document.getElementById(`cell-product_type-${newIndex}`);
                if (el) (el as HTMLInputElement).focus();
            }, 100); 
        }
        prevItemCount.current = rfq ? rfq.line_items.length : 0;
    }, [rfq?.line_items.length]);

    // Default Table Configuration
    const [tableConfig, setTableConfig] = useState<ColumnConfig[]>([
        { id: 'line', label: t(lang, 'line'), visible: true, width: 'sm' },
        { id: 'product_type', label: t(lang, 'shape'), visible: true, width: 'md' },
        { id: 'description', label: t(lang, 'description'), visible: true, width: 'lg' },
        { id: 'material_grade', label: t(lang, 'grade'), visible: true, width: 'md' },
        { id: 'tolerance', label: t(lang, 'tolerance'), visible: true, width: 'sm' },
        { id: 'size', label: t(lang, 'size'), visible: true, width: 'lg' }, 
        { id: 'quantity', label: t(lang, 'qty'), visible: true, width: 'sm' },
        { id: 'uom', label: t(lang, 'uom'), visible: true, width: 'sm' },
    ]);

    // Helper for rendering size
    const renderSize = (item: LineItem) => {
        const od = item.size.outer_diameter.value ? `${item.size.outer_diameter.value}${item.size.outer_diameter.unit}` : '';
        const wt = item.size.wall_thickness.value ? ` x ${item.size.wall_thickness.value}${item.size.wall_thickness.unit}` : '';
        const len = item.size.length.value ? ` x ${item.size.length.value}${item.size.length.unit}` : '';
        return `${od}${wt}${len}`;
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setAttachedFiles(prev => [...prev, ...newFiles]);
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
                const result = reader.result as string;
                if (!result || !result.includes(',')) {
                    resolve({ name: file.name, mimeType: file.type, data: "" });
                    return;
                }
                resolve({
                    name: file.name,
                    mimeType: file.type,
                    data: result.split(',')[1]
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
                    line_items: result.rfqUpdates.line_items || [],
                    commercial: {
                        ...rfq.commercial,
                        ...(result.rfqUpdates.commercial?.destination ? { destination: result.rfqUpdates.commercial.destination } : {}),
                    }
                };
                setRfq(updatedRfq);
            } else {
                const newRfq: Rfq = {
                    id: `RFQ-${Date.now()}`,
                    project_name: result.rfqUpdates.project_name || "New RFP",
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
                setCurrentStep(2);
            }
            
            setIsHeaderInfoOpen(true); 
            const aiMessage: ChatMessage = { 
                role: 'assistant', 
                content: result.responseText 
            };
            setChatHistory(prev => [...prev, aiMessage]);

        } catch (e) {
            console.error(e);
            setChatHistory(prev => [...prev, { role: 'assistant', content: t(lang, 'analyzing_error') }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const calculateRiskScore = (risks: RiskAnalysisItem[]) => {
        let score = 100;
        risks.forEach(r => {
            if (r.impact_level === 'High') score -= 15;
            else if (r.impact_level === 'Medium') score -= 5;
            else if (r.impact_level === 'Low') score -= 2;
        });
        return Math.max(0, Math.min(100, score));
    };

    const handleRiskAnalysis = async () => {
        if (!rfq) return;
        setIsRiskAnalyzing(true);
        try {
            const report = await analyzeRfqRisks(rfq, lang);
            setRfq({
                ...rfq,
                risks: report
            });
            setShowRiskModal(true);
        } catch (e) {
            console.error("Risk analysis failed", e);
            alert("Analysis failed. Please try again.");
        } finally {
            setIsRiskAnalyzing(false);
        }
    };

    const handleAuditSpecs = async () => {
        if (!rfq) return;
        setIsAuditing(true);
        try {
            const warnings = await auditRfqSpecs(rfq, lang);
            setAuditWarnings(warnings);
            if (warnings.length > 0) {
                setRfq({
                    ...rfq,
                    audit_warnings: warnings
                });
            } else {
                alert(t(lang, 'audit_clean'));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsAuditing(false);
        }
    }

    const handleIgnoreRisk = (index: number) => {
        if (!rfq || !rfq.risks) return;
        const newRisks = [...rfq.risks];
        newRisks.splice(index, 1);
        setRfq({
            ...rfq,
            risks: newRisks
        });
        if (newRisks.length === 0) setShowRiskModal(false);
    };

    const handleMitigateRisk = (item: RiskAnalysisItem, index: number) => {
        setShowRiskModal(false);
        handleIgnoreRisk(index);
        
        if (item.category === 'Commercial') {
            setIsHeaderInfoOpen(true);
            setTimeout(() => {
                 document.getElementById('commercial-section')?.scrollIntoView({ behavior: 'smooth' });
                 if (item.risk.toLowerCase().includes('payment')) document.querySelector<HTMLInputElement>('input[value="' + (rfq?.commercial.paymentTerm || '') + '"]')?.focus();
            }, 300);
        } else if (item.category === 'Strategic') {
            setIsHeaderInfoOpen(true);
             setTimeout(() => {
                 document.querySelector<HTMLTextAreaElement>('textarea[placeholder="Provide context for suppliers..."]')?.focus();
            }, 300);
        } else {
            const match = item.risk.match(/(?:Line|Item)\s+(\d+)/i);
            if (match && match[1]) {
                 const lineIdx = parseInt(match[1]) - 1;
                 setTimeout(() => {
                     const row = document.getElementById(`cell-description-${lineIdx}`);
                     if (row) {
                         row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                         row.focus();
                         row.classList.add('ring-2', 'ring-accent', 'ring-offset-2');
                         setTimeout(() => row.classList.remove('ring-2', 'ring-accent', 'ring-offset-2'), 2000);
                     }
                 }, 300);
            } else {
                 setTimeout(() => {
                     document.getElementById('cell-description-0')?.focus();
                 }, 300);
            }
        }
    };

    const focusCell = (colId: string, rowIndex: number) => {
        const el = document.getElementById(`cell-${colId}-${rowIndex}`);
        if (el) (el as HTMLInputElement).focus();
    };

    const handleAddItem = () => {
        const newItemLine = rfq ? rfq.line_items.length + 1 : 1;
        const newItem: LineItem = {
            item_id: `L${Date.now()}`,
            line: newItemLine,
            raw_description: "",
            description: "",
            product_type: "",
            material_grade: "",
            tolerance: "",
            test_reqs: [],
            size: {
                outer_diameter: { value: null, unit: 'mm' },
                wall_thickness: { value: null, unit: 'mm' },
                length: { value: null, unit: 'mm' }
            },
            quantity: 1,
            uom: 'pcs',
            other_requirements: []
        };

        if (rfq) {
            setRfq({ ...rfq, line_items: [...rfq.line_items, newItem] });
        } else {
            const newRfq: Rfq = {
                id: `RFQ-${Date.now()}`,
                project_name: "New RFP",
                status: 'draft',
                line_items: [newItem],
                original_text: "",
                created_at: Date.now(),
                commercial: {
                    destination: "",
                    incoterm: "",
                    paymentTerm: "",
                    otherRequirements: "",
                    req_mtr: false,
                    req_avl: false,
                    req_tpi: false,
                    warranty_months: 12
                }
            };
            setRfq(newRfq);
            setIsHeaderInfoOpen(true); 
            setCurrentStep(2);
        }
    };

    const handleLoadSample = () => {
        const sampleRfq: Rfq = {
            id: `RFQ-SAMPLE-${Date.now()}`,
            project_name: "Houston Pipeline Project",
            status: 'draft',
            created_at: Date.now(),
            original_text: "Sample Data",
            commercial: {
                destination: "Houston, TX",
                incoterm: "DDP",
                paymentTerm: "Net 30",
                otherRequirements: "",
                req_mtr: true,
                req_avl: true,
                req_tpi: false,
                warranty_months: 12
            },
            line_items: [
                {
                    item_id: "L1", line: 1, raw_description: "", description: "Seamless Pipe, API 5L Gr.B", product_type: "Pipe", material_grade: "API 5L Gr.B",
                    size: { outer_diameter: { value: 168.3, unit: 'mm' }, wall_thickness: { value: 7.11, unit: 'mm' }, length: { value: 12, unit: 'm' } },
                    quantity: 500, uom: 'm', other_requirements: [], tolerance: "Sch40"
                },
                {
                    item_id: "L2", line: 2, raw_description: "", description: "Weld Neck Flange, Class 150", product_type: "Flange", material_grade: "ASTM A105",
                    size: { outer_diameter: { value: 168.3, unit: 'mm' }, wall_thickness: { value: null, unit: null }, length: { value: null, unit: null } },
                    quantity: 20, uom: 'pcs', other_requirements: [], tolerance: "#150"
                }
            ]
        };
        setRfq(sampleRfq);
        setIsHeaderInfoOpen(true);
        setCurrentStep(2);
        setChatHistory([{ role: 'user', content: "Load sample piping data." }, { role: 'assistant', content: t(lang, 'rfq_created_msg', { count: '2' }) }]);
    };

    const handleNewRfp = () => {
        setRfq(null);
        setInputText('');
        setChatHistory([]);
        setIsHeaderInfoOpen(true);
        setCurrentStep(1);
    };

    const handleSelectRfq = (id: string) => {
        const selected = savedRfqs.find(r => r && r.id === id);
        if (selected) {
            setRfq(selected);
            setChatHistory([]); 
            setIsHeaderInfoOpen(true);
            setCurrentStep(2);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, colId: string, rowIndex: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                if (rowIndex > 0) focusCell(colId, rowIndex - 1);
            } else {
                if (rfq && rowIndex === rfq.line_items.length - 1) {
                    handleAddItem();
                } else {
                    focusCell(colId, rowIndex + 1);
                }
            }
        }
    };

    const handleUpdateLineItem = (index: number, field: keyof LineItem, value: any) => {
        if (!rfq) return;
        const newItems = [...rfq.line_items];
        newItems[index] = { ...newItems[index], [field]: value };
        setRfq({ ...rfq, line_items: newItems });
    };

    const handleDeleteItem = (index: number) => {
        if (!rfq) return;
        const newItems = rfq.line_items.filter((_, i) => i !== index);
        const reindexed = newItems.map((item, idx) => ({ ...item, line: idx + 1 }));
        setRfq({ ...rfq, line_items: reindexed });
    };

    const handleShare = async () => {
        if (!rfq) return;
        
        // Optimize payload: Remove internal buyer data to shorten URL
        const rfqForSupplier = {
            id: rfq.id,
            project_name: rfq.project_name,
            project_description: rfq.project_description,
            line_items: rfq.line_items.map(li => ({
                // Keep only essential fields for supplier
                line: li.line,
                item_id: li.item_id,
                description: li.description,
                product_type: li.product_type,
                material_grade: li.material_grade,
                tolerance: li.tolerance,
                test_reqs: li.test_reqs,
                size: li.size,
                quantity: li.quantity,
                uom: li.uom
            })),
            commercial: rfq.commercial,
            created_at: rfq.created_at
        };

        const jsonStr = JSON.stringify(rfqForSupplier);
        const compressed = LZString.compressToEncodedURIComponent(jsonStr);
        
        // Robust URL construction using the URL API to prevent malformed domains
        const urlObj = new URL(window.location.href);
        urlObj.search = ''; // Clear existing params
        urlObj.searchParams.set('mode', 'supplier');
        urlObj.searchParams.set('data', compressed);
        
        const url = urlObj.toString();
        
        // Show the link in a modal for manual copying as backup
        setGeneratedLink(url);
        
        try {
            await navigator.clipboard.writeText(url);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (err) {
            console.error('Clipboard failed', err);
            // Fallback is handled by the visual modal showing up
        }
    };

    const handleGenerateAwardPO = (winningQuote: Quote) => {
        if (!rfq) return;
        const doc = new jsPDF();
        
        doc.setFontSize(22);
        doc.setFont("times", "bold");
        doc.text("PURCHASE ORDER", 14, 20);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const poNum = `PO-${rfq.id.replace('RFQ-', '')}`;
        doc.text(`Order Number: ${poNum}`, 140, 18);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 23);

        doc.setFillColor(11, 17, 33);
        doc.roundedRect(14, 25, 30, 10, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text("CRONTAL", 16, 31.5);
        doc.setTextColor(0, 0, 0);

        const startY = 45;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("VENDOR:", 14, startY);
        doc.setFont("helvetica", "normal");
        doc.text(winningQuote.supplierName, 14, startY + 5);
        
        doc.setFont("helvetica", "bold");
        doc.text("DELIVERY TO:", 110, startY);
        doc.setFont("helvetica", "normal");
        doc.text(rfq.commercial.destination || "See Below", 110, startY + 5);
        
        doc.setFont("helvetica", "bold");
        doc.text("Project Ref:", 14, startY + 25);
        doc.setFont("helvetica", "normal");
        doc.text(rfq.project_name || "N/A", 35, startY + 25);

        const tableBody = rfq.line_items.map(item => {
            const quoteItem = winningQuote.items.find(qi => qi.line === item.line);
            const unitPrice = quoteItem?.unitPrice || 0;
            const lineTotal = (quoteItem?.unitPrice || 0) * (item.quantity || 0);
            
            return [
                `${item.description} \n${item.product_type || ''} ${item.material_grade || ''}`,
                item.size.outer_diameter.value?.toString() || '-',
                item.quantity?.toString() || '0',
                item.uom || 'pcs',
                `${winningQuote.currency} ${unitPrice.toFixed(2)}`,
                `${winningQuote.currency} ${lineTotal.toFixed(2)}`
            ];
        });

        autoTable(doc, {
            startY: startY + 30,
            head: [['Description', 'OD', 'Qty', 'UOM', 'Unit Price', 'Amount']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
            styles: { fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1, valign: 'middle' },
        });

        // @ts-ignore
        let finalY = doc.lastAutoTable.finalY + 5;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL:", 140, finalY + 5);
        doc.text(`${winningQuote.currency} ${winningQuote.total.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 170, finalY + 5, { align: 'right' });

        doc.save(`PO_${rfq.id}_${winningQuote.supplierName.replace(/\s+/g, '_')}.pdf`);
    };

    const riskScore = rfq?.risks ? calculateRiskScore(rfq.risks) : 100;
    const riskColorClass = riskScore >= 80 ? 'bg-green-100 text-green-700' : riskScore >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

    return (
        <div className="flex flex-col lg:flex-row h-full min-h-screen gap-0 relative pb-20 lg:pb-0">
            
            {/* TOP BAR: STEPS & NAVIGATION (MOBILE ONLY) */}
            <div className="flex items-center justify-between px-2 pb-4 shrink-0 lg:absolute lg:top-0 lg:left-0 lg:w-full lg:z-10 lg:bg-slate-50 lg:hidden">
                <div className="flex items-center gap-2">
                    {[1, 2, 3].map(step => (
                        <button 
                            key={step}
                            onClick={() => setCurrentStep(step as 1|2|3)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${currentStep === step ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-500 border border-slate-200'}`}
                        >
                            {step}
                        </button>
                    ))}
                </div>
            </div>

            {/* MAIN CONTENT WRAPPER */}
            <div className="flex flex-col lg:flex-row flex-1 lg:overflow-hidden gap-6 w-full lg:h-[calc(100vh-100px)]">
                
                {/* COLUMN 1: SIDEBAR (COLLAPSIBLE) */}
                <div className={`transition-all duration-300 ease-in-out flex flex-col gap-4 relative ${isSidebarOpen ? 'w-full lg:w-64 opacity-100 h-auto lg:h-full min-h-0' : 'w-0 h-0 lg:h-full opacity-0 overflow-hidden lg:ml-[-1rem] hidden lg:flex'}`}>
                     <div className="flex justify-between items-center mb-1">
                        <button 
                            onClick={handleNewRfp}
                            className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-sm shrink-0 whitespace-nowrap overflow-hidden"
                        >
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            <span className="truncate">{t(lang, 'nav_new_project')}</span>
                        </button>
                        <button 
                            onClick={() => setIsSidebarOpen(false)}
                            className="ml-2 p-2 rounded-lg hover:bg-slate-200 text-slate-500 hidden lg:block"
                            title="Collapse Sidebar"
                        >
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                        </button>
                     </div>

                    <div className="bg-white rounded-xl border border-slate-200 flex-1 flex flex-col shadow-sm overflow-hidden min-h-[200px] lg:min-h-0">
                        <div className="flex border-b border-slate-100">
                            <button onClick={() => setActiveTab('active')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition ${activeTab === 'active' ? 'bg-white text-slate-900 border-b-2 border-slate-900' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{t(lang, 'nav_active')}</button>
                            <button onClick={() => setActiveTab('archived')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition ${activeTab === 'archived' ? 'bg-white text-slate-900 border-b-2 border-slate-900' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{t(lang, 'nav_archived')}</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {savedRfqs.filter(r => r && (activeTab === 'active' ? r.status !== 'archived' : r.status === 'archived')).length === 0 ? (
                                <div className="text-center text-slate-300 text-xs italic mt-10">No RFPs found</div>
                            ) : (
                                savedRfqs
                                    .filter(r => r && (activeTab === 'active' ? r.status !== 'archived' : r.status === 'archived'))
                                    .map(r => (
                                        <button 
                                            key={r.id}
                                            onClick={() => handleSelectRfq(r.id)}
                                            className={`w-full text-left p-3 rounded-lg text-sm transition group ${rfq?.id === r.id ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50 border border-transparent'}`}
                                        >
                                            <div className={`font-bold ${rfq?.id === r.id ? 'text-blue-900' : 'text-slate-700'}`}>{r.project_name || "Untitled"}</div>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">{r.line_items.length} items</span>
                                            </div>
                                        </button>
                                    ))
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: DRAFTING ASSISTANT */}
                <div className="flex-none lg:flex-1 flex flex-col w-full lg:w-[350px] lg:min-w-[300px] lg:max-w-[400px] gap-4 h-[500px] lg:h-auto min-h-0">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 flex items-center justify-center bg-slate-900 text-white rounded-full text-[10px] font-bold">1</span>
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{t(lang, 'drafting_assistant')}</span>
                            </div>
                            {!isSidebarOpen && (
                                <button 
                                    onClick={() => setIsSidebarOpen(true)}
                                    className="p-1 hover:bg-slate-200 rounded text-slate-500 hidden lg:block"
                                    title="Open Sidebar"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                                </button>
                            )}
                        </div>
                        <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto" ref={chatContainerRef}>
                            <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none border border-slate-100 text-sm text-slate-600">{t(lang, 'initial_greeting')}</div>
                            {chatHistory.map((msg, idx) => (
                                <div key={idx} className={`text-sm p-3 rounded-2xl max-w-[90%] shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-slate-900 text-white self-end rounded-tr-none' : 'bg-slate-50 text-slate-600 self-start rounded-tl-none border border-slate-100'}`}>
                                    {msg.content}
                                </div>
                            ))}
                            {isProcessing && <div className="bg-slate-50 text-slate-500 p-3 rounded-2xl rounded-tl-none border border-slate-100 self-start text-xs flex items-center gap-2">Thinking...</div>}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                            {attachedFiles.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2 animate-in fade-in">
                                    {attachedFiles.map((file, i) => (
                                        <div key={i} className="flex items-center gap-1 bg-white border border-slate-200 text-slate-600 text-[10px] px-2 py-1 rounded-full shadow-sm">
                                            <span className="truncate max-w-[120px]">{file.name}</span>
                                            <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">×</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={t(lang, 'chat_placeholder')} className="w-full h-24 rounded-xl border border-slate-300 p-3 text-sm focus:border-accent focus:ring-1 outline-none resize-none shadow-sm mb-2" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}} />
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                                    <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-accent flex items-center gap-1 text-xs font-medium px-2 py-1 rounded hover:bg-slate-100 transition">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                        {t(lang, 'upload_file')}
                                    </button>
                                </div>
                                <button onClick={handleSend} disabled={isProcessing || (!inputText && attachedFiles.length === 0)} className={`px-4 py-2 rounded-lg text-white text-xs font-bold transition shadow-sm flex items-center gap-1 ${isProcessing ? 'bg-slate-400' : 'bg-slate-700 hover:bg-slate-900'}`}>{isProcessing ? 'Processing...' : t(lang, 'send')}</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMN 3: CONTENT SWITCHER (Dashboard/Table/Comparison) */}
                <div className="flex-1 flex flex-col gap-4 overflow-visible lg:overflow-y-auto min-h-[500px] lg:min-h-0 relative">
                    
                    {/* LINK SHARE MODAL (VISUAL FALLBACK) */}
                    {generatedLink && (
                        <div className="absolute top-16 right-4 z-50 bg-white p-4 rounded-xl shadow-2xl border border-slate-200 max-w-sm animate-in slide-in-from-top-2">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase">Share with Supplier</span>
                                <button onClick={() => setGeneratedLink(null)} className="text-slate-400 hover:text-slate-600">×</button>
                            </div>
                            <input readOnly value={generatedLink} className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 mb-2 break-all text-slate-600" onClick={(e) => e.currentTarget.select()} />
                            <button onClick={() => { navigator.clipboard.writeText(generatedLink); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }} className="w-full bg-slate-900 text-white text-xs font-bold py-2 rounded hover:bg-slate-800 transition">
                                {linkCopied ? "Copied!" : "Copy to Clipboard"}
                            </button>
                        </div>
                    )}

                    {/* RISK MODAL */}
                    {showRiskModal && rfq?.risks && (
                        <div className="absolute inset-0 bg-white/95 z-50 p-6 flex flex-col animate-in fade-in zoom-in-95">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-900">Risk Analysis Report</h2>
                                <button onClick={() => setShowRiskModal(false)} className="text-slate-400 hover:text-slate-600">Close</button>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4">
                                {rfq.risks.map((risk, idx) => (
                                    <div key={idx} className={`p-4 rounded-xl border flex gap-4 ${risk.impact_level === 'High' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                                        <div className={`w-2 flex-shrink-0 rounded-full ${risk.impact_level === 'High' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className={`font-bold ${risk.impact_level === 'High' ? 'text-red-800' : 'text-amber-800'}`}>{risk.risk}</h3>
                                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">{risk.category}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 mb-3">{risk.recommendation}</p>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleMitigateRisk(risk, idx)} className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm">Fix Issue</button>
                                                <button onClick={() => handleIgnoreRisk(idx)} className="text-xs text-slate-400 hover:text-slate-600 px-2">Ignore</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {!rfq ? (
                        // STEP 1: EMPTY DASHBOARD
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center animate-in fade-in">
                            <h2 className="text-xl font-bold text-slate-900 mb-2">{t(lang, 'dashboard_title')}</h2>
                            <p className="text-slate-500 text-sm mb-10 text-center max-w-md">Select An Option To Begin Your Procurement Process.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                                <button onClick={() => document.querySelector('textarea')?.focus()} className="group p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-purple-50 hover:border-purple-100 transition-all flex flex-col items-center text-center gap-4 min-w-[200px]">
                                    <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">Natural Language</div>
                                        <div className="text-xs text-slate-500 mt-1">Type Requirements</div>
                                    </div>
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="group p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-green-50 hover:border-green-100 transition-all flex flex-col items-center text-center gap-4 min-w-[200px]">
                                    <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">Upload Spec/MTO</div>
                                        <div className="text-xs text-slate-500 mt-1">PDF, Excel, Images</div>
                                    </div>
                                </button>
                                <button onClick={handleLoadSample} className="group p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50 hover:border-blue-100 transition-all flex flex-col items-center text-center gap-4 min-w-[200px]">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">Load Sample Data</div>
                                        <div className="text-xs text-slate-500 mt-1">Try Pre-Loaded RFQ</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                            
                            {/* --- STEP 2: REVIEW & EDIT --- */}
                            {currentStep === 2 && (
                                <>
                                    {/* Toolbar / Header */}
                                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-4">
                                        <div className="flex justify-between items-start">
                                            <div onClick={() => setIsHeaderInfoOpen(!isHeaderInfoOpen)} className="cursor-pointer group">
                                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                                    {rfq.project_name || "Untitled Project"}
                                                    <svg className={`w-4 h-4 text-slate-400 transition transform ${isHeaderInfoOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                </h2>
                                                <p className="text-xs text-slate-500">Created: {new Date(rfq.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={handleAuditSpecs} disabled={isAuditing} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-blue-600 hover:border-blue-200 transition shadow-sm flex items-center gap-1">
                                                    {isAuditing ? 'Auditing...' : t(lang, 'audit_specs')}
                                                </button>
                                                <button onClick={handleRiskAnalysis} disabled={isRiskAnalyzing} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-amber-600 hover:border-amber-200 transition shadow-sm flex items-center gap-1">
                                                    {isRiskAnalyzing ? 'Analyzing...' : 'Analyze Risks'}
                                                </button>
                                                <button onClick={handleShare} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition shadow-sm flex items-center gap-1">
                                                    {t(lang, 'share_link')}
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Collapsible Header Info */}
                                        {isHeaderInfoOpen && (
                                            <div id="commercial-section" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 animate-in slide-in-from-top-2">
                                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Project Name</label>
                                                    <input 
                                                        className="w-full text-sm font-medium outline-none bg-transparent" 
                                                        value={rfq.project_name || ''} 
                                                        onChange={(e) => setRfq({...rfq, project_name: e.target.value})}
                                                    />
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">{t(lang, 'destination')}</label>
                                                    <input 
                                                        className="w-full text-sm font-medium outline-none bg-transparent" 
                                                        value={rfq.commercial.destination} 
                                                        onChange={(e) => setRfq({...rfq, commercial: {...rfq.commercial, destination: e.target.value}})}
                                                    />
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">{t(lang, 'incoterm')}</label>
                                                    <input 
                                                        className="w-full text-sm font-medium outline-none bg-transparent" 
                                                        value={rfq.commercial.incoterm} 
                                                        onChange={(e) => setRfq({...rfq, commercial: {...rfq.commercial, incoterm: e.target.value}})}
                                                    />
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">{t(lang, 'payment')}</label>
                                                    <input 
                                                        className="w-full text-sm font-medium outline-none bg-transparent" 
                                                        value={rfq.commercial.paymentTerm} 
                                                        onChange={(e) => setRfq({...rfq, commercial: {...rfq.commercial, paymentTerm: e.target.value}})}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Main Table */}
                                    <div className="flex-1 overflow-auto relative">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                <tr>
                                                    <th className="p-3 border-b border-r border-slate-200 w-10 text-center">#</th>
                                                    {tableConfig.filter(c => c.visible).map(col => (
                                                        <th key={col.id} className="p-3 border-b border-r border-slate-200 last:border-r-0 min-w-[100px] whitespace-nowrap">
                                                            {col.label}
                                                        </th>
                                                    ))}
                                                    <th className="p-3 border-b border-slate-200 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-sm divide-y divide-slate-100">
                                                {rfq.line_items.map((item, idx) => (
                                                    <tr key={item.item_id} className="group hover:bg-slate-50/80 transition-colors">
                                                        <td className="p-2 border-r border-slate-100 text-center text-slate-400 font-mono text-xs">{item.line}</td>
                                                        {tableConfig.filter(c => c.visible).map(col => (
                                                            <td key={col.id} className="p-0 border-r border-slate-100 last:border-r-0 relative">
                                                                {col.id === 'size' ? (
                                                                    <div className="flex items-center h-full px-3 py-2 text-slate-600 font-mono text-xs bg-slate-50/30">
                                                                        {renderSize(item)}
                                                                    </div>
                                                                ) : (
                                                                    <input 
                                                                        id={`cell-${col.id}-${idx}`}
                                                                        className="w-full h-full px-3 py-2 bg-transparent outline-none focus:bg-blue-50 focus:ring-inset focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700 placeholder-slate-300"
                                                                        value={(item as any)[col.id] || ''}
                                                                        onChange={(e) => handleUpdateLineItem(idx, col.id as keyof LineItem, e.target.value)}
                                                                        onKeyDown={(e) => handleKeyDown(e, col.id, idx)}
                                                                        placeholder="-"
                                                                    />
                                                                )}
                                                            </td>
                                                        ))}
                                                        <td className="p-2 text-center">
                                                            <button onClick={() => handleDeleteItem(idx)} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all">
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        
                                        {/* Empty State / Add Button */}
                                        <button onClick={handleAddItem} className="w-full p-3 text-slate-400 text-xs font-bold uppercase tracking-wide hover:bg-slate-50 hover:text-slate-600 transition border-t border-slate-100 flex items-center justify-center gap-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            {t(lang, 'add_line_item')}
                                        </button>
                                    </div>
                                    
                                    {/* Bottom Bar: Switch to Compare */}
                                    {quotes.length > 0 && (
                                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center animate-in slide-in-from-bottom-2">
                                            <div className="text-sm font-medium text-slate-600">
                                                <span className="font-bold text-slate-900">{quotes.length}</span> Quotes Received
                                            </div>
                                            <button 
                                                onClick={() => setCurrentStep(3)}
                                                className="bg-brandOrange text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-orange-600 transition flex items-center gap-2"
                                            >
                                                Compare Quotes →
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* --- STEP 3: COMPARE --- */}
                            {currentStep === 3 && (
                                <>
                                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                        <h2 className="text-lg font-bold text-slate-900">Bid Evaluation</h2>
                                        <button onClick={() => setCurrentStep(2)} className="text-sm font-medium text-slate-500 hover:text-slate-900">
                                            ← Back to Editor
                                        </button>
                                    </div>
                                    
                                    <div className="flex-1 overflow-auto p-6">
                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                            {quotes.map((quote) => {
                                                const isBestPrice = quote.total === Math.min(...quotes.map(q => q.total));
                                                return (
                                                    <div key={quote.id} className={`bg-white rounded-xl border p-6 relative group hover:shadow-lg transition-all ${isBestPrice ? 'border-green-200 ring-1 ring-green-100' : 'border-slate-200'}`}>
                                                        {isBestPrice && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-sm">Best Price</div>}
                                                        
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <h3 className="font-bold text-slate-900 text-lg">{quote.supplierName}</h3>
                                                                <div className="text-xs text-slate-500">{new Date(quote.timestamp).toLocaleDateString()}</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className={`text-2xl font-bold ${isBestPrice ? 'text-green-600' : 'text-slate-900'}`}>
                                                                    {quote.currency} {quote.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                </div>
                                                                <div className="text-xs text-slate-400">Total</div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="space-y-2 text-sm text-slate-600 mb-6">
                                                            <div className="flex justify-between border-b border-slate-50 pb-1">
                                                                <span>Lead Time</span>
                                                                <span className="font-medium">{quote.leadTime || '-'} Days</span>
                                                            </div>
                                                            <div className="flex justify-between border-b border-slate-50 pb-1">
                                                                <span>Payment</span>
                                                                <span className="font-medium">{quote.payment || '-'}</span>
                                                            </div>
                                                            <div className="flex justify-between border-b border-slate-50 pb-1">
                                                                <span>Validity</span>
                                                                <span className="font-medium">{quote.validity || '-'}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleGenerateAwardPO(quote)} className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition">Award PO</button>
                                                            <button className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-400">
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {/* Comparison Table */}
                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                                                        <tr>
                                                            <th className="p-4 w-12 bg-slate-50 sticky left-0 z-10">Line</th>
                                                            <th className="p-4 bg-slate-50 sticky left-12 z-10 min-w-[200px]">Description</th>
                                                            {quotes.map((q, i) => (
                                                                <th key={q.id} className="p-4 text-right min-w-[120px] border-l border-slate-100">
                                                                    {q.supplierName}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {rfq.line_items.map((item) => (
                                                            <tr key={item.item_id} className="hover:bg-slate-50">
                                                                <td className="p-4 font-mono text-slate-400 text-xs bg-white sticky left-0 z-10 border-r border-slate-100">{item.line}</td>
                                                                <td className="p-4 font-medium text-slate-700 bg-white sticky left-12 z-10 border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                                    <div className="line-clamp-2">{item.description}</div>
                                                                    <div className="text-xs text-slate-400 font-normal mt-1">{item.quantity} {item.uom}</div>
                                                                </td>
                                                                {quotes.map((q) => {
                                                                    const qItem = q.items.find(qi => qi.line === item.line);
                                                                    const isLowest = qItem && quotes.every(otherQ => {
                                                                        const otherItem = otherQ.items.find(i => i.line === item.line);
                                                                        return !otherItem || (qItem.unitPrice || 0) <= (otherItem.unitPrice || 0);
                                                                    });

                                                                    return (
                                                                        <td key={q.id} className={`p-4 text-right border-l border-slate-100 font-mono ${isLowest ? 'bg-green-50/30' : ''}`}>
                                                                            {qItem ? (
                                                                                <>
                                                                                    <div className={`font-bold ${isLowest ? 'text-green-700' : 'text-slate-700'}`}>
                                                                                        {Number(qItem.unitPrice).toFixed(2)}
                                                                                    </div>
                                                                                    {qItem.alternates && (
                                                                                        <div className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded inline-block mt-1 max-w-[100px] truncate" title={qItem.alternates}>
                                                                                            Note: {qItem.alternates}
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            ) : (
                                                                                <span className="text-slate-300">-</span>
                                                                            )}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                         </div>
                    )}
                 </div>
            </div>
        </div>
    );
}
