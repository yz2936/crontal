
import React, { useState, useRef, useEffect } from 'react';
import { Rfq, Quote, Language, ColumnConfig, LineItem, FileAttachment, ChatMessage, RiskAnalysisItem, SupplierCandidate, SupplierFilters } from '../types';
import { parseRequest, analyzeRfqRisks, auditRfqSpecs, findSuppliers } from '../services/geminiService';
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
    const [isChatOpen, setIsChatOpen] = useState(true); // New state to collapse chat
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
    const [savedRfqs, setSavedRfqs] = useState<Rfq[]>([]);
    
    // Risk Analysis State
    const [isRiskAnalyzing, setIsRiskAnalyzing] = useState(false);
    const [showRiskModal, setShowRiskModal] = useState(false);
    const [isAuditing, setIsAuditing] = useState(false);

    // Sourcing & Share State
    const [showShareModal, setShowShareModal] = useState(false);
    const [sourcingStep, setSourcingStep] = useState<1 | 2 | 3>(1); // 1: Discover, 2: Review, 3: Broadcast
    const [isSourcing, setIsSourcing] = useState(false);
    
    // New Advanced Sourcing Filters
    const [sourcingFilters, setSourcingFilters] = useState<SupplierFilters>({
        region: '',
        types: [],
        certs: []
    });

    const [suggestedSuppliers, setSuggestedSuppliers] = useState<SupplierCandidate[]>([]);
    const [manualSupplierEmail, setManualSupplierEmail] = useState('');
    const [emailDraft, setEmailDraft] = useState<string>('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [broadcastComplete, setBroadcastComplete] = useState(false);
    
    // Comparison State
    const [comparisonView, setComparisonView] = useState<'matrix' | 'items'>('matrix');
    const [selectedQuoteForReview, setSelectedQuoteForReview] = useState<Quote | null>(null);
    
    // Contact Management (Temporary input state per supplier id)
    const [contactInputs, setContactInputs] = useState<Record<string, string>>({});

    // UI State
    const [isHeaderInfoOpen, setIsHeaderInfoOpen] = useState(true); 
    const prevItemCount = useRef(0);

    // Resizable Table Configuration - Initial State in Pixels
    const [tableConfig, setTableConfig] = useState<ColumnConfig[]>([
        { id: 'line', label: '#', visible: true, width: 50 },
        { id: 'product_type', label: t(lang, 'shape'), visible: true, width: 140 },
        { id: 'description', label: t(lang, 'description'), visible: true, width: 320 },
        { id: 'material_grade', label: t(lang, 'grade'), visible: true, width: 140 },
        { id: 'tolerance', label: 'Rating/Sch', visible: true, width: 110 },
        { id: 'od', label: t(lang, 'od'), visible: true, width: 100, isCustom: true }, 
        { id: 'wt', label: t(lang, 'wt'), visible: true, width: 100, isCustom: true },
        { id: 'quantity', label: t(lang, 'qty'), visible: true, width: 80 },
        { id: 'uom', label: t(lang, 'uom'), visible: true, width: 70 },
    ]);

    // Load drafts on mount
    useEffect(() => {
        setSavedRfqs(storageService.getRfqs());
        // On mobile, default sidebar to closed
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
            setIsChatOpen(false);
        }
    }, [rfq]); 

    // Auto-switch to Comparison Step if Quotes exist (e.g. after import)
    useEffect(() => {
        if (quotes && quotes.length > 0 && currentStep !== 3) {
            setCurrentStep(3);
        }
    }, [quotes]);

    // Auto-populate Email Draft when entering Broadcast step
    useEffect(() => {
        if (sourcingStep === 3 && rfq) {
            // Only regenerate if empty to avoid overwriting user edits if they step back and forth
            if (!emailDraft.trim()) {
                const link = generateRfqLink();
                
                // Build Compliance List
                const complianceList = [];
                if (rfq.commercial.req_mtr) complianceList.push("- MTR Required (EN 10204 3.1)");
                if (rfq.commercial.req_avl) complianceList.push("- Approved Vendor List (AVL) Sources Only");
                if (rfq.commercial.req_tpi) complianceList.push("- Third Party Inspection (TPI) Required");
                if (rfq.commercial.otherRequirements) complianceList.push(`- Note: ${rfq.commercial.otherRequirements}`);
                
                const complianceSection = complianceList.length > 0 
                    ? complianceList.join('\n') 
                    : "- Standard Commercial Quality";

                const defaultBody = `Subject: RFQ - ${rfq.project_name}

To: [Supplier Contact]

Hello,

We are requesting a quotation for the following project. Please review the commercial and technical requirements below.

PROJECT OVERVIEW
----------------
Project: ${rfq.project_name || "N/A"}
Description: ${rfq.project_description || "Material Supply"}
Destination: ${rfq.commercial.destination || "TBD"}

COMMERCIAL TERMS
----------------
Incoterms: ${rfq.commercial.incoterm || "Ex-Works (Default)"}
Payment Terms: ${rfq.commercial.paymentTerm || "Standard"}
Warranty: ${rfq.commercial.warranty_months || "12"} Months

COMPLIANCE & QUALITY
--------------------
${complianceSection}

SUBMISSION INSTRUCTIONS
-----------------------
Please review the line items and submit your unit prices directly using our secure bidding portal below. This ensures your quote is processed immediately.

SECURE BIDDING LINK:
${link}

Best regards,

Procurement Team`;
                setEmailDraft(defaultBody);
            }
        }
    }, [sourcingStep, rfq]);

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

    // --- COLUMN RESIZING LOGIC ---
    const startResize = (e: React.MouseEvent, colId: string) => {
        e.preventDefault();
        e.stopPropagation();
        
        const startX = e.pageX;
        const colIndex = tableConfig.findIndex(c => c.id === colId);
        if (colIndex === -1) return;
        
        const startWidth = tableConfig[colIndex].width;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const currentX = moveEvent.pageX;
            const diff = currentX - startX;
            const newWidth = Math.max(50, startWidth + diff); // Minimum width 50px

            setTableConfig(prev => {
                const newConfig = [...prev];
                newConfig[colIndex] = { ...newConfig[colIndex], width: newWidth };
                return newConfig;
            });
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = 'default';
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.body.style.cursor = 'col-resize';
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
            // Warnings are displayed via the rfq object update below or alert
            if (warnings.length > 0) {
                setRfq({
                    ...rfq,
                    audit_warnings: warnings
                });
                alert(`${t(lang, 'audit_warnings')}:\n` + warnings.join('\n'));
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

    const handleManualEntry = () => {
        const newRfq: Rfq = {
            id: `RFQ-${Date.now()}`,
            project_name: "New Material Request",
            status: 'draft',
            created_at: Date.now(),
            original_text: "Manual Entry",
            commercial: {
                destination: "",
                incoterm: "",
                paymentTerm: "",
                otherRequirements: "",
                req_mtr: true,
                req_avl: false,
                req_tpi: false,
                warranty_months: 12
            },
            line_items: [
                {
                    item_id: `L${Date.now()}`,
                    line: 1,
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
                    quantity: null,
                    uom: 'pcs',
                    other_requirements: []
                }
            ]
        };
        setRfq(newRfq);
        setIsHeaderInfoOpen(true);
        setCurrentStep(2);
        setChatHistory([]);
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

    const handleUpdateLineItem = (index: number, field: keyof LineItem | 'od' | 'wt', value: any) => {
        if (!rfq) return;
        const newItems = [...rfq.line_items];
        const item = newItems[index];

        if (field === 'od') {
            item.size = { 
                ...item.size, 
                outer_diameter: { ...item.size.outer_diameter, value: value } 
            };
        } else if (field === 'wt') {
            item.size = { 
                ...item.size, 
                wall_thickness: { ...item.size.wall_thickness, value: value } 
            };
        } else {
            // @ts-ignore
            item[field] = value;
        }
        
        setRfq({ ...rfq, line_items: newItems });
    };

    const handleDeleteItem = (index: number) => {
        if (!rfq) return;
        const newItems = rfq.line_items.filter((_, i) => i !== index);
        const reindexed = newItems.map((item, idx) => ({ ...item, line: idx + 1 }));
        setRfq({ ...rfq, line_items: reindexed });
    };

    // --- SOURCING & SHARING LOGIC ---

    const generateRfqLink = () => {
        if (!rfq) return '';
        const rfqForSupplier = {
            id: rfq.id,
            project_name: rfq.project_name,
            project_description: rfq.project_description,
            line_items: rfq.line_items.map(li => ({
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
        const urlObj = new URL(window.location.href);
        urlObj.search = '';
        urlObj.searchParams.set('mode', 'supplier');
        urlObj.searchParams.set('data', compressed);
        return urlObj.toString();
    };

    const handleOpenSourcingModal = () => {
        if (!rfq) return;
        // Don't generate draft here, do it when stepping into step 3 or user requests
        setEmailDraft(''); 
        setSourcingStep(1); 
        setSuggestedSuppliers([]); 
        setShowShareModal(true);
        setBroadcastComplete(false);
    };

    const handlePreviewSupplierPortal = () => {
        const link = generateRfqLink();
        if (link) {
             window.open(link, '_blank');
        } else {
             alert("Could not generate link. Please ensure RFQ data is valid.");
        }
    };

    const toggleFilter = (category: keyof SupplierFilters, value: string) => {
        setSourcingFilters(prev => {
            const current = prev[category] as string[];
            if (current.includes(value)) {
                return { ...prev, [category]: current.filter(v => v !== value) };
            } else {
                return { ...prev, [category]: [...current, value] };
            }
        });
    };

    const handleFindSuppliers = async () => {
        if (!rfq) return;
        setIsSourcing(true);
        try {
            const results = await findSuppliers(rfq, sourcingFilters);
            setSuggestedSuppliers(results);
        } catch (e) {
            console.error("Failed to find suppliers", e);
        } finally {
            setIsSourcing(false);
        }
    };

    const toggleSupplierSelection = (id: string) => {
        setSuggestedSuppliers(prev => prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s));
    };

    const handleAddContact = (supplierId: string) => {
        const contact = contactInputs[supplierId]?.trim();
        if (!contact) return;
        
        setSuggestedSuppliers(prev => prev.map(s => {
            if (s.id === supplierId) {
                return { ...s, contacts: [...(s.contacts || []), contact] };
            }
            return s;
        }));
        setContactInputs(prev => ({ ...prev, [supplierId]: '' }));
    };

    const handleRemoveContact = (supplierId: string, contactIndex: number) => {
        setSuggestedSuppliers(prev => prev.map(s => {
            if (s.id === supplierId) {
                const newContacts = [...(s.contacts || [])];
                newContacts.splice(contactIndex, 1);
                return { ...s, contacts: newContacts };
            }
            return s;
        }));
    };

    const handleAddManualSupplier = () => {
        if (!manualSupplierEmail) return;
        const newSup: SupplierCandidate = {
            id: `MANUAL-${Date.now()}`,
            name: "Manual Contact",
            email: manualSupplierEmail,
            contacts: [manualSupplierEmail],
            match_reason: "Manually added by user",
            selected: true,
            location: "N/A",
            sendStatus: 'idle'
        };
        setSuggestedSuppliers(prev => [...prev, newSup]);
        setManualSupplierEmail('');
    };

    const handleBroadcastRfq = async () => {
        const selected = suggestedSuppliers.filter(s => s.selected);
        if (selected.length === 0) return;

        setIsBroadcasting(true);
        setBroadcastComplete(false);

        // Reset statuses
        setSuggestedSuppliers(prev => prev.map(s => s.selected ? { ...s, sendStatus: 'idle' } : s));

        // Simulate sending process one by one
        for (const supplier of selected) {
            setSuggestedSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, sendStatus: 'sending' } : s));
            await new Promise(r => setTimeout(r, 800 + Math.random() * 800));
            setSuggestedSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, sendStatus: 'sent' } : s));
        }

        setIsBroadcasting(false);
        setBroadcastComplete(true);
        
        // No longer set email draft here as it's done before sending

        if (rfq) {
            setRfq({ ...rfq, status: 'sent', invited_suppliers: selected }); 
            storageService.saveRfq({ ...rfq, status: 'sent', invited_suppliers: selected });
        }
    };

    // Helper for Bid Evaluation Logic
    const getBestPriceId = () => {
        if (!quotes.length) return null;
        return quotes.reduce((prev, curr) => prev.total < curr.total ? prev : curr).id;
    };

    const getFastestLeadTimeId = () => {
        if (!quotes.length) return null;
        return quotes.reduce((prev, curr) => {
            const prevLt = parseInt(prev.leadTime) || 999;
            const currLt = parseInt(curr.leadTime) || 999;
            return prevLt < currLt ? prev : curr;
        }).id;
    };

    const getRecommendation = () => {
        if (!quotes.length) return "Waiting for quotes...";
        const bestPrice = quotes.find(q => q.id === getBestPriceId());
        const fastest = quotes.find(q => q.id === getFastestLeadTimeId());
        
        if (bestPrice?.id === fastest?.id) {
            return `Clear Winner: ${bestPrice?.supplierName} offers both the best price and fastest delivery.`;
        }
        return `Trade-off: ${bestPrice?.supplierName} is cheapest, but ${fastest?.supplierName} delivers faster.`;
    };

    const handleGenerateAwardPO = (winningQuote: Quote) => {
        if (!rfq) return;
        
        try {
            const doc = new jsPDF();
            doc.setFontSize(22);
            doc.text("PURCHASE ORDER", 14, 20);
            
            doc.setFontSize(10);
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
            doc.text("VENDOR:", 14, startY);
            doc.text(winningQuote.supplierName, 14, startY + 5);
            
            doc.text("DELIVERY TO:", 110, startY);
            doc.text(rfq.commercial.destination || "See Below", 110, startY + 5);
            
            doc.text("Project Ref:", 14, startY + 25);
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

            // Safer invocation for jspdf-autotable
            // @ts-ignore
            if (typeof doc.autoTable === 'function') {
                 // @ts-ignore
                 doc.autoTable({
                    startY: startY + 30,
                    head: [['Description', 'OD', 'Qty', 'UOM', 'Unit Price', 'Amount']],
                    body: tableBody,
                    theme: 'grid',
                    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
                    styles: { fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1, valign: 'middle' },
                });
            } else {
                try {
                    autoTable(doc, {
                        startY: startY + 30,
                        head: [['Description', 'OD', 'Qty', 'UOM', 'Unit Price', 'Amount']],
                        body: tableBody,
                        theme: 'grid',
                        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
                        styles: { fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1, valign: 'middle' },
                    });
                } catch(e) {
                    console.error("Autotable fail", e);
                }
            }

            // @ts-ignore
            let finalY = (doc as any).lastAutoTable?.finalY || startY + 100;
            doc.setFontSize(10);
            doc.text("TOTAL:", 140, finalY + 5);
            doc.text(`${winningQuote.currency} ${winningQuote.total.toLocaleString(undefined, {minimumFractionDigits: 2})}`, 170, finalY + 5, { align: 'right' });

            doc.save(`PO_${rfq.id}_${winningQuote.supplierName.replace(/\s+/g, '_')}.pdf`);
        } catch (e) {
            console.error("PDF Generation failed", e);
            alert("Could not generate PDF. Please ensure browser supports blobs.");
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-full min-h-screen gap-0 relative pb-20 lg:pb-0">
            
            {/* TOP BAR: STEPS & NAVIGATION (MOBILE ONLY) */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0 lg:absolute lg:top-0 lg:left-0 lg:w-full lg:z-10 lg:bg-slate-50 lg:hidden bg-white border-b border-slate-200">
                <span className="font-bold text-slate-800 text-sm">{rfq ? rfq.project_name : 'New Project'}</span>
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
                <div className={`transition-all duration-300 ease-in-out flex flex-col gap-4 relative z-20 ${isSidebarOpen ? 'w-full lg:w-64 opacity-100 h-auto lg:h-full min-h-0' : 'w-0 h-0 lg:h-full opacity-0 overflow-hidden lg:ml-[-1rem] hidden lg:flex'}`}>
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
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${r.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {r.status === 'sent' ? 'Sent' : `${r.line_items.length} items`}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: DRAFTING ASSISTANT (COLLAPSIBLE) */}
                <div className={`transition-all duration-300 ease-in-out flex flex-col gap-4 relative z-20 ${isChatOpen ? 'w-full lg:w-[350px] lg:min-w-[300px] lg:max-w-[400px] opacity-100' : 'w-0 opacity-0 overflow-hidden lg:ml-[-1rem] hidden lg:flex'}`}>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden h-[500px] lg:h-auto">
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 flex items-center justify-center bg-slate-900 text-white rounded-full text-[10px] font-bold">1</span>
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{t(lang, 'drafting_assistant')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                {!isSidebarOpen && (
                                    <button 
                                        onClick={() => setIsSidebarOpen(true)}
                                        className="p-1 hover:bg-slate-200 rounded text-slate-500 hidden lg:block"
                                        title="Show Sidebar"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                    </button>
                                )}
                                <button 
                                    onClick={() => setIsChatOpen(false)}
                                    className="p-1 hover:bg-slate-200 rounded text-slate-500 hidden lg:block"
                                    title="Hide Chat"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
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
                    
                    {/* ENHANCED SOURCING MODAL */}
                    {showShareModal && (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in p-4">
                            <div className="bg-white w-full max-w-7xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                                {/* Header */}
                                <div className="border-b border-slate-100 bg-white px-6 py-3 flex justify-between items-center shadow-sm z-10 shrink-0">
                                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-brandOrange/10 flex items-center justify-center text-brandOrange">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        </div>
                                        <div>
                                            <span className="block leading-none">Distribute RFQ</span>
                                            <span className="text-xs text-slate-400 font-normal block">Find and invite suppliers to quote</span>
                                        </div>
                                    </h2>
                                    <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-900 bg-slate-50 p-2 rounded-full hover:bg-slate-200 transition">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                {/* Stepper */}
                                <div className="bg-slate-50 border-b border-slate-200 py-2 shrink-0">
                                    <div className="max-w-3xl mx-auto flex items-center justify-between px-8 relative">
                                        <div className="absolute left-8 right-8 top-1/2 h-0.5 bg-slate-200 -z-10"></div>
                                        <div className="absolute left-8 h-0.5 bg-brandOrange -z-10 transition-all duration-500" style={{ right: sourcingStep === 1 ? '100%' : sourcingStep === 2 ? '50%' : '2rem' }}></div>

                                        {[1, 2, 3].map((step, idx) => {
                                            const labels = ['Smart Discovery', 'Review Contacts', 'Broadcast'];
                                            const isActive = sourcingStep >= step;
                                            const isCurrent = sourcingStep === step;
                                            return (
                                                <div key={step} className="flex flex-col items-center gap-1 cursor-pointer bg-slate-50 px-2" onClick={() => step < sourcingStep ? setSourcingStep(step as any) : null}>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${isActive ? 'bg-brandOrange border-brandOrange text-white shadow-lg' : 'bg-white border-slate-300 text-slate-400'}`}>
                                                        {step}
                                                    </div>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isCurrent ? 'text-brandOrange' : 'text-slate-400'}`}>{labels[idx]}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Main Content Area */}
                                <div className="flex-1 overflow-hidden flex bg-slate-50/30">
                                    
                                    {/* STEP 1: DISCOVER */}
                                    {sourcingStep === 1 && (
                                        <div className="flex-1 flex flex-col md:flex-row h-full animate-in fade-in slide-in-from-right-4 duration-300">
                                            
                                            {/* Left: Enhanced Filters */}
                                            <div className="w-full md:w-80 bg-white border-r border-slate-200 p-6 overflow-y-auto shrink-0">
                                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6">Discovery Filters</h3>
                                                
                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Region</label>
                                                        <select 
                                                            value={sourcingFilters.region} 
                                                            onChange={(e) => setSourcingFilters({...sourcingFilters, region: e.target.value})} 
                                                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brandOrange/20 focus:border-brandOrange outline-none transition font-medium text-sm"
                                                        >
                                                            <option value="">Global (AI Best Value)</option>
                                                            <option value="USA">USA / North America</option>
                                                            <option value="Europe">Europe</option>
                                                            <option value="Asia">Asia (LCC)</option>
                                                            <option value="Middle East">Middle East</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Supplier Type</label>
                                                        <div className="space-y-2">
                                                            {['Manufacturer', 'Stockist / Distributor', 'Machine Shop'].map(type => (
                                                                <label key={type} className="flex items-center gap-2 cursor-pointer group">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={sourcingFilters.types.includes(type)}
                                                                        onChange={() => toggleFilter('types', type)}
                                                                        className="w-4 h-4 rounded border-slate-300 text-brandOrange focus:ring-brandOrange"
                                                                    />
                                                                    <span className="text-sm text-slate-700 group-hover:text-brandOrange transition-colors">{type}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Certifications</label>
                                                        <div className="space-y-2">
                                                            {['ISO 9001', 'API 5L', 'ASME Stamp', 'PED 2014/68/EU'].map(cert => (
                                                                <label key={cert} className="flex items-center gap-2 cursor-pointer group">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={sourcingFilters.certs.includes(cert)}
                                                                        onChange={() => toggleFilter('certs', cert)}
                                                                        className="w-4 h-4 rounded border-slate-300 text-brandOrange focus:ring-brandOrange"
                                                                    />
                                                                    <span className="text-sm text-slate-700 group-hover:text-brandOrange transition-colors">{cert}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <button 
                                                        onClick={handleFindSuppliers} 
                                                        disabled={isSourcing}
                                                        className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition flex items-center justify-center gap-2 disabled:opacity-70 mt-4"
                                                    >
                                                        {isSourcing ? (
                                                            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Scouting...</>
                                                        ) : (
                                                            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> Find Suppliers</>
                                                        )}
                                                    </button>
                                                </div>
                                                
                                                {/* Manual Add Small */}
                                                <div className="mt-8 pt-6 border-t border-slate-100">
                                                    <p className="text-xs text-slate-400 mb-2">Know someone?</p>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text" 
                                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-brandOrange"
                                                            placeholder="supplier@email.com"
                                                            value={manualSupplierEmail}
                                                            onChange={(e) => setManualSupplierEmail(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleAddManualSupplier()}
                                                        />
                                                        <button onClick={handleAddManualSupplier} className="bg-slate-100 hover:bg-slate-200 text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center font-bold transition">+</button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right: Results Grid */}
                                            <div className="flex-1 p-8 overflow-y-auto">
                                                {suggestedSuppliers.length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
                                                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                        </div>
                                                        <p className="font-bold text-lg text-slate-600">Start Scouting</p>
                                                        <p className="text-sm mt-2 max-w-xs text-center">Use the filters on the left to find AI-verified suppliers that match your project requirements.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                        {suggestedSuppliers.map(s => (
                                                            <div 
                                                                key={s.id} 
                                                                onClick={() => toggleSupplierSelection(s.id)} 
                                                                className={`p-6 rounded-2xl border transition-all cursor-pointer group hover:shadow-lg relative overflow-hidden flex flex-col ${s.selected ? 'border-brandOrange bg-white shadow-lg shadow-orange-500/5 ring-1 ring-brandOrange' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                                            >
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-brandOrange transition-colors line-clamp-1">{s.name}</h3>
                                                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors shrink-0 ${s.selected ? 'bg-brandOrange border-brandOrange text-white' : 'border-slate-300'}`}>
                                                                        {s.selected && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="flex-1">
                                                                    {s.location && <div className="text-sm text-slate-500 mb-1 flex items-center gap-1.5"><svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{s.location}</div>}
                                                                    
                                                                    {s.website && s.website !== 'N/A' && (
                                                                        <a href={s.website.startsWith('http') ? s.website : `https://${s.website}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 mb-3 ml-0.5">
                                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                                            {s.website}
                                                                        </a>
                                                                    )}

                                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                                        {s.tags?.map((tag, i) => (
                                                                            <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">{tag}</span>
                                                                        ))}
                                                                    </div>

                                                                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic leading-relaxed">
                                                                        "{s.match_reason}"
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 2: REVIEW */}
                                    {sourcingStep === 2 && (
                                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300 w-full p-8 overflow-y-auto">
                                            <div className="max-w-4xl mx-auto w-full">
                                                <h3 className="font-bold text-2xl text-slate-900 mb-2">Review Contacts</h3>
                                                <p className="text-slate-500 mb-8">Ensure we have the correct email addresses for your selected suppliers.</p>
                                                
                                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                                        <span className="font-bold text-slate-700">{suggestedSuppliers.filter(s => s.selected).length} Recipients Selected</span>
                                                    </div>
                                                    <div className="divide-y divide-slate-100">
                                                        {suggestedSuppliers.filter(s => s.selected).map(s => (
                                                            <div key={s.id} className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                                                                <div className="flex-1">
                                                                    <div className="font-bold text-lg text-slate-900">{s.name}</div>
                                                                    <div className="text-sm text-slate-500">{s.location || "Location Unknown"}</div>
                                                                </div>
                                                                
                                                                <div className="flex-1 w-full">
                                                                    <div className="flex flex-wrap gap-2 mb-3">
                                                                        {s.contacts && s.contacts.map((c, i) => (
                                                                            <div key={i} className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1.5 rounded-full text-sm flex items-center gap-2 font-medium">
                                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                                                {c}
                                                                                <button onClick={() => handleRemoveContact(s.id, i)} className="hover:text-blue-900 font-bold ml-1">×</button>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                    <div className="flex gap-2">
                                                                        <input 
                                                                            placeholder="Add contact email..." 
                                                                            className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-brandOrange transition bg-slate-50 focus:bg-white" 
                                                                            value={contactInputs[s.id] || ''} 
                                                                            onChange={e => setContactInputs({...contactInputs, [s.id]: e.target.value})}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') handleAddContact(s.id);
                                                                            }}
                                                                        />
                                                                        <button onClick={() => handleAddContact(s.id)} className="bg-slate-900 text-white px-5 rounded-xl text-sm font-bold hover:bg-slate-800 transition">Add</button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 3: BROADCAST */}
                                    {sourcingStep === 3 && (
                                        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300 w-full overflow-hidden">
                                            
                                            {!isBroadcasting && !broadcastComplete ? (
                                                <div className="flex flex-col h-full w-full max-w-5xl mx-auto px-6 py-4">
                                                    <div className="shrink-0 mb-4 text-center">
                                                        <h2 className="text-xl font-bold text-slate-900 mb-1">Ready to Broadcast</h2>
                                                        <p className="text-sm text-slate-500">Sending to <span className="font-bold text-slate-900">{suggestedSuppliers.filter(s => s.selected).length} suppliers</span>.</p>
                                                    </div>
                                                    
                                                    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden mb-2">
                                                        <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex justify-between items-center shrink-0">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Email Preview</label>
                                                            <div className="flex gap-1">
                                                                <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                                                <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                                                                <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                                                            </div>
                                                        </div>
                                                        <textarea
                                                            className="w-full flex-1 p-6 text-sm text-slate-700 font-mono focus:bg-white focus:outline-none resize-none leading-relaxed transition-all"
                                                            value={emailDraft}
                                                            onChange={(e) => setEmailDraft(e.target.value)}
                                                            placeholder="Loading draft..."
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-full max-w-2xl mx-auto mt-12 bg-white rounded-2xl border border-slate-200 shadow-xl p-8">
                                                    <div className="flex items-center justify-between mb-8">
                                                        <h3 className="font-bold text-slate-900 text-xl">Transmission Status</h3>
                                                        {broadcastComplete ? (
                                                            <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100 flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div>COMPLETE</span>
                                                        ) : (
                                                            <span className="text-xs font-bold text-brandOrange bg-orange-50 px-3 py-1 rounded-full border border-orange-100 animate-pulse flex items-center gap-2"><div className="w-2 h-2 bg-brandOrange rounded-full"></div>SENDING...</span>
                                                        )}
                                                    </div>
                                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                                        {suggestedSuppliers.filter(s => s.selected).map(s => (
                                                            <div key={s.id} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition rounded-lg">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                                                        s.sendStatus === 'sent' ? 'bg-green-100 text-green-600' : 
                                                                        s.sendStatus === 'sending' ? 'bg-brandOrange text-white' : 
                                                                        'bg-slate-100 text-slate-300'
                                                                    }`}>
                                                                        {s.sendStatus === 'sent' ? (
                                                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                                        ) : s.sendStatus === 'sending' ? (
                                                                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                                        ) : (
                                                                            <span className="font-bold text-sm">●</span>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className={`font-bold ${s.sendStatus === 'sent' ? 'text-slate-900' : 'text-slate-500'}`}>{s.name}</div>
                                                                        <div className="text-xs text-slate-400">{s.email || "Primary Contact"}</div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">
                                                                    {s.sendStatus === 'sent' ? 'SENT' : s.sendStatus === 'sending' ? 'TRANSMITTING...' : 'PENDING'}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    
                                                    {broadcastComplete && (
                                                        <div className="mt-8 pt-6 border-t border-slate-100 text-center animate-in fade-in slide-in-from-bottom-2">
                                                            <div className="flex justify-center gap-4">
                                                                <button onClick={() => setShowShareModal(false)} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg">Return to Dashboard</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Footer Actions */}
                                <div className="border-t border-slate-200 bg-white p-4 z-10 flex justify-between items-center shrink-0">
                                    <button 
                                        onClick={() => sourcingStep > 1 && setSourcingStep((sourcingStep - 1) as any)}
                                        disabled={sourcingStep === 1 || isBroadcasting}
                                        className={`text-slate-500 font-bold text-sm px-4 py-2 hover:bg-slate-50 rounded-lg transition ${sourcingStep === 1 ? 'invisible' : ''}`}
                                    >
                                        ← Back
                                    </button>

                                    {sourcingStep < 3 ? (
                                        <button 
                                            onClick={() => setSourcingStep((sourcingStep + 1) as any)}
                                            disabled={suggestedSuppliers.filter(s => s.selected).length === 0}
                                            className="bg-brandOrange text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            Next Step →
                                        </button>
                                    ) : (
                                        !broadcastComplete && !isBroadcasting && (
                                            <button 
                                                onClick={handleBroadcastRfq}
                                                className="bg-green-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-green-500/20 hover:bg-green-700 transition flex items-center gap-2"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                                Launch Broadcast
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* RISK MODAL */}
                    {showRiskModal && rfq?.risks && (
                        <div className="fixed inset-0 bg-white/95 z-[100] p-6 flex flex-col animate-in fade-in zoom-in-95 backdrop-blur-md">
                            <div className="w-full h-full max-w-5xl mx-auto flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-sm">⚠</span>
                                        Risk Analysis Report
                                    </h2>
                                    <button onClick={() => setShowRiskModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full transition">×</button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                                    {rfq.risks.map((risk, idx) => (
                                        <div key={idx} className={`p-5 rounded-2xl border flex gap-4 transition-all hover:shadow-md ${risk.impact_level === 'High' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                                            <div className={`w-1.5 self-stretch rounded-full ${risk.impact_level === 'High' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className={`font-bold ${risk.impact_level === 'High' ? 'text-red-800' : 'text-amber-800'}`}>{risk.risk}</h3>
                                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${risk.impact_level === 'High' ? 'bg-red-200/50 text-red-700' : 'bg-amber-200/50 text-amber-700'}`}>{risk.category}</span>
                                                </div>
                                                <p className="text-sm text-slate-700 mb-4 leading-relaxed">{risk.recommendation}</p>
                                                <div className="flex gap-3">
                                                    <button onClick={() => handleMitigateRisk(risk, idx)} className="text-xs font-bold px-4 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-sm text-slate-700">Apply Fix</button>
                                                    <button onClick={() => handleIgnoreRisk(idx)} className="text-xs text-slate-400 hover:text-slate-600 px-2 font-medium">Dismiss</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SUPPLIER DETAILS MODAL */}
                    {selectedQuoteForReview && (
                        <div className="fixed inset-0 z-[150] bg-black/20 backdrop-blur-sm flex justify-end animate-in fade-in">
                            <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{selectedQuoteForReview.supplierName}</h2>
                                        <p className="text-sm text-slate-500">Quote Ref: {selectedQuoteForReview.id}</p>
                                    </div>
                                    <button onClick={() => setSelectedQuoteForReview(null)} className="p-2 hover:bg-slate-100 rounded-full">×</button>
                                </div>
                                
                                <div className="space-y-6">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <h3 className="text-xs font-bold uppercase text-slate-500 mb-3">Commercial Terms</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between"><span className="text-slate-600">Total:</span> <span className="font-bold text-slate-900">{selectedQuoteForReview.currency} {selectedQuoteForReview.total.toLocaleString()}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-600">Lead Time:</span> <span className="font-medium">{selectedQuoteForReview.leadTime} Days</span></div>
                                            <div className="flex justify-between"><span className="text-slate-600">Payment:</span> <span className="font-medium">{selectedQuoteForReview.payment}</span></div>
                                            <div className="flex justify-between"><span className="text-slate-600">Validity:</span> <span className="font-medium">{selectedQuoteForReview.validity}</span></div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold uppercase text-slate-500 mb-3">Notes</h3>
                                        <p className="text-sm text-slate-700 bg-white border border-slate-200 p-3 rounded-lg leading-relaxed">
                                            {selectedQuoteForReview.notes || "No notes provided."}
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold uppercase text-slate-500 mb-3">Attachments</h3>
                                        {selectedQuoteForReview.attachments && selectedQuoteForReview.attachments.length > 0 ? (
                                            <div className="space-y-2">
                                                {selectedQuoteForReview.attachments.map((file, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                                                        <div className="w-8 h-8 bg-red-50 text-red-500 rounded flex items-center justify-center font-bold text-[10px]">PDF</div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium truncate">{file.name || `Document ${i+1}`}</div>
                                                            <div className="text-xs text-slate-400">{(file.data.length / 1024).toFixed(0)} KB</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400 italic">No files attached.</p>
                                        )}
                                    </div>
                                    
                                    <div className="pt-6 border-t border-slate-100">
                                        <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition">Contact Supplier</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {!rfq ? (
                        // STEP 1: EMPTY DASHBOARD
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:p-12 flex flex-col items-center justify-center animate-in fade-in">
                            {/* ... (Dashboard Buttons) ... */}
                            <h2 className="text-2xl font-bold text-slate-900 mb-3">{t(lang, 'dashboard_title')}</h2>
                            <p className="text-slate-500 text-sm mb-12 text-center max-w-md leading-relaxed">Select an option below to initialize your procurement process.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                                <button onClick={() => { setIsChatOpen(true); document.querySelector('textarea')?.focus(); }} className="group p-8 rounded-2xl border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-200 transition-all flex flex-col items-center text-center gap-6 shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300">
                                    <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 text-lg mb-1">Natural Language</div>
                                        <div className="text-sm text-slate-500">Type unstructured requirements</div>
                                    </div>
                                </button>
                                <button onClick={() => fileInputRef.current?.click()} className="group p-8 rounded-2xl border border-slate-200 bg-white hover:bg-green-50 hover:border-green-200 transition-all flex flex-col items-center text-center gap-6 shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300">
                                    <div className="w-16 h-16 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 text-lg mb-1">Upload Spec/MTO</div>
                                        <div className="text-sm text-slate-500">Extract from PDF, Excel, Images</div>
                                    </div>
                                </button>
                                <button onClick={handleManualEntry} className="group p-8 rounded-2xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-200 transition-all flex flex-col items-center text-center gap-6 shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 text-lg mb-1">Manual Entry</div>
                                        <div className="text-sm text-slate-500">Start from a blank sheet</div>
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
                                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                            <div onClick={() => setIsHeaderInfoOpen(!isHeaderInfoOpen)} className="cursor-pointer group flex-1">
                                                <div className="flex items-center gap-1">
                                                    {!isChatOpen && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setIsChatOpen(true); }}
                                                            className="p-1 hover:bg-slate-200 rounded text-slate-500 mr-2"
                                                            title="Show Assistant"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                                        </button>
                                                    )}
                                                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 group-hover:text-blue-600 transition">
                                                        {rfq.project_name || "Untitled Project"}
                                                        <div className={`p-1 rounded-full bg-slate-200 transition-transform duration-300 ${isHeaderInfoOpen ? 'rotate-180' : ''}`}>
                                                            <svg className="w-3 h-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                        </div>
                                                    </h2>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">Created: {new Date(rfq.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                                                <button onClick={handlePreviewSupplierPortal} className="flex-1 lg:flex-none px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-purple-600 hover:border-purple-200 transition shadow-sm flex items-center justify-center gap-1.5">
                                                    <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                    Response Portal
                                                </button>
                                                <button onClick={handleAuditSpecs} disabled={isAuditing} className="flex-1 lg:flex-none px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-blue-600 hover:border-blue-200 transition shadow-sm flex items-center justify-center gap-1.5">
                                                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    {isAuditing ? 'Auditing...' : t(lang, 'audit_specs')}
                                                </button>
                                                <button onClick={handleRiskAnalysis} disabled={isRiskAnalyzing} className="flex-1 lg:flex-none px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-amber-600 hover:border-amber-200 transition shadow-sm flex items-center justify-center gap-1.5">
                                                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                    {isRiskAnalyzing ? 'Analyzing...' : 'Analyze Risks'}
                                                </button>
                                                <button onClick={handleOpenSourcingModal} className="flex-1 lg:flex-none px-6 py-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-lg text-xs font-bold hover:shadow-lg hover:shadow-slate-500/20 transition flex items-center justify-center gap-2 border border-slate-900">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                    Sourcing & Send
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {/* Collapsible Header Info */}
                                        {isHeaderInfoOpen && (
                                            <div id="commercial-section" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 animate-in slide-in-from-top-2 border-t border-slate-200 mt-2">
                                                {/* ... (Existing Commercial Fields) ... */}
                                                <div className="bg-white p-3 rounded-lg border border-slate-200 group hover:border-blue-300 transition-colors">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1 group-hover:text-blue-500 transition-colors">Project Name</label>
                                                    <input 
                                                        className="w-full text-sm font-medium outline-none bg-transparent text-slate-700" 
                                                        value={rfq.project_name || ''} 
                                                        onChange={(e) => setRfq({...rfq, project_name: e.target.value})}
                                                    />
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-slate-200 group hover:border-blue-300 transition-colors">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1 group-hover:text-blue-500 transition-colors">{t(lang, 'destination')}</label>
                                                    <input 
                                                        className="w-full text-sm font-medium outline-none bg-transparent text-slate-700" 
                                                        value={rfq.commercial.destination} 
                                                        onChange={(e) => setRfq({...rfq, commercial: {...rfq.commercial, destination: e.target.value}})}
                                                    />
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-slate-200 group hover:border-blue-300 transition-colors">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1 group-hover:text-blue-500 transition-colors">{t(lang, 'incoterm')}</label>
                                                    <input 
                                                        className="w-full text-sm font-medium outline-none bg-transparent text-slate-700" 
                                                        value={rfq.commercial.incoterm} 
                                                        onChange={(e) => setRfq({...rfq, commercial: {...rfq.commercial, incoterm: e.target.value}})}
                                                    />
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-slate-200 group hover:border-blue-300 transition-colors">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1 group-hover:text-blue-500 transition-colors">{t(lang, 'payment')}</label>
                                                    <input 
                                                        className="w-full text-sm font-medium outline-none bg-transparent text-slate-700" 
                                                        value={rfq.commercial.paymentTerm} 
                                                        onChange={(e) => setRfq({...rfq, commercial: {...rfq.commercial, paymentTerm: e.target.value}})}
                                                    />
                                                </div>

                                                {/* NEW: Extended Description & Notes */}
                                                <div className="col-span-1 md:col-span-2 bg-white p-3 rounded-lg border border-slate-200 group hover:border-blue-300 transition-colors">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1 group-hover:text-blue-500 transition-colors">Project Description</label>
                                                    <input 
                                                        className="w-full text-sm font-medium outline-none bg-transparent text-slate-700" 
                                                        value={rfq.project_description || ''} 
                                                        onChange={(e) => setRfq({...rfq, project_description: e.target.value})}
                                                        placeholder="Brief scope of work..."
                                                    />
                                                </div>
                                                <div className="col-span-1 md:col-span-2 bg-white p-3 rounded-lg border border-slate-200 group hover:border-blue-300 transition-colors">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1 group-hover:text-blue-500 transition-colors">Special Requirements</label>
                                                    <input 
                                                        className="w-full text-sm font-medium outline-none bg-transparent text-slate-700" 
                                                        value={rfq.commercial.otherRequirements || ''} 
                                                        onChange={(e) => setRfq({...rfq, commercial: {...rfq.commercial, otherRequirements: e.target.value}})}
                                                        placeholder="e.g. Positive Material Identification (PMI)"
                                                    />
                                                </div>
                                                
                                                {/* Compliance Standards Toggles */}
                                                <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-white p-4 rounded-lg border border-slate-200 mt-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-3">Compliance Requirements</label>
                                                    <div className="flex flex-wrap gap-6">
                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rfq.commercial.req_mtr ? 'bg-brandOrange border-brandOrange' : 'border-slate-300 bg-white group-hover:border-brandOrange'}`}>
                                                                {rfq.commercial.req_mtr && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                            </div>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={rfq.commercial.req_mtr} 
                                                                onChange={(e) => setRfq({...rfq, commercial: {...rfq.commercial, req_mtr: e.target.checked}})}
                                                                className="hidden"
                                                            />
                                                            <span className="text-xs font-bold text-slate-700 group-hover:text-brandOrange transition-colors">MTR (EN 10204 3.1)</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rfq.commercial.req_avl ? 'bg-brandOrange border-brandOrange' : 'border-slate-300 bg-white group-hover:border-brandOrange'}`}>
                                                                {rfq.commercial.req_avl && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                            </div>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={rfq.commercial.req_avl} 
                                                                onChange={(e) => setRfq({...rfq, commercial: {...rfq.commercial, req_avl: e.target.checked}})}
                                                                className="hidden"
                                                            />
                                                            <span className="text-xs font-bold text-slate-700 group-hover:text-brandOrange transition-colors">AVL Restricted</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer group">
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rfq.commercial.req_tpi ? 'bg-brandOrange border-brandOrange' : 'border-slate-300 bg-white group-hover:border-brandOrange'}`}>
                                                                {rfq.commercial.req_tpi && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                            </div>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={rfq.commercial.req_tpi} 
                                                                onChange={(e) => setRfq({...rfq, commercial: {...rfq.commercial, req_tpi: e.target.checked}})}
                                                                className="hidden"
                                                            />
                                                            <span className="text-xs font-bold text-slate-700 group-hover:text-brandOrange transition-colors">Third Party Inspection (TPI)</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Main Table (Same as before) */}
                                    <div className="flex-1 overflow-auto relative">
                                        <table className="w-full text-left border-collapse min-w-[800px]">
                                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                <tr>
                                                    {tableConfig.filter(c => c.visible).map(col => (
                                                        <th 
                                                            key={col.id} 
                                                            className="p-3 border-b border-r border-slate-200 last:border-r-0 whitespace-nowrap bg-slate-50 relative group select-none transition-colors"
                                                            style={{ width: col.width, minWidth: col.width }}
                                                        >
                                                            {col.label}
                                                            <div 
                                                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-brandOrange/50 group-hover:bg-slate-300 transition-colors z-10"
                                                                onMouseDown={(e) => startResize(e, col.id)}
                                                            />
                                                        </th>
                                                    ))}
                                                    <th className="p-3 border-b border-slate-200 w-10"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-sm divide-y divide-slate-100">
                                                {rfq.line_items.map((item, idx) => (
                                                    <tr key={item.item_id} className="group hover:bg-blue-50/30 transition-colors odd:bg-white even:bg-slate-50/50">
                                                        {/* ... (Existing Line Item Rows) ... */}
                                                        {tableConfig.filter(c => c.visible).map(col => (
                                                            <td key={col.id} className="p-0 border-r border-slate-100 last:border-r-0 relative">
                                                                {col.id === 'line' ? (
                                                                    <div className="p-2 text-center text-slate-400 font-mono text-xs select-none">{item.line}</div>
                                                                ) : col.id === 'od' ? (
                                                                    <div className="flex items-center h-full">
                                                                        <input 
                                                                            className="w-full h-full px-3 py-2 bg-transparent outline-none focus:bg-white focus:ring-inset focus:ring-2 focus:ring-blue-500/20 text-slate-700 placeholder-slate-300 text-xs font-mono transition-all"
                                                                            value={item.size.outer_diameter.value || ''}
                                                                            onChange={(e) => handleUpdateLineItem(idx, 'od', e.target.value)}
                                                                            placeholder="OD"
                                                                        />
                                                                        <span className="text-[10px] text-slate-400 px-1 select-none">{item.size.outer_diameter.unit}</span>
                                                                    </div>
                                                                ) : col.id === 'wt' ? (
                                                                    <div className="flex items-center h-full border-l border-dashed border-slate-200">
                                                                        <input 
                                                                            className="w-full h-full px-3 py-2 bg-transparent outline-none focus:bg-white focus:ring-inset focus:ring-2 focus:ring-blue-500/20 text-slate-700 placeholder-slate-300 text-xs font-mono transition-all"
                                                                            value={item.size.wall_thickness.value || ''}
                                                                            onChange={(e) => handleUpdateLineItem(idx, 'wt', e.target.value)}
                                                                            placeholder="WT"
                                                                        />
                                                                        <span className="text-[10px] text-slate-400 px-1 select-none">{item.size.wall_thickness.unit}</span>
                                                                    </div>
                                                                ) : (
                                                                    <input 
                                                                        id={`cell-${col.id}-${idx}`}
                                                                        className="w-full h-full px-3 py-3 bg-transparent outline-none focus:bg-white focus:ring-inset focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-700 placeholder-slate-300 text-xs"
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
                                        
                                        <button onClick={handleAddItem} className="w-full p-4 text-slate-400 text-xs font-bold uppercase tracking-wide hover:bg-slate-50 hover:text-blue-600 transition border-t border-slate-100 flex items-center justify-center gap-2">
                                            <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                            </div>
                                            {t(lang, 'add_line_item')}
                                        </button>
                                    </div>
                                    
                                    {quotes.length > 0 && (
                                        <div className="p-4 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] flex justify-between items-center animate-in slide-in-from-bottom-2 sticky bottom-0 z-20">
                                            <div className="text-sm font-medium text-slate-600">
                                                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded mr-2">{quotes.length}</span> Quotes Received
                                            </div>
                                            <button 
                                                onClick={() => setCurrentStep(3)}
                                                className="bg-brandOrange text-white px-8 py-2.5 rounded-lg font-bold shadow-lg shadow-orange-500/20 hover:bg-orange-600 hover:-translate-y-0.5 transition flex items-center gap-2"
                                            >
                                                Compare Quotes →
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* --- STEP 3: COMPARE & EVALUATE (ENHANCED BID LEVELLING BOARD) --- */}
                            {currentStep === 3 && (
                                <div className="flex flex-col h-full bg-slate-50">
                                    <div className="p-4 border-b border-slate-200 bg-white shadow-sm z-20">
                                        <div className="flex justify-between items-center mb-4">
                                            <div>
                                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                                    Bid Levelling Board
                                                    <span className={`text-xs font-normal px-2 py-0.5 rounded-full ${quotes.length > 0 ? 'text-blue-700 bg-blue-100' : 'text-amber-600 bg-amber-50'}`}>
                                                        {quotes.length > 0 ? 'Reviewing Offers' : 'Awaiting Responses'}
                                                    </span>
                                                </h2>
                                                <p className="text-xs text-slate-500 mt-1">Real-time analysis of incoming supplier data.</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setComparisonView('matrix')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${comparisonView === 'matrix' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Commercial Matrix</button>
                                                <button onClick={() => setComparisonView('items')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${comparisonView === 'items' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Line Item Details</button>
                                                <button onClick={handlePreviewSupplierPortal} className="ml-2 flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-purple-600 hover:border-purple-200 transition bg-white">
                                                    <svg className="w-3.5 h-3.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                    Response Portal
                                                </button>
                                                <button onClick={() => setCurrentStep(2)} className="ml-2 text-sm font-bold text-slate-400 hover:text-slate-600">← Back</button>
                                            </div>
                                        </div>
                                        
                                        {/* TOP DASHBOARD METRICS */}
                                        {quotes.length > 0 && (
                                            <div className="grid grid-cols-4 gap-4 animate-in slide-in-from-top-2">
                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lowest Bid</div>
                                                    <div className="text-lg font-bold text-green-600 flex items-center gap-2">
                                                        {quotes.find(q => q.id === getBestPriceId())?.currency} {quotes.find(q => q.id === getBestPriceId())?.total.toLocaleString()}
                                                        <span className="text-[10px] bg-green-100 px-1.5 py-0.5 rounded text-green-700">BEST</span>
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Average Bid</div>
                                                    <div className="text-lg font-bold text-slate-700">
                                                        {(quotes.reduce((acc, curr) => acc + curr.total, 0) / quotes.length).toLocaleString(undefined, {maximumFractionDigits: 0})}
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fastest Lead Time</div>
                                                    <div className="text-lg font-bold text-blue-600">
                                                        {quotes.find(q => q.id === getFastestLeadTimeId())?.leadTime} Days
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Response Rate</div>
                                                    <div className="text-lg font-bold text-slate-700">
                                                        {quotes.length} / {Math.max(quotes.length, (rfq.invited_suppliers?.length || 1))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 overflow-auto p-4 md:p-6">
                                        
                                        {/* VIEW 0: WAITING ROOM (LIVE STATUS PORTAL) */}
                                        {quotes.length === 0 && (
                                            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 relative">
                                                    <div className="absolute inset-0 rounded-full border-4 border-slate-100 animate-ping opacity-50"></div>
                                                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Awaiting Supplier Responses</h3>
                                                <p className="text-slate-500 max-w-md mb-6">
                                                    Share the Response Portal link with suppliers to receive quotes. Responses will appear here automatically.
                                                </p>
                                                
                                                <button onClick={handlePreviewSupplierPortal} className="bg-white border border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-200 px-6 py-2 rounded-lg font-bold text-sm transition shadow-sm mb-10 flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                    Open Response Portal
                                                </button>
                                                
                                                {/* Live Status of Invited Suppliers */}
                                                <div className="w-full max-w-2xl bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                                    <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Invited Suppliers</span>
                                                        <span className="text-xs font-bold text-slate-400">{rfq.invited_suppliers?.length || 0} Total</span>
                                                    </div>
                                                    <div className="divide-y divide-slate-200/50">
                                                        {(!rfq.invited_suppliers || rfq.invited_suppliers.length === 0) ? (
                                                            <div className="p-8 text-center">
                                                                <p className="text-sm text-slate-400 mb-4">No suppliers invited yet.</p>
                                                                <button onClick={handleOpenSourcingModal} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800 transition text-sm">
                                                                    Launch Sourcing Event
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            rfq.invited_suppliers.map(s => (
                                                                <div key={s.id} className="p-4 flex justify-between items-center bg-white">
                                                                    <div className="flex items-center gap-4">
                                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500">
                                                                            {s.name.charAt(0)}
                                                                        </div>
                                                                        <div className="text-left">
                                                                            <div className="text-sm font-bold text-slate-800">{s.name}</div>
                                                                            <div className="text-xs text-slate-400">{s.email || "Primary Contact"}</div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-mono text-slate-400">AWAITING RESPONSE</span>
                                                                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* VIEW 1: COMMERCIAL MATRIX */}
                                        {quotes.length > 0 && comparisonView === 'matrix' && (
                                            <div className="grid grid-flow-col auto-cols-[320px] gap-6 overflow-x-auto pb-6 items-stretch">
                                                {quotes.map((quote) => {
                                                    const isBestPrice = quote.id === getBestPriceId();
                                                    const isFastest = quote.id === getFastestLeadTimeId();
                                                    
                                                    return (
                                                        <div key={quote.id} className={`bg-white rounded-2xl border relative group hover:shadow-xl transition-all flex flex-col overflow-hidden ${isBestPrice ? 'border-green-500 ring-2 ring-green-500/20 shadow-lg shadow-green-500/5' : 'border-slate-200'}`}>
                                                            {/* Card Header */}
                                                            <div className={`p-6 border-b border-slate-100 relative ${isBestPrice ? 'bg-gradient-to-b from-green-50/30 to-white' : 'bg-white'}`}>
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="flex-1 min-w-0 pr-2">
                                                                        <h3 className="font-bold text-lg text-slate-900 truncate" title={quote.supplierName}>{quote.supplierName}</h3>
                                                                        <div className="text-xs text-slate-400">{new Date(quote.timestamp).toLocaleDateString()}</div>
                                                                    </div>
                                                                    <div className="flex flex-col gap-1 items-end">
                                                                        {isBestPrice && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded border border-green-200 uppercase tracking-wide">Best Price</span>}
                                                                        {isFastest && <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200 uppercase tracking-wide">Fastest</span>}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="mt-4">
                                                                    <div className="text-3xl font-bold text-slate-900 flex items-baseline">
                                                                        <span className="text-sm text-slate-400 font-normal mr-1">{quote.currency}</span>
                                                                        {quote.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                                    </div>
                                                                    {/* Delta */}
                                                                    {quotes.length > 1 && (
                                                                        <div className={`text-xs font-bold mt-1 ${quote.total < (quotes.reduce((a,b)=>a+b.total,0)/quotes.length) ? 'text-green-600' : 'text-red-500'}`}>
                                                                            {quote.total < (quotes.reduce((a,b)=>a+b.total,0)/quotes.length) ? '▼' : '▲'} {Math.abs((quote.total - (quotes.reduce((a,b)=>a+b.total,0)/quotes.length)) / (quotes.reduce((a,b)=>a+b.total,0)/quotes.length) * 100).toFixed(1)}% vs Avg
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Card Body */}
                                                            <div className="p-6 space-y-4 flex-1 bg-white">
                                                                <div className="space-y-3">
                                                                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                                                        <span className="text-slate-500">Lead Time</span>
                                                                        <span className={`font-bold ${isFastest ? 'text-blue-600' : 'text-slate-900'}`}>{quote.leadTime || '-'} Days</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                                                        <span className="text-slate-500">Payment</span>
                                                                        <span className="text-slate-900 font-medium">{quote.payment || '-'}</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-sm border-b border-slate-50 pb-2">
                                                                        <span className="text-slate-500">Validity</span>
                                                                        <span className="text-slate-900 font-medium">{quote.validity || '-'}</span>
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Item Completeness Bar */}
                                                                <div>
                                                                    <div className="flex justify-between text-xs mb-1">
                                                                        <span className="text-slate-400 font-bold">Line Item Coverage</span>
                                                                        <span className="text-slate-900 font-bold">{Math.round((quote.items.filter(i => i.unitPrice !== null && i.unitPrice > 0).length / rfq.line_items.length) * 100)}%</span>
                                                                    </div>
                                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                        <div className="h-full bg-slate-800" style={{width: `${(quote.items.filter(i => i.unitPrice !== null && i.unitPrice > 0).length / rfq.line_items.length) * 100}%`}}></div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Card Footer */}
                                                            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
                                                                <button onClick={() => handleGenerateAwardPO(quote)} className="w-full bg-slate-900 text-white py-3 rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2">
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                    Award Contract
                                                                </button>
                                                                <button onClick={() => setSelectedQuoteForReview(quote)} className="w-full py-2 text-slate-500 text-xs font-bold hover:text-slate-800 hover:bg-slate-100 rounded-lg transition">
                                                                    View Full Details
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* VIEW 2: LINE ITEM COMPARISON (TABLE) */}
                                        {quotes.length > 0 && comparisonView === 'items' && (
                                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                                                            <tr>
                                                                <th className="p-4 w-12 bg-slate-50 sticky left-0 z-10 border-r border-slate-200">#</th>
                                                                <th className="p-4 bg-slate-50 sticky left-12 z-10 min-w-[200px] border-r border-slate-200 shadow-sm">Description</th>
                                                                {quotes.map((q) => (
                                                                    <th key={q.id} className="p-4 text-right min-w-[140px] border-r border-slate-100 last:border-r-0">
                                                                        <div className="truncate max-w-[120px]" title={q.supplierName}>{q.supplierName}</div>
                                                                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">{q.currency}</div>
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {rfq.line_items.map((item) => (
                                                                <tr key={item.item_id} className="hover:bg-slate-50 transition-colors">
                                                                    <td className="p-4 font-mono text-slate-400 text-xs bg-white sticky left-0 z-10 border-r border-slate-200">{item.line}</td>
                                                                    <td className="p-4 font-medium text-slate-700 bg-white sticky left-12 z-10 border-r border-slate-200 shadow-sm">
                                                                        <div className="line-clamp-2" title={item.description}>{item.description}</div>
                                                                        <div className="text-xs text-slate-400 font-normal mt-1 flex gap-2">
                                                                            <span>{item.quantity} {item.uom}</span>
                                                                            {item.size.outer_diameter.value && <span className="bg-slate-100 px-1 rounded">{item.size.outer_diameter.value}"</span>}
                                                                        </div>
                                                                    </td>
                                                                    {quotes.map((q) => {
                                                                        const qItem = q.items.find(qi => qi.line === item.line);
                                                                        // Find lowest for THIS line item across all quotes
                                                                        const lowestPriceForLine = Math.min(...quotes.map(qq => {
                                                                            const ii = qq.items.find(i => i.line === item.line);
                                                                            return (ii && ii.unitPrice) ? ii.unitPrice : Infinity;
                                                                        }));
                                                                        
                                                                        const isLowest = (qItem?.unitPrice || 0) === lowestPriceForLine && lowestPriceForLine !== Infinity;

                                                                        return (
                                                                            <td key={q.id} className={`p-4 text-right border-r border-slate-100 last:border-r-0 font-mono relative ${isLowest ? 'bg-green-50/40' : ''}`}>
                                                                                {qItem && qItem.unitPrice ? (
                                                                                    <>
                                                                                        {isLowest && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full"></div>}
                                                                                        <div className={`font-bold ${isLowest ? 'text-green-700' : 'text-slate-700'}`}>
                                                                                            {Number(qItem.unitPrice).toFixed(2)}
                                                                                        </div>
                                                                                        {qItem.alternates && (
                                                                                            <div className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded inline-block mt-1 max-w-[100px] truncate cursor-help border border-amber-100" title={qItem.alternates}>
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
                                        )}
                                    </div>
                                </div>
                            )}
                         </div>
                    )}
                 </div>
            </div>
        </div>
    );
}
