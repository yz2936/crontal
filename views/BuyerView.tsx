
import React, { useState, useRef, useEffect } from 'react';
import { Rfq, Quote, Language, ColumnConfig, LineItem, FileAttachment, ChatMessage } from '../types';
import { parseRequest, analyzeRfqRisks, RiskAnalysisItem } from '../services/geminiService';
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

    // UI State
    const [isHeaderInfoOpen, setIsHeaderInfoOpen] = useState(true); 
    const prevItemCount = useRef(0);

    // Load drafts on mount
    useEffect(() => {
        setSavedRfqs(storageService.getRfqs());
    }, [rfq]); 

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
                const el = document.getElementById(`cell-shape-${newIndex}`);
                if (el) (el as HTMLInputElement).focus();
            }, 100); 
        }
        prevItemCount.current = rfq ? rfq.line_items.length : 0;
    }, [rfq?.line_items.length]);

    // Default Table Configuration
    const [tableConfig, setTableConfig] = useState<ColumnConfig[]>([
        { id: 'line', label: t(lang, 'line'), visible: true, width: 'sm' },
        { id: 'shape', label: t(lang, 'shape'), visible: true, width: 'md' },
        { id: 'description', label: t(lang, 'description'), visible: true, width: 'lg' },
        { id: 'grade', label: t(lang, 'grade'), visible: true, width: 'md' },
        { id: 'tolerance', label: t(lang, 'tolerance'), visible: true, width: 'sm' },
        { id: 'tests', label: t(lang, 'tests'), visible: true, width: 'sm' },
        { id: 'od', label: t(lang, 'od'), visible: true, width: 'sm' },
        { id: 'wt', label: t(lang, 'wt'), visible: true, width: 'sm' },
        { id: 'length', label: t(lang, 'length'), visible: true, width: 'sm' },
        { id: 'qty', label: t(lang, 'qty'), visible: true, width: 'sm' },
        { id: 'uom', label: t(lang, 'uom'), visible: true, width: 'sm' },
    ]);

    const getWidthClass = (width: 'sm' | 'md' | 'lg') => {
        switch (width) {
            case 'sm': return 'w-24 min-w-[6rem]';
            case 'md': return 'w-32 min-w-[8rem]';
            case 'lg': return 'w-64 min-w-[16rem]';
            default: return 'w-32';
        }
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
            
            let newItemCount = 0;

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
                newItemCount = result.rfqUpdates.line_items ? result.rfqUpdates.line_items.length : 0;
            } else {
                newItemCount = result.rfqUpdates.line_items ? result.rfqUpdates.line_items.length : 0;
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
            // Save to RFQ object so it persists
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
        
        // Remove from list as we are addressing it
        handleIgnoreRisk(index);

        // Simple routing logic based on category
        if (item.category === 'Commercial') {
            setIsHeaderInfoOpen(true);
            setTimeout(() => {
                 document.getElementById('commercial-section')?.scrollIntoView({ behavior: 'smooth' });
                 // Try to focus specific fields based on keywords
                 if (item.risk.toLowerCase().includes('payment')) document.querySelector<HTMLInputElement>('input[value="' + (rfq?.commercial.paymentTerm || '') + '"]')?.focus();
                 if (item.risk.toLowerCase().includes('incoterm')) document.querySelector<HTMLInputElement>('input[value="' + (rfq?.commercial.incoterm || '') + '"]')?.focus();
                 if (item.risk.toLowerCase().includes('destination')) document.querySelector<HTMLInputElement>('input[value="' + (rfq?.commercial.destination || '') + '"]')?.focus();
            }, 300);
        } else if (item.category === 'Strategic') {
            setIsHeaderInfoOpen(true);
             setTimeout(() => {
                 document.querySelector<HTMLTextAreaElement>('textarea[placeholder="Provide context for suppliers..."]')?.focus();
            }, 300);
        } else {
            // Technical -> Table
            // Try to find line number in text "Line X", "Item X" etc
            const match = item.risk.match(/(?:Line|Item)\s+(\d+)/i);
            if (match && match[1]) {
                 const lineIdx = parseInt(match[1]) - 1;
                 setTimeout(() => {
                     const row = document.getElementById(`cell-description-${lineIdx}`);
                     if (row) {
                         row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                         row.focus();
                         // Highlight effect
                         row.classList.add('ring-2', 'ring-accent', 'ring-offset-2');
                         setTimeout(() => row.classList.remove('ring-2', 'ring-accent', 'ring-offset-2'), 2000);
                     }
                 }, 300);
            } else {
                // Focus first item description
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
                    quantity: 500, uom: 'm', other_requirements: []
                },
                {
                    item_id: "L2", line: 2, raw_description: "", description: "Weld Neck Flange, Class 150", product_type: "Flange", material_grade: "ASTM A105",
                    size: { outer_diameter: { value: 168.3, unit: 'mm' }, wall_thickness: { value: null, unit: null }, length: { value: null, unit: null } },
                    quantity: 20, uom: 'pcs', other_requirements: []
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

    const handleSaveRfq = () => {
        if (!rfq) return;
        storageService.saveRfq(rfq);
        setSavedRfqs(storageService.getRfqs());
        alert(t(lang, 'save_success'));
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

    const handleUpdateDimension = (index: number, dim: 'outer_diameter' | 'wall_thickness' | 'length', field: 'value' | 'unit', value: any) => {
        if (!rfq) return;
        const newItems = [...rfq.line_items];
        newItems[index] = { 
            ...newItems[index], 
            size: {
                ...newItems[index].size,
                [dim]: { ...newItems[index].size[dim], [field]: value }
            }
        };
        setRfq({ ...rfq, line_items: newItems });
    };

    const handleUpdateCustomField = (index: number, key: string, value: string) => {
        if (!rfq) return;
        const newItems = [...rfq.line_items];
        const item = newItems[index];
        newItems[index] = {
            ...item,
            custom_fields: { ...(item.custom_fields || {}), [key]: value }
        };
        setRfq({ ...rfq, line_items: newItems });
    };

    const handleDeleteItem = (index: number) => {
        if (!rfq) return;
        const newItems = rfq.line_items.filter((_, i) => i !== index);
        const reindexed = newItems.map((item, idx) => ({ ...item, line: idx + 1 }));
        setRfq({ ...rfq, line_items: reindexed });
    };

    const handleShare = () => {
        if (!rfq) return;
        const shareId = Date.now().toString();
        const jsonStr = JSON.stringify({ ...rfq, share_id: shareId });
        const compressed = LZString.compressToEncodedURIComponent(jsonStr);
        const baseUrl = window.location.href.split('?')[0];
        const url = `${baseUrl}?mode=supplier&data=${compressed}`;
        
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(url)
                .then(() => alert(t(lang, 'link_copied')))
                .catch(() => prompt("Copy this link:", url));
        } else {
            prompt("Copy this link:", url);
        }
    };

    const handleGenerateAwardPO = (winningQuote: Quote) => {
        if (!rfq) return;
        const doc = new jsPDF();
        
        // --- Header ---
        doc.setFontSize(22);
        doc.setFont("times", "bold");
        doc.text("PURCHASE ORDER", 14, 20);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const poNum = `PO-${rfq.id.replace('RFQ-', '')}`;
        doc.text(`Order Number: ${poNum}`, 140, 18);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 23);
        doc.text(`Page 1 of 1`, 140, 28);

        // Logo / Brand
        doc.setFillColor(11, 17, 33); // Navy
        doc.roundedRect(14, 25, 30, 10, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text("CRONTAL", 16, 31.5);
        doc.setTextColor(0, 0, 0);

        // --- Address Blocks ---
        const startY = 45;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("VENDOR:", 14, startY);
        doc.setFont("helvetica", "normal");
        doc.text(winningQuote.supplierName, 14, startY + 5);
        doc.text(winningQuote.email || "Email: N/A", 14, startY + 10);
        
        doc.setFont("helvetica", "bold");
        doc.text("DELIVERY TO:", 110, startY);
        doc.setFont("helvetica", "normal");
        doc.text(rfq.commercial.destination || "See Below", 110, startY + 5);
        doc.text("INDUSTRIAL PROCUREMENT CORP", 110, startY + 10);
        
        doc.setFont("helvetica", "bold");
        doc.text("Project Ref:", 14, startY + 25);
        doc.setFont("helvetica", "normal");
        doc.text(rfq.project_name || "N/A", 35, startY + 25);

        // --- Line Items Table with Pricing ---
        const tableBody = rfq.line_items.map(item => {
            const quoteItem = winningQuote.items.find(qi => qi.line === item.line);
            const unitPrice = quoteItem?.unitPrice || 0;
            const lineTotal = (quoteItem?.unitPrice || 0) * (item.quantity || 0);
            
            return [
                `${item.description} \n${item.product_type || ''} ${item.material_grade || ''}`,
                item.size.outer_diameter.value?.toString() || '-',
                item.size.wall_thickness.value?.toString() || '-',
                item.size.length.value?.toString() || '-',
                item.quantity?.toString() || '0',
                item.uom || 'pcs',
                `${winningQuote.currency} ${unitPrice.toFixed(2)}`,
                `${winningQuote.currency} ${lineTotal.toFixed(2)}`
            ];
        });

        autoTable(doc, {
            startY: startY + 30,
            head: [['Description', 'OD', 'WT', 'L', 'Qty', 'UOM', 'Unit Price', 'Amount']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
            styles: { fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1, valign: 'middle' },
            columnStyles: {
                4: { halign: 'right' },
                6: { halign: 'right' },
                7: { halign: 'right', fontStyle: 'bold' }
            }
        });

        // --- Totals ---
        // @ts-ignore
        let finalY = doc.lastAutoTable.finalY + 5;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL:", 140, finalY + 5);
        doc.text(`${winningQuote.currency} ${winningQuote.total.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 170, finalY + 5, { align: 'right' });

        // --- Footer Terms ---
        finalY += 15;
        doc.setFontSize(9);
        
        const terms = [
            `Delivery Condition: Standard Export Packing`,
            `Payment: ${winningQuote.payment || rfq.commercial.paymentTerm || "Net 30 Days"}`,
            `Lead Time: ${winningQuote.leadTime || "TBD"} Days`,
            `Incoterm: ${rfq.commercial.incoterm || "Ex Works"}`,
            `Documents: Comm. Invoice, Packing List, MTC 3.1`
        ];

        terms.forEach((term, i) => {
            doc.text(term, 14, finalY + (i * 5));
        });

        // Signature
        finalY += 30;
        doc.setLineWidth(0.5);
        doc.line(120, finalY, 190, finalY);
        doc.setFontSize(8);
        doc.text("AUTHORIZED SIGNATURE", 120, finalY + 5);
        
        doc.save(`PO_${rfq.id}_${winningQuote.supplierName.replace(/\s+/g, '_')}.pdf`);
    };

    // Helper for generating Generic PDF (No prices)
    const handleGenerateGenericPO = () => {
       if (!rfq) return;
        const doc = new jsPDF();
        doc.setFontSize(22); doc.setFont("times", "bold"); doc.text("REQUEST FOR QUOTATION", 14, 20);
        
        doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`RFQ Number: ${rfq.id}`, 140, 18);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 23);

        const startY = 40;
        doc.text(`Project: ${rfq.project_name || "N/A"}`, 14, startY);
        doc.text(`Destination: ${rfq.commercial.destination || "N/A"}`, 14, startY + 5);

        const tableBody = rfq.line_items.map(item => [
            `${item.description} ${item.product_type} ${item.material_grade}`,
            item.size.outer_diameter.value ? `${item.size.outer_diameter.value} ${item.size.outer_diameter.unit}` : '-',
            item.size.wall_thickness.value ? `${item.size.wall_thickness.value} ${item.size.wall_thickness.unit}` : '-',
            item.quantity,
            item.uom
        ]);

        autoTable(doc, {
            startY: startY + 15,
            head: [['Description', 'OD', 'WT', 'Qty', 'UOM']],
            body: tableBody,
        });
        
        doc.save(`RFQ_${rfq.id}.pdf`);
    };

    // Derived Risk Score
    const riskScore = rfq?.risks ? calculateRiskScore(rfq.risks) : 100;
    const riskColorClass = riskScore >= 80 ? 'bg-green-100 text-green-700' : riskScore >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

    return (
        // Mobile-first container: Flex column on mobile, Flex row on desktop
        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-100px)] gap-0 overflow-visible lg:overflow-hidden relative">
            
            {/* TOP BAR: STEPS & NAVIGATION */}
            <div className="flex items-center justify-between px-2 pb-4 shrink-0 lg:absolute lg:top-0 lg:left-0 lg:w-full lg:z-10 lg:bg-slate-50 lg:hidden">
                <div className="flex items-center gap-4">
                    {/* Flow Steps */}
                    <div className="flex items-center gap-2">
                        {/* Step 1 */}
                        <button 
                            onClick={() => setCurrentStep(1)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition ${currentStep === 1 ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${currentStep === 1 ? 'bg-brandOrange' : 'bg-slate-100'}`}>1</span>
                            <span>{t(lang, 'step1_short')}</span>
                        </button>
                        
                        <div className="w-4 flex justify-center text-slate-300">›</div>
                        
                        {/* Step 2 */}
                        <button 
                            onClick={() => setCurrentStep(2)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition ${currentStep === 2 ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${currentStep === 2 ? 'bg-brandOrange' : 'bg-slate-100'}`}>2</span>
                            <span>{t(lang, 'step2_short')}</span>
                        </button>

                        <div className="w-4 flex justify-center text-slate-300">›</div>

                        {/* Step 3 */}
                        <button 
                            onClick={() => setCurrentStep(3)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition ${currentStep === 3 ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                        >
                            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${currentStep === 3 ? 'bg-brandOrange' : 'bg-slate-100'}`}>3</span>
                            <span>{t(lang, 'step3_short')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT WRAPPER */}
            <div className="flex flex-col lg:flex-row flex-1 lg:overflow-hidden gap-6 w-full">
                
                {/* COLUMN 1: SIDEBAR (COLLAPSIBLE) */}
                <div className={`transition-all duration-300 ease-in-out flex flex-col gap-4 ${isSidebarOpen ? 'w-full lg:w-64 opacity-100 h-auto lg:h-full' : 'w-0 h-0 lg:h-full opacity-0 overflow-hidden lg:ml-[-1rem] hidden lg:flex'}`}>
                    <button 
                        onClick={handleNewRfp}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-sm shrink-0"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        {t(lang, 'nav_new_project')}
                    </button>

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

                {/* COLUMN 2: DRAFTING ASSISTANT (Mobile: Stacked, Desktop: Side Column) */}
                <div className="flex-none lg:flex-1 flex flex-col w-full lg:w-[350px] lg:min-w-[300px] lg:max-w-[400px] gap-4 h-[500px] lg:h-auto">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                            <span className="w-5 h-5 flex items-center justify-center bg-slate-900 text-white rounded-full text-[10px] font-bold">1</span>
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{t(lang, 'drafting_assistant')}</span>
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
                <div className="flex-1 flex flex-col gap-4 overflow-visible lg:overflow-hidden min-h-[500px]">
                    
                    {!rfq ? (
                        // EMPTY DASHBOARD
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center animate-in fade-in">
                            <h2 className="text-xl font-bold text-slate-900 mb-2">{t(lang, 'dashboard_title')}</h2>
                            <p className="text-slate-500 text-sm mb-10 text-center max-w-md">Select An Option To Begin Your Procurement Process.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                                {/* Option 1: Natural Language */}
                                <button onClick={() => document.querySelector('textarea')?.focus()} className="group p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-purple-50 hover:border-purple-100 transition-all flex flex-col items-center text-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">Describe In Natural Language</div>
                                        <div className="text-xs text-slate-500 mt-1">Type Requirements And Let AI Structure It</div>
                                    </div>
                                </button>

                                {/* Option 2: Upload */}
                                <button onClick={() => fileInputRef.current?.click()} className="group p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-green-50 hover:border-green-100 transition-all flex flex-col items-center text-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">Upload Documentation</div>
                                        <div className="text-xs text-slate-500 mt-1">Parse PDF Drawings, Excel, Or MTOs</div>
                                    </div>
                                </button>

                                {/* Option 3: Manual */}
                                <button onClick={handleAddItem} className="group p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-orange-50 hover:border-orange-100 transition-all flex flex-col items-center text-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">Add Items Manually</div>
                                        <div className="text-xs text-slate-500 mt-1">Create Your List Line-By-Line</div>
                                    </div>
                                </button>
                            </div>

                            {/* Footer Link for Sample Data */}
                            <button onClick={handleLoadSample} className="mt-8 text-xs text-slate-400 hover:text-slate-600 underline">
                                {t(lang, 'load_sample')}
                            </button>
                        </div>
                    ) : (
                        // CONTENT SWITCH
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-in fade-in relative min-h-[500px]">
                            
                            {/* --- QUOTE DETAILS MODAL (OVERLAY) --- */}
                            {viewQuoteDetails && (
                                <div className="absolute inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-bottom-4">
                                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setViewQuoteDetails(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold flex items-center gap-1">
                                                ← Back
                                            </button>
                                            <div className="h-4 w-px bg-slate-300"></div>
                                            <h3 className="font-bold text-slate-800">{viewQuoteDetails.supplierName} - Quote Details</h3>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleGenerateAwardPO(viewQuoteDetails)}
                                                className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700"
                                            >
                                                Award & Generate PO
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-auto p-6">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                                            <div className="p-3 bg-slate-50 rounded border border-slate-100">
                                                <div className="text-xs text-slate-500">Total Price</div>
                                                <div className="font-bold text-lg">{viewQuoteDetails.currency} {viewQuoteDetails.total.toLocaleString()}</div>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded border border-slate-100">
                                                <div className="text-xs text-slate-500">Lead Time</div>
                                                <div className="font-bold">{viewQuoteDetails.leadTime} Days</div>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded border border-slate-100">
                                                <div className="text-xs text-slate-500">Payment</div>
                                                <div className="font-bold">{viewQuoteDetails.payment}</div>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded border border-slate-100">
                                                <div className="text-xs text-slate-500">Validity</div>
                                                <div className="font-bold">{viewQuoteDetails.validity}</div>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left border-collapse mb-6 min-w-[600px]">
                                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-4 py-2 w-12">Line</th>
                                                        <th className="px-4 py-2">RFQ Description</th>
                                                        <th className="px-4 py-2">Supplier Remarks / Alternates</th>
                                                        <th className="px-4 py-2 text-right">Qty</th>
                                                        <th className="px-4 py-2 text-right">Unit Price</th>
                                                        <th className="px-4 py-2 text-right">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {rfq.line_items.map(item => {
                                                        const qItem = viewQuoteDetails.items.find(i => i.line === item.line);
                                                        return (
                                                            <tr key={item.item_id}>
                                                                <td className="px-4 py-2 text-slate-400">{item.line}</td>
                                                                <td className="px-4 py-2 font-medium">{item.description}</td>
                                                                <td className="px-4 py-2 text-blue-600 italic">{qItem?.alternates || "-"}</td>
                                                                <td className="px-4 py-2 text-right">{item.quantity} {item.uom}</td>
                                                                <td className="px-4 py-2 text-right">{viewQuoteDetails.currency} {qItem?.unitPrice?.toFixed(2)}</td>
                                                                <td className="px-4 py-2 text-right font-bold">{viewQuoteDetails.currency} {(qItem?.lineTotal || 0).toFixed(2)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {viewQuoteDetails.attachments && viewQuoteDetails.attachments.length > 0 && (
                                            <div className="mt-4 border-t border-slate-200 pt-4">
                                                <h4 className="font-bold text-sm mb-2">Attachments</h4>
                                                <div className="flex gap-2">
                                                    {viewQuoteDetails.attachments.map((file, i) => (
                                                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs">
                                                            <span className="text-slate-500 font-bold">PDF</span>
                                                            <span className="truncate max-w-[150px]">{file.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 ? (
                                // --- COMPARISON VIEW (STEP 3) - COMPACT SUMMARY TABLE ---
                                <div className="flex flex-col h-full">
                                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center shrink-0">
                                        <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 flex items-center justify-center bg-brandOrange text-white rounded-full text-[10px] font-bold">3</span>
                                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{t(lang, 'received_quotes')}</span>
                                        </div>
                                    </div>
                                    
                                    {quotes.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-2xl">📭</div>
                                            <p className="text-sm">No Quotes Received Yet.</p>
                                            <p className="text-xs mt-2">Share The Link With Suppliers To Get Started.</p>
                                            <button onClick={handleShare} className="mt-6 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">{t(lang, 'share_link')}</button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-auto bg-white p-6">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm border-collapse rounded-lg overflow-hidden min-w-[700px]">
                                                    <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                                                        <tr>
                                                            <th className="px-6 py-4 border-b border-slate-200">Supplier</th>
                                                            <th className="px-6 py-4 border-b border-slate-200">Total Price</th>
                                                            <th className="px-6 py-4 border-b border-slate-200">Lead Time</th>
                                                            <th className="px-6 py-4 border-b border-slate-200">Compliance Check</th>
                                                            <th className="px-6 py-4 border-b border-slate-200 text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {quotes.map((quote) => {
                                                            const isBestPrice = quote.total === Math.min(...quotes.map(q => q.total));
                                                            const isFastest = parseInt(quote.leadTime) === Math.min(...quotes.map(q => parseInt(q.leadTime) || 999));
                                                            // Simulate compliance logic: If MTRs required, check if attachments exist
                                                            const complianceStatus = rfq.commercial.req_mtr ? (quote.attachments && quote.attachments.length > 0 ? "Pass" : "Pending Docs") : "N/A";
                                                            const complianceColor = complianceStatus === "Pass" ? "bg-green-100 text-green-700" : complianceStatus === "Pending Docs" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500";

                                                            return (
                                                                <tr key={quote.id} className="hover:bg-slate-50 transition group">
                                                                    <td className="px-6 py-4">
                                                                        <div className="font-bold text-slate-900">{quote.supplierName}</div>
                                                                        <div className="text-xs text-slate-400">{new Date(quote.timestamp).toLocaleDateString()}</div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="font-bold text-slate-900 flex items-center gap-2">
                                                                            {quote.currency} {quote.total.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                                            {isBestPrice && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold uppercase">Best</span>}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-2">
                                                                            {quote.leadTime} Days
                                                                            {isFastest && !isBestPrice && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">Fastest</span>}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${complianceColor}`}>
                                                                            {complianceStatus}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right flex justify-end gap-3">
                                                                        <button 
                                                                            onClick={() => setViewQuoteDetails(quote)}
                                                                            className="text-slate-500 hover:text-slate-800 text-xs font-bold px-3 py-1.5 rounded hover:bg-slate-200 transition"
                                                                        >
                                                                            View Details
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleGenerateAwardPO(quote)}
                                                                            className="bg-slate-900 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-slate-700 transition shadow-sm"
                                                                        >
                                                                            Award
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // --- REVIEW TABLE (STEP 1 & 2) ---
                                <div className="flex flex-col h-full relative">
                                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-3">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                            <div className="flex items-center gap-2 w-full md:w-auto">
                                                <span className="w-5 h-5 flex items-center justify-center bg-slate-900 text-white rounded-full text-[10px] font-bold shrink-0">2</span>
                                                <div className="flex items-center gap-3 w-full">
                                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide whitespace-nowrap">{t(lang, 'live_preview')}</span>
                                                    <div className="h-4 w-px bg-slate-300"></div>
                                                    <input 
                                                        value={rfq.project_name || ''}
                                                        onChange={(e) => setRfq({ ...rfq, project_name: e.target.value })}
                                                        className="font-bold text-sm text-slate-800 bg-transparent border-none p-0 focus:ring-0 placeholder-slate-300 w-full md:w-48 focus:border-b focus:border-accent"
                                                        placeholder="Untitled RFP"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                                                {/* NEW: RISK ANALYSIS BUTTON WITH SCORE */}
                                                <div className="flex items-center gap-2">
                                                    {rfq?.risks && rfq.risks.length > 0 && (
                                                        <div className={`px-2 py-1 rounded text-[10px] font-bold border ${riskColorClass} flex items-center gap-1`}>
                                                            <span>Risk Score:</span>
                                                            <span>{riskScore}</span>
                                                        </div>
                                                    )}
                                                    <button 
                                                        onClick={handleRiskAnalysis}
                                                        disabled={isRiskAnalyzing}
                                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition shadow-sm flex items-center gap-2 whitespace-nowrap ${isRiskAnalyzing ? 'bg-indigo-50 border-indigo-100 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300'}`}
                                                    >
                                                        {isRiskAnalyzing ? (
                                                            <>
                                                                <span className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></span>
                                                                Analyzing...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                                                {rfq?.risks && rfq.risks.length > 0 ? "View Risks" : "Analyze Risks"}
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                <button 
                                                    onClick={() => setIsHeaderInfoOpen(!isHeaderInfoOpen)}
                                                    className={`text-xs px-3 py-1.5 rounded-lg border transition whitespace-nowrap ${isHeaderInfoOpen ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                                >
                                                    {isHeaderInfoOpen ? t(lang, 'hide_details') : t(lang, 'rfp_details')}
                                                </button>
                                                <button onClick={handleAddItem} className="text-xs bg-brandOrange text-white font-bold px-4 py-1.5 rounded-lg hover:bg-orange-600 transition shadow-sm flex items-center gap-1 whitespace-nowrap">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                    {t(lang, 'add_line_item')}
                                                </button>
                                                <button onClick={handleGenerateGenericPO} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition" title={t(lang, 'generate_po_pdf')}>
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                </button>
                                            </div>
                                        </div>

                                        {/* EXPANDABLE RFP DETAILS PANEL */}
                                        {isHeaderInfoOpen && (
                                            <div id="commercial-section" className="bg-white border border-slate-200 rounded-lg p-4 animate-in slide-in-from-top-2 text-xs shadow-sm">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                    <div>
                                                        <label className="block text-slate-500 font-semibold mb-1">{t(lang, 'project_description')}</label>
                                                        <textarea 
                                                            className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-accent outline-none text-slate-700"
                                                            rows={3}
                                                            value={rfq.project_description || ''}
                                                            onChange={(e) => setRfq({ ...rfq, project_description: e.target.value })}
                                                            placeholder="Provide context for suppliers..."
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-slate-500 font-semibold mb-1">{t(lang, 'destination')}</label>
                                                            <input className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-accent outline-none text-slate-700" value={rfq.commercial.destination || ''} onChange={(e) => setRfq({ ...rfq, commercial: { ...rfq.commercial, destination: e.target.value } })} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-slate-500 font-semibold mb-1">{t(lang, 'incoterm')}</label>
                                                            <input className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-accent outline-none text-slate-700" value={rfq.commercial.incoterm || ''} onChange={(e) => setRfq({ ...rfq, commercial: { ...rfq.commercial, incoterm: e.target.value } })} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-slate-500 font-semibold mb-1">{t(lang, 'payment_terms')}</label>
                                                            <input className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-accent outline-none text-slate-700" value={rfq.commercial.paymentTerm || ''} onChange={(e) => setRfq({ ...rfq, commercial: { ...rfq.commercial, paymentTerm: e.target.value } })} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-slate-500 font-semibold mb-1">Warranty</label>
                                                            <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-accent outline-none text-slate-700" value={rfq.commercial.warranty_months || 12} onChange={(e) => setRfq({ ...rfq, commercial: { ...rfq.commercial, warranty_months: parseInt(e.target.value) } })} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-3">
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={rfq.commercial.req_mtr} onChange={(e) => setRfq({ ...rfq, commercial: { ...rfq.commercial, req_mtr: e.target.checked } })} className="rounded text-accent focus:ring-accent" /><span className="text-slate-600">{t(lang, 'req_mtr')}</span></label>
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={rfq.commercial.req_avl} onChange={(e) => setRfq({ ...rfq, commercial: { ...rfq.commercial, req_avl: e.target.checked } })} className="rounded text-accent focus:ring-accent" /><span className="text-slate-600">{t(lang, 'req_avl')}</span></label>
                                                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={rfq.commercial.req_tpi} onChange={(e) => setRfq({ ...rfq, commercial: { ...rfq.commercial, req_tpi: e.target.checked } })} className="rounded text-accent focus:ring-accent" /><span className="text-slate-600">{t(lang, 'req_tpi')}</span></label>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* TABLE */}
                                    <div className="flex-1 overflow-auto">
                                        <div className="overflow-x-auto min-h-[300px]">
                                            <table className="w-full text-xs text-left border-collapse table-fixed min-w-[1000px]">
                                                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                                                    <tr>
                                                        {tableConfig.filter(c => c.visible).map((col) => (
                                                            <th key={col.id} className={`px-2 py-3 border-b border-slate-200 bg-slate-50 border-r border-slate-200 text-center ${getWidthClass(col.width)}`}>{col.label}</th>
                                                        ))}
                                                        <th className="px-2 py-3 text-center w-12 bg-white border-b border-slate-200 sticky right-0 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)] border-l border-slate-200 z-30"><span className="sr-only">Actions</span></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-200 bg-white">
                                                    {rfq.line_items.map((item, index) => (
                                                        <tr key={item.item_id} className="hover:bg-blue-50/10 transition-colors group">
                                                            {tableConfig.filter(c => c.visible).map(col => {
                                                                const cellClass = "px-2 py-2 border-r border-slate-200 align-middle";
                                                                const inputClass = "w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 placeholder-slate-300 focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all";
                                                                const inputId = col.id === 'description' ? `cell-description-${index}` : `cell-${col.id}-${index}`;

                                                                if (col.id === 'line') return <td key={col.id} className={`${cellClass} text-center bg-slate-50/50 text-slate-400 font-mono w-24`}>{item.line}</td>;
                                                                if (col.id === 'shape') return <td key={col.id} className={`${cellClass} w-32`}><input autoComplete="off" id={`cell-shape-${index}`} onKeyDown={(e) => handleKeyDown(e, col.id, index)} value={item.product_type || ''} onChange={(e) => handleUpdateLineItem(index, 'product_type', e.target.value)} className={inputClass} placeholder="-" /></td>;
                                                                if (col.id === 'description') return <td key={col.id} className={`${cellClass} w-64`}><input autoComplete="off" id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} value={item.description} onChange={(e) => handleUpdateLineItem(index, 'description', e.target.value)} className={`${inputClass} font-medium`} /></td>;
                                                                if (col.id === 'grade') return <td key={col.id} className={`${cellClass} w-32`}><input autoComplete="off" id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} value={item.material_grade || ''} onChange={(e) => handleUpdateLineItem(index, 'material_grade', e.target.value)} className={inputClass} /></td>;
                                                                if (col.id === 'tolerance') return <td key={col.id} className={`${cellClass} w-24`}><input autoComplete="off" id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} value={item.tolerance || ''} onChange={(e) => handleUpdateLineItem(index, 'tolerance', e.target.value)} placeholder="-" className={`${inputClass} text-center`} /></td>;
                                                                if (col.id === 'tests') return <td key={col.id} className={`${cellClass} w-24`}><input autoComplete="off" id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} value={item.test_reqs?.join(', ') || ''} onChange={(e) => handleUpdateLineItem(index, 'test_reqs', e.target.value.split(',').map(s => s.trim()))} placeholder="-" className={inputClass} /></td>;
                                                                if (col.id === 'od') return <td key={col.id} className={`${cellClass} w-24`}><div className="flex items-center gap-1"><input autoComplete="off" id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} type="number" value={item.size.outer_diameter.value || ''} onChange={(e) => handleUpdateDimension(index, 'outer_diameter', 'value', Number(e.target.value))} className={`${inputClass} text-right`} /><span className="text-[9px] text-slate-400 font-medium shrink-0">{item.size.outer_diameter.unit}</span></div></td>;
                                                                if (col.id === 'wt') return <td key={col.id} className={`${cellClass} w-24`}><div className="flex items-center gap-1"><input autoComplete="off" id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} type="number" value={item.size.wall_thickness.value || ''} onChange={(e) => handleUpdateDimension(index, 'wall_thickness', 'value', Number(e.target.value))} className={`${inputClass} text-right`} /><span className="text-[9px] text-slate-400 font-medium shrink-0">{item.size.wall_thickness.unit}</span></div></td>;
                                                                if (col.id === 'length') return <td key={col.id} className={`${cellClass} w-24`}><div className="flex items-center gap-1"><input autoComplete="off" id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} type="number" value={item.size.length.value || ''} onChange={(e) => handleUpdateDimension(index, 'length', 'value', Number(e.target.value))} className={`${inputClass} text-right`} /><span className="text-[9px] text-slate-400 font-medium shrink-0">{item.size.length.unit}</span></div></td>;
                                                                if (col.id === 'qty') return <td key={col.id} className={`${cellClass} w-24`}><input autoComplete="off" id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} type="number" value={item.quantity || 0} onChange={(e) => handleUpdateLineItem(index, 'quantity', Number(e.target.value))} className={`${inputClass} text-right font-bold text-slate-800`} /></td>;
                                                                if (col.id === 'uom') return <td key={col.id} className={`${cellClass} w-24`}><input autoComplete="off" id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} value={item.uom || ''} onChange={(e) => handleUpdateLineItem(index, 'uom', e.target.value)} className={`${inputClass} text-center text-slate-500`} /></td>;
                                                                if (col.isCustom) return <td key={col.id} className={`${cellClass} w-32`}><input autoComplete="off" id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} value={item.custom_fields?.[col.id] || ''} onChange={(e) => handleUpdateCustomField(index, col.id, e.target.value)} className={inputClass} placeholder="-" /></td>;
                                                                return null;
                                                            })}
                                                            <td className="px-2 py-2 text-center w-12 sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)] align-middle z-10 border-l border-slate-200">
                                                                <button onClick={() => handleDeleteItem(index)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-all" title={t(lang, 'delete_item')}>
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* RISK REPORT MODAL */}
                                    {showRiskModal && (rfq.risks || []).length >= 0 && (
                                        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                                            <div className="bg-white w-full max-w-3xl h-full max-h-[80vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                                                
                                                {/* Header */}
                                                <div className="bg-slate-900 text-white p-6 shrink-0 flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                                                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            </div>
                                                            <h2 className="text-xl font-bold">Procurement Risk Analysis</h2>
                                                        </div>
                                                        <div className="flex gap-4 items-center">
                                                            <p className="text-indigo-200 text-sm">AI-Driven Audit Of Technical & Commercial Gaps.</p>
                                                            <div className={`px-2 py-0.5 rounded text-xs font-bold border ${riskScore >= 80 ? 'bg-green-500/20 text-green-300 border-green-500/30' : riskScore >= 50 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
                                                                Health Score: {riskScore}/100
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setShowRiskModal(false)} className="text-white/60 hover:text-white transition">
                                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>

                                                {/* Body */}
                                                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                                                    <div className="space-y-4">
                                                        {(!rfq.risks || rfq.risks.length === 0) ? (
                                                            <div className="text-center p-12 text-slate-500">
                                                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                </div>
                                                                <h3 className="font-bold text-slate-900">No Major Risks Detected</h3>
                                                                <p className="text-sm mt-2">The AI Found No Obvious Technical Or Commercial Gaps.</p>
                                                            </div>
                                                        ) : (
                                                            rfq.risks.map((item, i) => (
                                                                <div key={i} className={`p-5 rounded-xl border flex gap-4 bg-white ${item.impact_level === 'High' ? 'border-red-200 shadow-sm' : item.impact_level === 'Medium' ? 'border-amber-200' : 'border-slate-200'}`}>
                                                                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                                                        item.impact_level === 'High' ? 'bg-red-100 text-red-600' : 
                                                                        item.impact_level === 'Medium' ? 'bg-amber-100 text-amber-600' : 
                                                                        'bg-blue-100 text-blue-600'
                                                                    }`}>
                                                                        {item.impact_level === 'High' ? '!' : 'i'}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex justify-between items-start mb-1">
                                                                            <h4 className="font-bold text-slate-900">{item.risk}</h4>
                                                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                                                                 item.impact_level === 'High' ? 'bg-red-50 text-red-600' : 
                                                                                 item.impact_level === 'Medium' ? 'bg-amber-50 text-amber-600' : 
                                                                                 'bg-blue-50 text-blue-600'
                                                                            }`}>{item.category} • {item.impact_level} Risk</span>
                                                                        </div>
                                                                        <p className="text-sm text-slate-600 leading-relaxed mb-4">{item.recommendation}</p>
                                                                        <div className="flex gap-3">
                                                                            <button 
                                                                                onClick={() => handleMitigateRisk(item, i)}
                                                                                className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-700 transition"
                                                                            >
                                                                                Mitigate & Fix
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => handleIgnoreRisk(i)}
                                                                                className="text-xs font-bold text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded border border-transparent hover:border-slate-200 transition"
                                                                            >
                                                                                Ignore
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Footer */}
                                                <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
                                                    <button onClick={() => setShowRiskModal(false)} className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition">
                                                        Close
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
