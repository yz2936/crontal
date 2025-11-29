
import React, { useState, useRef, useEffect } from 'react';
import { Rfq, Quote, Language, ColumnConfig, LineItem, FileAttachment } from '../types';
import { parseRequest, clarifyRequest, generateRfqSummary, auditRfqSpecs } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { t } from '../utils/i18n';
import LZString from 'lz-string';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BuyerViewProps {
    rfq: Rfq | null;
    setRfq: (rfq: Rfq | null) => void;
    quotes: Quote[];
    lang: Language;
}

export default function BuyerView({ rfq, setRfq, quotes, lang }: BuyerViewProps) {
    const [inputText, setInputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Sidebar State
    const [savedRfqs, setSavedRfqs] = useState<Rfq[]>([]);
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    // UI State
    const [isHeaderInfoOpen, setIsHeaderInfoOpen] = useState(false);

    // Load drafts on mount
    useEffect(() => {
        setSavedRfqs(storageService.getRfqs());
    }, [rfq]); // Reload if current RFQ changes (save/update)

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
        setIsProcessing(true);

        try {
            const processedFiles: FileAttachment[] = [];
            for (const file of attachedFiles) {
                processedFiles.push(await fileToGenerativePart(file));
            }

            // Call Gemini
            // If we have an existing RFQ, we are in "Edit Mode"
            const currentItems = rfq ? rfq.line_items : [];
            const projectName = rfq ? rfq.project_name : null;

            const result = await parseRequest(inputText, projectName, processedFiles, lang, currentItems);
            
            if (rfq) {
                // Merge logic for edit mode
                const updatedRfq: Rfq = {
                    ...rfq,
                    project_name: result.project_name || rfq.project_name,
                    line_items: result.line_items || [],
                    commercial: {
                        ...rfq.commercial,
                        ...(result.commercial?.destination ? { destination: result.commercial.destination } : {}),
                    }
                };
                setRfq(updatedRfq);
            } else {
                // New RFQ
                const newRfq: Rfq = {
                    id: `RFQ-${Date.now()}`,
                    project_name: result.project_name || "New RFP",
                    status: 'draft',
                    line_items: result.line_items || [],
                    original_text: inputText,
                    created_at: Date.now(),
                    commercial: {
                        destination: result.commercial?.destination || "",
                        incoterm: result.commercial?.incoterm || "",
                        paymentTerm: result.commercial?.paymentTerm || "",
                        otherRequirements: result.commercial?.otherRequirements || "",
                        req_mtr: false,
                        req_avl: false,
                        req_tpi: false,
                        warranty_months: 12
                    }
                };
                setRfq(newRfq);
            }
            
            setInputText('');
            setAttachedFiles([]);
        } catch (e) {
            console.error(e);
            alert("Error processing request. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Helper to focus specific cell
    const focusCell = (colId: string, rowIndex: number) => {
        setTimeout(() => {
            const el = document.getElementById(`cell-${colId}-${rowIndex}`);
            if (el) (el as HTMLInputElement).focus();
        }, 50);
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
            focusCell('shape', rfq.line_items.length);
        } else {
            // Create blank RFQ if none exists
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
            // Wait for render then focus
            setTimeout(() => focusCell('shape', 0), 100);
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
    };

    const handleNewRfp = () => {
        setRfq(null);
        setInputText('');
    };

    const handleSaveRfq = () => {
        if (!rfq) return;
        storageService.saveRfq(rfq);
        setSavedRfqs(storageService.getRfqs());
        alert(t(lang, 'save_success'));
    };

    const handleSelectRfq = (id: string) => {
        const selected = savedRfqs.find(r => r.id === id);
        if (selected) setRfq(selected);
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

    const handleGeneratePO = () => {
        if (!rfq) return;
        const doc = new jsPDF();
        // ... (PDF generation logic preserved)
        // For brevity, reusing the existing PDF logic
        doc.setFontSize(22);
        doc.setFont("times", "bold");
        doc.text("PURCHASE ORDER", 14, 20);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const poNum = `PO-${rfq.id.replace('RFQ-', '')}`;
        doc.text(`Order Number: ${poNum}`, 140, 18);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 23);
        doc.text(`Page 1 of 1`, 140, 28);

        doc.setFillColor(11, 17, 33);
        doc.roundedRect(14, 25, 30, 10, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text("CRONTAL", 16, 31.5);
        doc.setTextColor(0, 0, 0);

        const startY = 45;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("BUYER:", 14, startY);
        doc.setFont("helvetica", "normal");
        doc.text("INDUSTRIAL PROCUREMENT CORP", 14, startY + 5);
        doc.text("123 Engineering Way", 14, startY + 10);
        doc.text("Houston, TX 77001, USA", 14, startY + 15);
        
        doc.setFont("helvetica", "bold");
        doc.text("DELIVERY TO:", 110, startY);
        doc.setFont("helvetica", "normal");
        doc.text(rfq.commercial.destination || "See Below", 110, startY + 5);
        
        doc.setFont("helvetica", "bold");
        doc.text("Project:", 14, startY + 25);
        doc.setFont("helvetica", "normal");
        doc.text(rfq.project_name || "N/A", 30, startY + 25);

        const tableBody = rfq.line_items.map(item => [
            `${item.size.outer_diameter.value || '-'} ${item.size.outer_diameter.unit || ''} x ${item.size.wall_thickness.value || '-'} ${item.size.wall_thickness.unit || ''} x ${item.size.length.value || '-'} ${item.size.length.unit || ''}`,
            item.size.outer_diameter.value?.toString() || '-',
            item.size.wall_thickness.value?.toString() || '-',
            item.size.length.value?.toString() || '-',
            item.quantity?.toString() || '0',
            "-",
            item.uom || 'pcs',
            "-",
            "-"
        ]);

        autoTable(doc, {
            startY: startY + 30,
            head: [['Size (OD x WT x L)', 'OD', 'WT', 'L', 'Qty', 'N.W(kg)', 'UOM', 'Price', 'Amount']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
            styles: { fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
            columnStyles: {
                0: { cellWidth: 50 },
                4: { halign: 'right' },
                7: { halign: 'right' },
                8: { halign: 'right' }
            }
        });

        // @ts-ignore
        let finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Delivery Condition:", 14, finalY);
        doc.setFont("helvetica", "normal");
        doc.text("Standard Export Packing", 50, finalY);
        finalY += 5;
        doc.setFont("helvetica", "bold");
        doc.text("Payment:", 14, finalY);
        doc.setFont("helvetica", "normal");
        doc.text(rfq.commercial.paymentTerm || "Net 30 Days", 50, finalY);
        finalY += 5;
        doc.setFont("helvetica", "bold");
        doc.text("Incoterm:", 14, finalY);
        doc.setFont("helvetica", "normal");
        doc.text(rfq.commercial.incoterm || "Ex Works", 50, finalY);
        finalY += 5;
        doc.setFont("helvetica", "bold");
        doc.text("Documents:", 14, finalY);
        doc.setFont("helvetica", "normal");
        doc.text("Comm. Invoice, Packing List, MTC 3.1", 50, finalY);
        finalY += 15;
        doc.setLineWidth(0.5);
        doc.line(120, finalY, 190, finalY);
        doc.setFontSize(8);
        doc.text("AUTHORIZED SIGNATURE", 120, finalY + 5);
        doc.save(`PO_${rfq.id}.pdf`);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] gap-0 overflow-hidden">
            
            {/* TOP BAR: STEPS & NAVIGATION */}
            <div className="flex items-center justify-between px-2 pb-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
                        title={isSidebarOpen ? t(lang, 'hide_sidebar') : t(lang, 'show_sidebar')}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                    {/* Flow Steps */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-bold shadow-sm">
                            <span className="w-5 h-5 flex items-center justify-center bg-brandOrange rounded-full text-[10px]">1</span>
                            <span>{t(lang, 'step1_short')}</span>
                        </div>
                        <div className="w-8 h-px bg-slate-200"></div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-full text-xs font-medium">
                            <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded-full text-[10px]">2</span>
                            <span>{t(lang, 'step2_short')}</span>
                        </div>
                        <div className="w-8 h-px bg-slate-200"></div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-full text-xs font-medium">
                            <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded-full text-[10px]">3</span>
                            <span>{t(lang, 'step3_short')}</span>
                        </div>
                    </div>
                </div>
                
                {/* Save/Share Actions */}
                {rfq && (
                    <div className="flex gap-2">
                        <button onClick={handleSaveRfq} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition shadow-sm">{t(lang, 'save_draft')}</button>
                        <button onClick={handleShare} className="px-3 py-1.5 bg-slate-600 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition shadow-sm">{t(lang, 'share_link')}</button>
                    </div>
                )}
            </div>

            <div className="flex flex-1 overflow-hidden gap-6">
                {/* COLUMN 1: SIDEBAR (COLLAPSIBLE) */}
                <div className={`transition-all duration-300 ease-in-out flex flex-col gap-4 ${isSidebarOpen ? 'w-full md:w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden ml-[-1rem]'}`}>
                    <button 
                        onClick={handleNewRfp}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2 shadow-sm shrink-0"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        {t(lang, 'nav_new_project')}
                    </button>

                    <div className="bg-white rounded-xl border border-slate-200 flex-1 flex flex-col shadow-sm overflow-hidden">
                        <div className="flex border-b border-slate-100">
                            <button 
                                onClick={() => setActiveTab('active')}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition ${activeTab === 'active' ? 'bg-white text-slate-900 border-b-2 border-slate-900' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                            >
                                {t(lang, 'nav_active')}
                            </button>
                            <button 
                                onClick={() => setActiveTab('archived')}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition ${activeTab === 'archived' ? 'bg-white text-slate-900 border-b-2 border-slate-900' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                            >
                                {t(lang, 'nav_archived')}
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {savedRfqs.filter(r => (activeTab === 'active' ? r.status !== 'archived' : r.status === 'archived')).length === 0 ? (
                                <div className="text-center text-slate-300 text-xs italic mt-10">No RFPs found</div>
                            ) : (
                                savedRfqs
                                    .filter(r => (activeTab === 'active' ? r.status !== 'archived' : r.status === 'archived'))
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
                <div className="flex-1 flex flex-col min-w-[300px] max-w-[400px] gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{t(lang, 'drafting_assistant')}</span>
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold cursor-pointer hover:bg-slate-300">{t(lang, 'guide_me')}</span>
                        </div>
                        
                        <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
                            <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none border border-slate-100 text-sm text-slate-600">
                                {t(lang, 'initial_greeting')}
                            </div>
                            {inputText && (
                                <div className="bg-slate-900 text-white p-3 rounded-2xl rounded-tr-none text-sm self-end max-w-[90%] shadow-md">
                                    {inputText}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                            <textarea 
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={t(lang, 'chat_placeholder')}
                                className="w-full h-24 rounded-xl border border-slate-300 p-3 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none shadow-sm mb-2"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                                    <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-accent flex items-center gap-1 text-xs font-medium">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                        {t(lang, 'upload_file')}
                                    </button>
                                    {attachedFiles.length > 0 && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{attachedFiles.length} files</span>}
                                </div>
                                <button 
                                    onClick={handleSend} 
                                    disabled={isProcessing || (!inputText && attachedFiles.length === 0)}
                                    className={`px-4 py-2 rounded-lg text-white text-xs font-bold transition shadow-sm flex items-center gap-1 ${isProcessing ? 'bg-slate-400' : 'bg-slate-700 hover:bg-slate-900'}`}
                                >
                                    {isProcessing ? 'Processing...' : t(lang, 'send')}
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMN 3: DASHBOARD / TABLE */}
                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    
                    {!rfq ? (
                        // EMPTY STATE: DASHBOARD
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center animate-in fade-in">
                            <h2 className="text-xl font-bold text-slate-900 mb-2">{t(lang, 'dashboard_title')}</h2>
                            <p className="text-slate-500 text-sm mb-10 text-center max-w-md">Select an option to begin your procurement process.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                                <button onClick={handleLoadSample} className="group p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50 hover:border-blue-100 transition-all flex flex-col items-center text-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{t(lang, 'action_sample_title')}</div>
                                        <div className="text-xs text-slate-500 mt-1">{t(lang, 'action_sample_desc')}</div>
                                    </div>
                                </button>

                                <button onClick={() => {}} className="group p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-purple-50 hover:border-purple-100 transition-all flex flex-col items-center text-center gap-4 cursor-default">
                                    <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{t(lang, 'action_chat_title')}</div>
                                        <div className="text-xs text-slate-500 mt-1">{t(lang, 'action_chat_desc')}</div>
                                    </div>
                                </button>

                                <button onClick={() => fileInputRef.current?.click()} className="group p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-green-50 hover:border-green-100 transition-all flex flex-col items-center text-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{t(lang, 'action_upload_title')}</div>
                                        <div className="text-xs text-slate-500 mt-1">{t(lang, 'action_upload_desc')}</div>
                                    </div>
                                </button>
                            </div>

                            <div className="mt-6 w-full max-w-md">
                                 <button onClick={handleAddItem} className="group w-full p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-orange-50 hover:border-orange-100 transition-all flex flex-col items-center text-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{t(lang, 'add_line_item')}</div>
                                        <div className="text-xs text-slate-500 mt-1">Manually create a new list</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    ) : (
                        // ACTIVE STATE: TABLE VIEW
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-in fade-in">
                            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <input 
                                            value={rfq.project_name || ''}
                                            onChange={(e) => setRfq({ ...rfq, project_name: e.target.value })}
                                            className="font-bold text-sm text-slate-800 bg-transparent border-none p-0 focus:ring-0 placeholder-slate-300 w-48 focus:border-b focus:border-accent"
                                            placeholder="Untitled RFP"
                                        />
                                        <div className="h-4 w-px bg-slate-300"></div>
                                        <div className="text-xs text-slate-500 flex gap-2">
                                            <span>{rfq.line_items.length} items</span>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-slate-400">{new Date(rfq.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setIsHeaderInfoOpen(!isHeaderInfoOpen)}
                                            className={`text-xs px-3 py-1.5 rounded-lg border transition ${isHeaderInfoOpen ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            {isHeaderInfoOpen ? t(lang, 'hide_details') : t(lang, 'rfp_details')}
                                        </button>
                                        <button 
                                            onClick={handleAddItem}
                                            className="text-xs bg-brandOrange text-white font-bold px-4 py-1.5 rounded-lg hover:bg-orange-600 transition shadow-sm flex items-center gap-1"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            {t(lang, 'add_line_item')}
                                        </button>
                                        <button 
                                            onClick={handleGeneratePO}
                                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                                            title={t(lang, 'generate_po_pdf')}
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        </button>
                                    </div>
                                </div>

                                {/* EXPANDABLE RFP DETAILS PANEL */}
                                {isHeaderInfoOpen && (
                                    <div className="bg-white border border-slate-200 rounded-lg p-4 animate-in slide-in-from-top-2 text-xs">
                                        <div className="grid grid-cols-2 gap-4 mb-4">
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
                                                    <input 
                                                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-accent outline-none text-slate-700"
                                                        value={rfq.commercial.destination || ''}
                                                        onChange={(e) => setRfq({ ...rfq, commercial: { ...rfq.commercial, destination: e.target.value } })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-slate-500 font-semibold mb-1">{t(lang, 'incoterm')}</label>
                                                    <input 
                                                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-accent outline-none text-slate-700"
                                                        value={rfq.commercial.incoterm || ''}
                                                        onChange={(e) => setRfq({ ...rfq, commercial: { ...rfq.commercial, incoterm: e.target.value } })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-slate-500 font-semibold mb-1">{t(lang, 'payment_terms')}</label>
                                                    <input 
                                                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-accent outline-none text-slate-700"
                                                        value={rfq.commercial.paymentTerm || ''}
                                                        onChange={(e) => setRfq({ ...rfq, commercial: { ...rfq.commercial, paymentTerm: e.target.value } })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-slate-500 font-semibold mb-1">Warranty (Months)</label>
                                                    <input 
                                                        type="number"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-accent outline-none text-slate-700"
                                                        value={rfq.commercial.warranty_months || 12}
                                                        onChange={(e) => setRfq({ ...rfq, commercial: { ...rfq.commercial, warranty_months: parseInt(e.target.value) } })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 border-t border-slate-100 pt-3">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={rfq.commercial.req_mtr} onChange={(e) => setRfq({ ...rfq, commercial: { ...rfq.commercial, req_mtr: e.target.checked } })} className="rounded text-accent focus:ring-accent" />
                                                <span className="text-slate-600">{t(lang, 'req_mtr')}</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={rfq.commercial.req_avl} onChange={(e) => setRfq({ ...rfq, commercial: { ...rfq.commercial, req_avl: e.target.checked } })} className="rounded text-accent focus:ring-accent" />
                                                <span className="text-slate-600">{t(lang, 'req_avl')}</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={rfq.commercial.req_tpi} onChange={(e) => setRfq({ ...rfq, commercial: { ...rfq.commercial, req_tpi: e.target.checked } })} className="rounded text-accent focus:ring-accent" />
                                                <span className="text-slate-600">{t(lang, 'req_tpi')}</span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* TABLE */}
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-xs text-left border-collapse table-fixed">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                                        <tr>
                                            {tableConfig.filter(c => c.visible).map((col) => (
                                                <th key={col.id} className={`px-2 py-3 border-b border-slate-200 bg-slate-50 border-r border-slate-200 text-center ${getWidthClass(col.width)}`}>
                                                    {col.label}
                                                </th>
                                            ))}
                                            <th className="px-2 py-3 text-center w-12 bg-white border-b border-slate-200 sticky right-0 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)] border-l border-slate-200 z-30">
                                                <span className="sr-only">Actions</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 bg-white">
                                        {rfq.line_items.map((item, index) => (
                                            <tr key={item.item_id} className="hover:bg-blue-50/10 transition-colors group">
                                                {tableConfig.filter(c => c.visible).map(col => {
                                                    const cellClass = "px-2 py-2 border-r border-slate-200 align-middle";
                                                    // Clean input box style
                                                    const inputClass = "w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs text-slate-700 placeholder-slate-300 focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all";
                                                    const inputId = `cell-${col.id}-${index}`;

                                                    if (col.id === 'line') return <td key={col.id} className={`${cellClass} text-center bg-slate-50/50 text-slate-400 font-mono w-24`}>{item.line}</td>;
                                                    
                                                    if (col.id === 'shape') return <td key={col.id} className={`${cellClass} w-32`}><input id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} value={item.product_type || ''} onChange={(e) => handleUpdateLineItem(index, 'product_type', e.target.value)} className={inputClass} placeholder="-" /></td>;
                                                    
                                                    if (col.id === 'description') return <td key={col.id} className={`${cellClass} w-64`}><input id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} value={item.description} onChange={(e) => handleUpdateLineItem(index, 'description', e.target.value)} className={`${inputClass} font-medium`} /></td>;
                                                    
                                                    if (col.id === 'grade') return <td key={col.id} className={`${cellClass} w-32`}><input id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} value={item.material_grade || ''} onChange={(e) => handleUpdateLineItem(index, 'material_grade', e.target.value)} className={inputClass} /></td>;
                                                    
                                                    if (col.id === 'tolerance') return <td key={col.id} className={`${cellClass} w-24`}><input id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} value={item.tolerance || ''} onChange={(e) => handleUpdateLineItem(index, 'tolerance', e.target.value)} placeholder="-" className={`${inputClass} text-center`} /></td>;
                                                    
                                                    if (col.id === 'tests') return <td key={col.id} className={`${cellClass} w-24`}><input id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} value={item.test_reqs?.join(', ') || ''} onChange={(e) => handleUpdateLineItem(index, 'test_reqs', e.target.value.split(',').map(s => s.trim()))} placeholder="-" className={inputClass} /></td>;
                                                    
                                                    if (col.id === 'od') return <td key={col.id} className={`${cellClass} w-24`}><div className="flex items-center gap-1"><input id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} type="number" value={item.size.outer_diameter.value || ''} onChange={(e) => handleUpdateDimension(index, 'outer_diameter', 'value', Number(e.target.value))} className={`${inputClass} text-right`} /><span className="text-[9px] text-slate-400 font-medium shrink-0">{item.size.outer_diameter.unit}</span></div></td>;
                                                    
                                                    if (col.id === 'wt') return <td key={col.id} className={`${cellClass} w-24`}><div className="flex items-center gap-1"><input id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} type="number" value={item.size.wall_thickness.value || ''} onChange={(e) => handleUpdateDimension(index, 'wall_thickness', 'value', Number(e.target.value))} className={`${inputClass} text-right`} /><span className="text-[9px] text-slate-400 font-medium shrink-0">{item.size.wall_thickness.unit}</span></div></td>;
                                                    
                                                    if (col.id === 'length') return <td key={col.id} className={`${cellClass} w-24`}><div className="flex items-center gap-1"><input id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} type="number" value={item.size.length.value || ''} onChange={(e) => handleUpdateDimension(index, 'length', 'value', Number(e.target.value))} className={`${inputClass} text-right`} /><span className="text-[9px] text-slate-400 font-medium shrink-0">{item.size.length.unit}</span></div></td>;
                                                    
                                                    if (col.id === 'qty') return <td key={col.id} className={`${cellClass} w-24`}><input id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} type="number" value={item.quantity || 0} onChange={(e) => handleUpdateLineItem(index, 'quantity', Number(e.target.value))} className={`${inputClass} text-right font-bold text-slate-800`} /></td>;
                                                    
                                                    if (col.id === 'uom') return <td key={col.id} className={`${cellClass} w-24`}><input id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} value={item.uom || ''} onChange={(e) => handleUpdateLineItem(index, 'uom', e.target.value)} className={`${inputClass} text-center text-slate-500`} /></td>;
                                                    
                                                    if (col.isCustom) return <td key={col.id} className={`${cellClass} w-32`}><input id={inputId} onKeyDown={(e) => handleKeyDown(e, col.id, index)} value={item.custom_fields?.[col.id] || ''} onChange={(e) => handleUpdateCustomField(index, col.id, e.target.value)} className={inputClass} placeholder="-" /></td>;
                                                    
                                                    return null;
                                                })}
                                                <td className="px-2 py-2 text-center w-12 sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.05)] align-middle z-10 border-l border-slate-200">
                                                    <button 
                                                        onClick={() => handleDeleteItem(index)}
                                                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-all"
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
                    )}
                </div>
            </div>
        </div>
    );
}