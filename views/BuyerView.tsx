
import React, { useState, useRef, useEffect } from 'react';
import { Rfq, Quote, Language, ColumnConfig, LineItem, FileAttachment } from '../types';
import { parseRequest, clarifyRequest, generateRfqSummary, auditRfqSpecs } from '../services/geminiService';
import { t } from '../utils/i18n';
import { Walkthrough } from '../components/Walkthrough';
import LZString from 'lz-string';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BuyerViewProps {
    rfq: Rfq | null;
    setRfq: (rfq: Rfq) => void;
    quotes: Quote[];
    lang: Language;
}

export default function BuyerView({ rfq, setRfq, quotes, lang }: BuyerViewProps) {
    const [inputText, setInputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showTour, setShowTour] = useState(false);
    const [isInfoCollapsed, setIsInfoCollapsed] = useState(false);
    
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
                    line_items: result.line_items || [], // parseRequest in edit mode returns full list
                    // Keep existing commercial terms unless updated
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
            // Auto-focus the first editable field of the new row
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
            focusCell('shape', 0);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, colId: string, rowIndex: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                // Move Up
                if (rowIndex > 0) focusCell(colId, rowIndex - 1);
            } else {
                // Move Down or Create New
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
        // Generate unique ID for this share to prevent comparison collisions
        const shareId = Date.now().toString();
        const jsonStr = JSON.stringify({ ...rfq, share_id: shareId });
        const compressed = LZString.compressToEncodedURIComponent(jsonStr);
        // Clean URL generation
        const baseUrl = window.location.href.split('?')[0];
        const url = `${baseUrl}?mode=supplier&data=${compressed}`;
        
        // Fallback for non-secure contexts
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

        // Logo Placeholder
        doc.setFillColor(11, 17, 33); // Crontal Navy
        doc.roundedRect(14, 25, 30, 10, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text("CRONTAL", 16, 31.5);
        doc.setTextColor(0, 0, 0); // Reset text color

        // --- Addresses ---
        const startY = 45;
        // Buyer (Left)
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("BUYER:", 14, startY);
        doc.setFont("helvetica", "normal");
        doc.text("INDUSTRIAL PROCUREMENT CORP", 14, startY + 5);
        doc.text("123 Engineering Way", 14, startY + 10);
        doc.text("Houston, TX 77001, USA", 14, startY + 15);
        
        // Delivery To (Right)
        doc.setFont("helvetica", "bold");
        doc.text("DELIVERY TO:", 110, startY);
        doc.setFont("helvetica", "normal");
        doc.text(rfq.commercial.destination || "See Below", 110, startY + 5);
        
        // Project Info
        doc.setFont("helvetica", "bold");
        doc.text("Project:", 14, startY + 25);
        doc.setFont("helvetica", "normal");
        doc.text(rfq.project_name || "N/A", 30, startY + 25);

        // --- Table ---
        const tableBody = rfq.line_items.map(item => [
            `${item.size.outer_diameter.value || '-'} ${item.size.outer_diameter.unit || ''} x ${item.size.wall_thickness.value || '-'} ${item.size.wall_thickness.unit || ''} x ${item.size.length.value || '-'} ${item.size.length.unit || ''}`, // Size Combined
            item.size.outer_diameter.value?.toString() || '-',
            item.size.wall_thickness.value?.toString() || '-',
            item.size.length.value?.toString() || '-',
            item.quantity?.toString() || '0',
            "-", // N.W placeholder
            item.uom || 'pcs',
            "-", // Price placeholder
            "-"  // Amount placeholder
        ]);

        autoTable(doc, {
            startY: startY + 30,
            head: [['Size (OD x WT x L)', 'OD', 'WT', 'L', 'Qty', 'N.W(kg)', 'UOM', 'Price', 'Amount']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
            styles: { fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
            columnStyles: {
                0: { cellWidth: 50 }, // Size Desc
                4: { halign: 'right' }, // Qty
                7: { halign: 'right' }, // Price
                8: { halign: 'right' }  // Amount
            }
        });

        // --- Footer Terms ---
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

    const handleRunAudit = async () => {
        if (!rfq) return;
        setIsProcessing(true);
        const warnings = await auditRfqSpecs(rfq, lang);
        if (warnings.length > 0) {
            const updatedRfq = { ...rfq, audit_warnings: warnings };
            setRfq(updatedRfq);
        } else {
             const updatedRfq = { ...rfq, audit_warnings: [] };
             setRfq(updatedRfq);
             alert(t(lang, 'audit_clean'));
        }
        setIsProcessing(false);
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Steps Visual */}
            <div className="flex justify-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-green-200 shadow-sm text-green-700 text-sm font-medium">
                        <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</div>
                        {t(lang, 'step1')}
                    </div>
                    <div className="w-8 h-0.5 bg-green-300"></div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-blue-200 shadow-sm text-blue-700 text-sm font-medium">
                        <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">2</div>
                        {t(lang, 'step2')}
                    </div>
                    <div className="w-8 h-0.5 bg-slate-200"></div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-200 text-slate-400 text-sm">
                        <div className="w-5 h-5 rounded-full bg-slate-300 text-white flex items-center justify-center text-xs">3</div>
                        {t(lang, 'step3')}
                    </div>
                </div>
            </div>

            {/* Chat Input Section */}
            <div className={`transition-all duration-500 ease-in-out ${rfq ? 'bg-white p-4 rounded-xl shadow-sm border border-slate-200' : 'max-w-2xl mx-auto mt-10'}`}>
                {!rfq && (
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-accent">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">{t(lang, 'drafting_assistant')}</h2>
                        <p className="text-slate-500 text-sm">{t(lang, 'initial_greeting')}</p>
                    </div>
                )}
                
                <div className="relative">
                    <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={t(lang, 'chat_placeholder')}
                        className={`w-full rounded-xl border border-slate-300 focus:border-accent focus:ring-1 focus:ring-accent outline-none p-4 pr-32 shadow-sm resize-none ${rfq ? 'h-16 py-3 min-h-[80px]' : 'h-32'}`}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    
                    <div className="absolute bottom-2 right-2 flex items-center gap-2">
                        <input 
                            type="file" 
                            multiple 
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-slate-400 hover:text-accent hover:bg-slate-50 rounded-lg transition"
                            title={t(lang, 'upload_file')}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        </button>
                        <button 
                            onClick={handleSend}
                            disabled={isProcessing || (!inputText && attachedFiles.length === 0)}
                            className={`p-2 rounded-lg text-white transition shadow-sm ${isProcessing ? 'bg-slate-400 cursor-not-allowed' : 'bg-accent hover:bg-slate-800'}`}
                        >
                            {isProcessing ? (
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            )}
                        </button>
                    </div>
                </div>

                {attachedFiles.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                        {attachedFiles.map((file, i) => (
                            <div key={i} className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-xs text-slate-600 border border-slate-200">
                                <span className="truncate max-w-[150px]">{file.name}</span>
                                <button onClick={() => removeFile(i)} className="hover:text-red-500">×</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Main Content Area - Only if RFQ exists */}
            {rfq && (
                <div className={`grid grid-cols-1 ${isInfoCollapsed ? 'gap-0' : 'lg:grid-cols-4 gap-6'} animate-in fade-in slide-in-from-bottom-4 duration-500 transition-all`}>
                    
                    {/* Collapsible Sidebar / Info Panel */}
                    <div className={`${isInfoCollapsed ? 'w-0 overflow-hidden opacity-0 p-0 m-0' : 'lg:col-span-1 w-full opacity-100'} transition-all duration-300 space-y-4`}>
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t(lang, 'project_label')}</label>
                            <input 
                                value={rfq.project_name || ''} 
                                onChange={(e) => setRfq({ ...rfq, project_name: e.target.value })}
                                className="w-full font-bold text-slate-800 border-none p-0 focus:ring-0 text-sm placeholder-slate-300" 
                                placeholder="Enter RFP Name..."
                            />
                            
                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">{t(lang, 'commercial_terms')}</label>
                                    <input 
                                        placeholder={t(lang, 'destination')} 
                                        value={rfq.commercial.destination || ''}
                                        onChange={e => setRfq({...rfq, commercial: {...rfq.commercial, destination: e.target.value}})}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5 mb-2"
                                    />
                                    <input 
                                        placeholder={t(lang, 'incoterm')} 
                                        value={rfq.commercial.incoterm || ''}
                                        onChange={e => setRfq({...rfq, commercial: {...rfq.commercial, incoterm: e.target.value}})}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5"
                                    />
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                        <input type="checkbox" checked={rfq.commercial.req_mtr} onChange={e => setRfq({...rfq, commercial: {...rfq.commercial, req_mtr: e.target.checked}})} className="rounded text-accent focus:ring-accent" />
                                        MTR
                                    </label>
                                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                        <input type="checkbox" checked={rfq.commercial.req_avl} onChange={e => setRfq({...rfq, commercial: {...rfq.commercial, req_avl: e.target.checked}})} className="rounded text-accent focus:ring-accent" />
                                        AVL
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Audit Panel */}
                        {rfq.audit_warnings && rfq.audit_warnings.length > 0 && (
                            <div className="bg-red-50 rounded-xl border border-red-100 p-4 animate-in fade-in">
                                <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase mb-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    {t(lang, 'audit_warnings')}
                                </div>
                                <ul className="list-disc pl-4 space-y-1">
                                    {rfq.audit_warnings.map((w, i) => (
                                        <li key={i} className="text-xs text-red-600">{w}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={handleRunAudit}
                                className="w-full py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-accent transition flex flex-col items-center justify-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {t(lang, 'audit_specs')}
                            </button>
                            <button 
                                onClick={handleShare}
                                className="w-full py-2 bg-brandOrange text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition flex flex-col items-center justify-center gap-1 shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                {t(lang, 'share_link')}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2">
                             <button
                                onClick={() => {
                                    alert(t(lang, 'save_success'));
                                }}
                                className="w-full py-2 bg-white border border-slate-200 text-slate-500 text-xs font-medium rounded-lg hover:bg-slate-50 transition"
                             >
                                 {t(lang, 'save_draft')}
                             </button>
                             <button
                                onClick={handleGeneratePO}
                                className="w-full py-2 bg-white border border-slate-200 text-slate-500 text-xs font-medium rounded-lg hover:bg-slate-50 transition"
                             >
                                 {t(lang, 'generate_po_pdf')}
                             </button>
                        </div>
                    </div>

                    {/* Main Table Area */}
                    <div className={`${isInfoCollapsed ? 'col-span-1' : 'lg:col-span-3'} space-y-6 transition-all duration-300`}>
                        
                        {/* Quotes Comparison */}
                        {quotes.length > 0 && (
                            <div className="bg-white rounded-xl border border-green-100 shadow-sm overflow-hidden mb-6">
                                <div className="bg-green-50 px-4 py-2 border-b border-green-100 flex justify-between items-center">
                                    <span className="text-xs font-bold text-green-800 uppercase">{t(lang, 'received_quotes')} ({quotes.length})</span>
                                </div>
                                
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-green-50/50 text-green-900 border-b border-green-100">
                                            <tr>
                                                <th className="px-4 py-2 font-semibold">Comparison</th>
                                                {quotes.map(q => (
                                                    <th key={q.id} className="px-4 py-2 font-bold">{q.supplierName}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            <tr>
                                                <td className="px-4 py-2 font-medium text-slate-500">Total Price</td>
                                                {quotes.map(q => (
                                                    <td key={q.id} className="px-4 py-2 font-bold text-slate-900">{q.currency} {q.total.toLocaleString()}</td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-2 font-medium text-slate-500">Lead Time</td>
                                                {quotes.map(q => (
                                                    <td key={q.id} className="px-4 py-2 text-slate-700">{q.leadTime} Days</td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-2 font-medium text-slate-500">Payment</td>
                                                {quotes.map(q => (
                                                    <td key={q.id} className="px-4 py-2 text-slate-700">{q.payment}</td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-2 font-medium text-slate-500">Documents</td>
                                                {quotes.map(q => (
                                                    <td key={q.id} className="px-4 py-2">
                                                        {q.attachments && q.attachments.length > 0 ? (
                                                            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px]">{q.attachments.length} Files</span>
                                                        ) : (
                                                            <span className="text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-2 font-medium text-slate-500">Action</td>
                                                {quotes.map(q => (
                                                    <td key={q.id} className="px-4 py-2">
                                                        <button className="bg-green-600 text-white px-3 py-1 rounded text-[10px] hover:bg-green-700 font-bold">
                                                            Select
                                                        </button>
                                                    </td>
                                                ))}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Editable Table */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
                             <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setIsInfoCollapsed(!isInfoCollapsed)}
                                        className="p-1.5 hover:bg-slate-200 rounded text-slate-500"
                                        title={isInfoCollapsed ? t(lang, 'show_sidebar') : t(lang, 'hide_sidebar')}
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                    </button>
                                    {isInfoCollapsed && <span className="font-bold text-sm text-slate-800">{rfq.project_name}</span>}
                                    <span className="font-medium text-xs text-slate-500">{rfq.line_items.length} items</span>
                                </div>
                                <div className="flex gap-2">
                                     <button 
                                        onClick={handleAddItem}
                                        className="text-xs bg-brandOrange text-white font-bold px-4 py-1.5 rounded hover:bg-orange-600 transition shadow-sm flex items-center gap-1"
                                     >
                                        <span>+</span> {t(lang, 'add_line_item')}
                                     </button>
                                     <button 
                                        className="text-slate-400 hover:text-accent p-1.5 rounded"
                                        title={t(lang, 'column_settings')}
                                        onClick={() => {
                                            const newConfig = [...tableConfig];
                                            const toleranceCol = newConfig.find(c => c.id === 'tolerance');
                                            if (toleranceCol) toleranceCol.visible = !toleranceCol.visible;
                                            setTableConfig(newConfig);
                                        }}
                                     >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                     </button>
                                </div>
                             </div>

                             <div className="overflow-x-auto max-h-[calc(100vh-250px)]">
                                <table className="w-full text-xs text-left border-collapse table-fixed">
                                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                                        <tr>
                                            {tableConfig.filter(c => c.visible).map((col) => (
                                                <th key={col.id} className={`px-2 py-3 border-b border-slate-200 bg-slate-50 border-r border-slate-200/60 last:border-r-0 text-center ${getWidthClass(col.width)}`}>
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
                                                    // Add vertical dividers (border-r) to all cells
                                                    const cellClass = "px-2 py-2 border-r border-slate-100 last:border-r-0 align-middle";
                                                    // Input Box Style (Clean, distinct edge, light background)
                                                    const inputClass = "w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 placeholder-slate-400 focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all";
                                                    const inputId = `cell-${col.id}-${index}`;

                                                    if (col.id === 'line') return <td key={col.id} className={`${cellClass} text-center bg-slate-50/30 text-slate-400 font-mono text-[10px] w-24`}>{item.line}</td>;
                                                    
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
                    </div>
                </div>
            )}
        </div>
    );
}
