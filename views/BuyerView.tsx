import React, { useState, useRef, useEffect } from 'react';
import { Rfq, Quote, Language, ColumnConfig, LineItem, FileAttachment, ChatMessage, RiskAnalysisItem, SupplierCandidate, SupplierFilters, BuyerProfile } from '../types';
import { parseRequest, analyzeRfqRisks, auditRfqSpecs, findSuppliers } from '../services/geminiService';
import { storageService } from '../services/storageService';
import { t } from '../utils/i18n';
import LZString from 'lz-string';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
    const [savedRfqs, setSavedRfqs] = useState<Rfq[]>([]);
    
    // Buyer Profile Settings
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [buyerProfile, setBuyerProfile] = useState<BuyerProfile>({
        companyName: 'My Company Inc.',
        address: '123 Industrial Blvd\nHouston, TX 77001',
        logo: '',
        contactPhone: '(555) 123-4567'
    });
    const logoInputRef = useRef<HTMLInputElement>(null);

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
    const [manualSupplierName, setManualSupplierName] = useState('');
    const [manualSupplierEmail, setManualSupplierEmail] = useState('');
    const [emailDraft, setEmailDraft] = useState<string>('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [broadcastComplete, setBroadcastComplete] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    
    // Comparison State
    const [comparisonView, setComparisonView] = useState<'matrix' | 'items'>('matrix');
    const [selectedQuoteForReview, setSelectedQuoteForReview] = useState<Quote | null>(null);
    
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

    // Load drafts & profile on mount
    useEffect(() => {
        setSavedRfqs(storageService.getRfqs());
        const savedProfile = storageService.getBuyerProfile();
        if (savedProfile) {
            setBuyerProfile(savedProfile);
        }
    }, [rfq]); 

    // Sync currentStep with RFQ state to prevent blank screens
    useEffect(() => {
        if (rfq && currentStep === 1) {
            // If we have an RFQ but are in "Dashboard" state (1), force move to "Review" (2)
            setCurrentStep(2);
        }
    }, [rfq, currentStep]);

    // Auto-switch to Comparison Step if Quotes exist (e.g. after import)
    useEffect(() => {
        if (quotes && quotes.length > 0 && currentStep !== 3) {
            setCurrentStep(3);
        }
    }, [quotes]);

    // Auto-populate Email Draft when entering Broadcast step
    useEffect(() => {
        if (sourcingStep === 3 && rfq) {
            const link = generateRfqLink();
            if (!emailDraft.trim()) {
                const defaultBody = `Subject: RFQ - ${rfq.project_name}

To: [Supplier Contact]

Hello,

We are requesting a quotation for the following project:
Project: ${rfq.project_name}
Location: ${rfq.commercial.destination || 'TBD'}

Please review the requirements and submit your best offer using the secure link below. This link allows you to input unit prices directly into our system.

SECURE BIDDING LINK:
${link}

(Note: If the link is too long, please ensure you copy the entire text).

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

    // --- LOGO UPLOAD LOGIC ---
    const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result as string;
                setBuyerProfile(prev => ({ ...prev, logo: result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = () => {
        storageService.saveBuyerProfile(buyerProfile);
        setShowSettingsModal(false);
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
        setEmailDraft(''); 
        setSourcingStep(1); 
        // Do not reset suggestedSuppliers if they exist, to persist previous search
        if(suggestedSuppliers.length === 0) setSuggestedSuppliers([]); 
        setShowShareModal(true);
        setBroadcastComplete(false);
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
            setSuggestedSuppliers(prev => {
                // Keep manual entries when adding search results
                const manualEntries = prev.filter(s => s.tags?.includes('Manual'));
                return [...manualEntries, ...results];
            });
        } catch (e) {
            console.error("Failed to find suppliers", e);
        } finally {
            setIsSourcing(false);
        }
    };

    const toggleSupplierSelection = (id: string) => {
        setSuggestedSuppliers(prev => prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s));
    };

    const updateSupplierEmail = (id: string, email: string) => {
        setSuggestedSuppliers(prev => prev.map(s => s.id === id ? { ...s, email: email } : s));
    };

    const handleAddManualSupplier = () => {
        if (!manualSupplierName || !manualSupplierEmail) return;
        const newSup: SupplierCandidate = {
            id: `MANUAL-${Date.now()}`,
            name: manualSupplierName,
            email: manualSupplierEmail,
            contacts: [manualSupplierEmail],
            match_reason: "Manually added by buyer",
            selected: true,
            location: "Custom",
            sendStatus: 'idle',
            tags: ['Manual']
        };
        setSuggestedSuppliers(prev => [...prev, newSup]);
        setManualSupplierName('');
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
            const pageWidth = doc.internal.pageSize.getWidth();
            
            // --- HEADER SECTION ---
            
            // 1. Logo (Top Left) - Larger like reference
            if (buyerProfile.logo) {
                try {
                    // Aspect ratio calculation to fit within box
                    const imgProps = doc.getImageProperties(buyerProfile.logo);
                    const pdfWidth = 25;
                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                    doc.addImage(buyerProfile.logo, 'PNG', 14, 10, pdfWidth, pdfHeight);
                } catch (e) {
                    // Fallback visual if logo fails
                    doc.setFillColor(0, 51, 102); // Dark Blue
                    doc.circle(24, 20, 10, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(16);
                    doc.text("C", 22, 23);
                }
            } else {
                // Default Logo Visual
                doc.setFillColor(0, 51, 102); // Dark Blue
                doc.circle(24, 20, 10, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(16);
                doc.text("C", 22, 23);
            }

            // 2. Company Info (Center Left - Next to Logo)
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            const companyName = buyerProfile.companyName || "Your Company Inc.";
            doc.text(companyName, 45, 15);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            const addressLines = (buyerProfile.address || "123 Business Rd.\nCity, State 12345").split('\n');
            let yAddr = 20;
            addressLines.forEach(line => {
                doc.text(line, 45, yAddr);
                yAddr += 4;
            });
            if (buyerProfile.contactPhone) {
                doc.text(`Phone: ${buyerProfile.contactPhone}`, 45, yAddr);
            }

            // 3. PO Details (Top Right)
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.setTextColor(0, 51, 102); // Appleton Blue
            doc.text("PURCHASE ORDER", pageWidth - 14, 15, { align: 'right' });
            
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(9);
            const poNum = `PO-${rfq.id.replace('RFQ-', '')}`;
            const dateStr = new Date().toLocaleDateString();
            
            // Grid for PO Info
            const headerInfoY = 22;
            doc.text("PO No.:", 150, headerInfoY);
            doc.text(poNum, pageWidth - 14, headerInfoY, { align: 'right' });
            
            doc.text("Date:", 150, headerInfoY + 5);
            doc.text(dateStr, pageWidth - 14, headerInfoY + 5, { align: 'right' });
            
            doc.text("Page:", 150, headerInfoY + 10);
            doc.text("1", pageWidth - 14, headerInfoY + 10, { align: 'right' });

            // --- VENDOR & SHIP TO SECTION ---
            const sectionY = 45;
            
            // Vendor (Left)
            doc.setFontSize(8);
            doc.text("Vendor:", 14, sectionY - 3);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(winningQuote.supplierName.toUpperCase(), 14, sectionY + 2);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            // Simulate vendor address if not present
            doc.text("Vendor Address Line 1", 14, sectionY + 7);
            doc.text("City, State, Zip", 14, sectionY + 11);
            doc.text(`Phone: ${winningQuote.phone || "N/A"}`, 14, sectionY + 20);

            // Bill To / Ship To (Right)
            const rightColX = 110;
            doc.setFontSize(8);
            doc.text("Bill To:", rightColX, sectionY - 3);
            doc.setFont("helvetica", "bold");
            doc.text(companyName.toUpperCase(), rightColX, sectionY + 2);
            
            doc.setFont("helvetica", "normal");
            const billAddr = buyerProfile.address.split('\n');
            let billY = sectionY + 6;
            billAddr.forEach(l => {
                doc.text(l, rightColX, billY);
                billY += 4;
            });

            // Ship To (Below Bill To)
            const shipToY = billY + 6;
            doc.setFontSize(8);
            doc.text("Ship To:", rightColX, shipToY - 3);
            doc.setFont("helvetica", "bold");
            // Assuming Ship To same as Bill To or Destination from RFQ
            const dest = rfq.commercial.destination || companyName;
            doc.text(dest.toUpperCase(), rightColX, shipToY + 2);
            // If just a city name, maybe add address placeholder
            if (!dest.includes('\n') && !dest.includes(',')) {
                 doc.setFont("helvetica", "normal");
                 doc.text("Job Site Receiving", rightColX, shipToY + 6);
                 doc.text(dest, rightColX, shipToY + 10);
            }

            // --- INFO STRIP (Middle) ---
            const stripY = sectionY + 45;
            
            // Draw Lines
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.1);
            doc.line(14, stripY, pageWidth - 14, stripY);
            doc.line(14, stripY + 9, pageWidth - 14, stripY + 9);

            // Fields
            const fields = [
                { label: "Buyer", val: buyerProfile.companyName.split(' ')[0] || "Purchasing" },
                { label: "Due Date", val: rfq.line_items[0]?.required_delivery_date || "ASAP" },
                { label: "Terms", val: winningQuote.payment || "Net 30" },
                { label: "Ship Via", val: "Best Way" },
                { label: "FOB", val: rfq.commercial.incoterm || "Origin" },
                { label: "Reference", val: winningQuote.id }
            ];

            let xPos = 14;
            const fieldWidth = (pageWidth - 28) / fields.length;
            
            fields.forEach((field) => {
                doc.setFontSize(8);
                doc.setFont("helvetica", "normal");
                doc.text(field.label, xPos + 1, stripY + 3);
                doc.setFont("helvetica", "bold");
                doc.text(field.val, xPos + 1, stripY + 7);
                xPos += fieldWidth;
            });

            // --- ITEMS TABLE ---
            const tableBody = rfq.line_items.map(item => {
                const quoteItem = winningQuote.items.find(qi => qi.line === item.line);
                const unitPrice = quoteItem?.unitPrice || 0;
                const lineTotal = (quoteItem?.unitPrice || 0) * (item.quantity || 0);
                
                // Construct Description with specs
                let desc = item.description;
                if (item.size.outer_diameter.value) desc += `\n${item.size.outer_diameter.value}"`;
                if (item.material_grade) desc += ` ${item.material_grade}`;
                if (item.product_type) desc = `${item.product_type.toUpperCase()} - ${desc}`;

                return [
                    item.line.toString(),
                    item.quantity?.toString() || '0',
                    item.uom || 'EA',
                    desc,
                    `${winningQuote.currency} ${unitPrice.toFixed(2)}`,
                    `${winningQuote.currency} ${lineTotal.toFixed(2)}`
                ];
            });

            // Reverted to prototype usage for compatibility
            (doc as any).autoTable({
                startY: stripY + 15,
                head: [['Ln#', 'Qty', 'Unit', 'Description', 'Cost', 'Extension']],
                body: tableBody,
                theme: 'plain',
                headStyles: { 
                    fillColor: [0, 51, 102], // #003366 Dark Blue
                    textColor: [255, 255, 255], 
                    fontStyle: 'bold', 
                    fontSize: 9,
                    halign: 'left'
                },
                styles: { 
                    fontSize: 9, 
                    cellPadding: 3, 
                    lineColor: [255, 255, 255], 
                    lineWidth: 0, 
                    valign: 'top' 
                },
                columnStyles: {
                    0: { cellWidth: 15 },
                    1: { cellWidth: 20 },
                    2: { cellWidth: 20 },
                    3: { cellWidth: 'auto' }, // Description
                    4: { cellWidth: 30, halign: 'right' },
                    5: { cellWidth: 30, halign: 'right' }
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                }
            });

            // --- FOOTER ---
            // @ts-ignore
            let finalY = (doc as any).lastAutoTable?.finalY || 150;
            
            // Total Line
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.1);
            doc.line(14, finalY + 5, pageWidth - 14, finalY + 5);

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            
            // Total Units
            const totalQty = rfq.line_items.reduce((acc, i) => acc + (i.quantity || 0), 0);
            doc.text(`Total Units: ${totalQty.toFixed(2)}`, 14, finalY + 12);
            
            // Total Amount
            doc.text(`Total Extension: ${winningQuote.currency} ${winningQuote.total.toLocaleString(undefined, {minimumFractionDigits: 2})}`, pageWidth - 14, finalY + 12, { align: 'right' });

            // Signature Line
            const sigY = finalY + 30;
            doc.line(pageWidth / 2 - 40, sigY, pageWidth / 2 + 40, sigY);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.text("Authorized Signature", pageWidth / 2, sigY + 4, { align: 'center' });

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

            {/* SETTINGS MODAL */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h3 className="font-bold text-lg text-slate-900">Buyer Profile Settings</h3>
                            <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex flex-col items-center mb-6">
                                <div 
                                    className="w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-brandOrange overflow-hidden bg-slate-50 relative group"
                                    onClick={() => logoInputRef.current?.click()}
                                >
                                    {buyerProfile.logo ? (
                                        <img src={buyerProfile.logo} alt="Company Logo" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <div className="text-center text-slate-400 group-hover:text-brandOrange">
                                            <svg className="w-8 h-8 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            <span className="text-[10px] font-bold uppercase">Upload Logo</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold">Change</div>
                                </div>
                                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoSelect} />
                                <p className="text-[10px] text-slate-400 mt-2">Used in PDF Header. Best: Square PNG.</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Name</label>
                                <input 
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                    value={buyerProfile.companyName}
                                    onChange={e => setBuyerProfile({...buyerProfile, companyName: e.target.value})}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address (For Header/Bill To)</label>
                                <textarea 
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm h-20 resize-none"
                                    value={buyerProfile.address}
                                    onChange={e => setBuyerProfile({...buyerProfile, address: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Contact</label>
                                <input 
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                    value={buyerProfile.contactPhone}
                                    onChange={e => setBuyerProfile({...buyerProfile, contactPhone: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-lg">Cancel</button>
                            <button onClick={handleSaveProfile} className="px-6 py-2 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800">Save Profile</button>
                        </div>
                    </div>
                </div>
            )}

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
                            onClick={() => setShowSettingsModal(true)}
                            className="ml-2 p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 shadow-sm transition"
                            title="Company Settings"
                        >
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
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
                                    {/* ... STEP 1: DISCOVER ... */}
                                    {sourcingStep === 1 && (
                                        <div className="flex-1 flex flex-col md:flex-row h-full animate-in fade-in slide-in-from-right-4 duration-300">
                                            {/* Filters Panel */}
                                            <div className="w-full md:w-80 bg-white border-r border-slate-200 p-6 overflow-y-auto shrink-0 flex flex-col gap-6">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Target Region</label>
                                                    <select value={sourcingFilters.region} onChange={(e) => setSourcingFilters({...sourcingFilters, region: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-sm">
                                                        <option value="">Global</option>
                                                        <option value="USA">North America</option>
                                                        <option value="Europe">Europe</option>
                                                        <option value="Asia">Asia</option>
                                                        <option value="Middle East">Middle East</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Supplier Type</label>
                                                    <div className="space-y-2">
                                                        {['Manufacturer', 'Stockist', 'Distributor'].map(type => (
                                                            <label key={type} className="flex items-center gap-3 cursor-pointer group">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={sourcingFilters.types.includes(type)}
                                                                    onChange={() => toggleFilter('types', type)}
                                                                    className="w-4 h-4 rounded border-slate-300 text-brandOrange focus:ring-brandOrange cursor-pointer"
                                                                />
                                                                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition">{type}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Required Certs</label>
                                                    <div className="space-y-2">
                                                        {['ISO 9001', 'API 5L', 'ASME', 'NACE'].map(cert => (
                                                            <label key={cert} className="flex items-center gap-3 cursor-pointer group">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={sourcingFilters.certs.includes(cert)}
                                                                    onChange={() => toggleFilter('certs', cert)}
                                                                    className="w-4 h-4 rounded border-slate-300 text-brandOrange focus:ring-brandOrange cursor-pointer"
                                                                />
                                                                <span className="text-sm text-slate-600 group-hover:text-slate-900 transition">{cert}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* NEW: Manual Add Section */}
                                                <div className="pt-6 border-t border-slate-100">
                                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Add Known Supplier</label>
                                                    <div className="space-y-2">
                                                        <input 
                                                            placeholder="Supplier Name" 
                                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-brandOrange"
                                                            value={manualSupplierName}
                                                            onChange={e => setManualSupplierName(e.target.value)}
                                                        />
                                                        <input 
                                                            placeholder="Email Address" 
                                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-brandOrange"
                                                            value={manualSupplierEmail}
                                                            onChange={e => setManualSupplierEmail(e.target.value)}
                                                        />
                                                        <button 
                                                            onClick={handleAddManualSupplier}
                                                            disabled={!manualSupplierName || !manualSupplierEmail}
                                                            className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 disabled:opacity-50 transition flex items-center justify-center gap-1"
                                                        >
                                                            + Add to List
                                                        </button>
                                                    </div>
                                                </div>

                                                <button onClick={handleFindSuppliers} disabled={isSourcing} className="mt-auto w-full h-12 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-slate-800 transition">
                                                    {isSourcing ? (
                                                        <>
                                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                            Scouting...
                                                        </>
                                                    ) : 'Find Suppliers'}
                                                </button>
                                            </div>

                                            {/* Results Area */}
                                            <div className="flex-1 p-8 overflow-y-auto">
                                                {suggestedSuppliers.length === 0 ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center max-w-md mx-auto">
                                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                                            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                                        </div>
                                                        <h3 className="font-bold text-slate-600 text-lg mb-2">Start Discovery</h3>
                                                        <p className="text-sm">Configure your search filters on the left and let AI scout the best suppliers for your specific material needs.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                        {suggestedSuppliers.map(s => (
                                                            <div key={s.id} onClick={() => toggleSupplierSelection(s.id)} className={`p-5 rounded-2xl border cursor-pointer transition-all hover:shadow-md flex flex-col bg-white ${s.selected ? 'border-brandOrange ring-1 ring-brandOrange shadow-sm' : 'border-slate-200'}`}>
                                                                <div className="flex justify-between items-start mb-3">
                                                                    <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-lg font-bold text-slate-700">
                                                                        {s.name.charAt(0)}
                                                                    </div>
                                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${s.selected ? 'bg-brandOrange border-brandOrange' : 'border-slate-300 bg-white'}`}>
                                                                        {s.selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                                    </div>
                                                                </div>
                                                                <h3 className="font-bold text-slate-900 mb-1">{s.name}</h3>
                                                                <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                                    {s.location}
                                                                </p>
                                                                
                                                                <div className="flex flex-wrap gap-1 mb-4">
                                                                    {s.tags?.map((tag, i) => (
                                                                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded font-bold uppercase tracking-wider">{tag}</span>
                                                                    ))}
                                                                </div>

                                                                <div className="mt-auto bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                                    <p className="text-[10px] text-slate-600 italic">"{s.match_reason}"</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* ... STEP 2: REVIEW & CONTACTS ... */}
                                    {sourcingStep === 2 && (
                                        <div className="flex-1 flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300 p-8">
                                            <div className="flex justify-between items-center mb-6">
                                                <div>
                                                    <h3 className="font-bold text-xl text-slate-900">Manage Distribution List</h3>
                                                    <p className="text-sm text-slate-500">Verify contact emails before broadcasting. Add manual contacts if needed.</p>
                                                </div>
                                                <div className="bg-slate-100 px-3 py-1 rounded-lg text-sm font-bold text-slate-600">
                                                    {suggestedSuppliers.filter(s => s.selected).length} Selected
                                                </div>
                                            </div>

                                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
                                                <div className="overflow-y-auto flex-1">
                                                    <table className="w-full text-left">
                                                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                            <tr>
                                                                <th className="px-6 py-3 w-1/3">Supplier</th>
                                                                <th className="px-6 py-3">Contact Email (Required)</th>
                                                                <th className="px-6 py-3 w-20 text-center">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {suggestedSuppliers.filter(s => s.selected).map(s => (
                                                                <tr key={s.id} className="group hover:bg-slate-50/50">
                                                                    <td className="px-6 py-4">
                                                                        <div className="font-bold text-slate-900">{s.name}</div>
                                                                        <div className="text-xs text-slate-400">{s.location}</div>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <input 
                                                                            type="email" 
                                                                            value={s.email || ''} 
                                                                            onChange={(e) => updateSupplierEmail(s.id, e.target.value)}
                                                                            placeholder="sales@company.com" 
                                                                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 outline-none transition ${!s.email ? 'border-red-300 focus:ring-red-200 bg-red-50' : 'border-slate-300 focus:ring-brandOrange/20 focus:border-brandOrange'}`}
                                                                        />
                                                                    </td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        <button onClick={() => toggleSupplierSelection(s.id)} className="text-slate-400 hover:text-red-500 p-2 rounded hover:bg-red-50 transition">
                                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            
                                                            {/* Add Manual Row */}
                                                            <tr className="bg-slate-50">
                                                                <td className="px-6 py-3">
                                                                    <input 
                                                                        placeholder="New Supplier Name" 
                                                                        className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm"
                                                                        value={manualSupplierName}
                                                                        onChange={e => setManualSupplierName(e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="px-6 py-3">
                                                                    <input 
                                                                        placeholder="email@example.com" 
                                                                        className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-sm"
                                                                        value={manualSupplierEmail}
                                                                        onChange={e => setManualSupplierEmail(e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="px-6 py-3 text-center">
                                                                    <button 
                                                                        onClick={handleAddManualSupplier}
                                                                        disabled={!manualSupplierName || !manualSupplierEmail}
                                                                        className="text-xs font-bold bg-slate-900 text-white px-3 py-1.5 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        Add
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-xs text-slate-500">
                                                    Tip: If a supplier email is missing, the AI couldn't find a public contact. Please add it manually.
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ... STEP 3: BROADCAST ... */}
                                    {sourcingStep === 3 && (
                                        <div className="flex flex-col h-full w-full p-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                            {!isBroadcasting && !broadcastComplete ? (
                                                <div className="flex flex-col h-full gap-6">
                                                    {/* Secure Link Box */}
                                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 shadow-sm">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="font-bold text-blue-900 text-sm uppercase tracking-wide">Secure RFQ Link</h4>
                                                            <button 
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(generateRfqLink());
                                                                    setLinkCopied(true);
                                                                    setTimeout(() => setLinkCopied(false), 2000);
                                                                }}
                                                                className={`text-xs font-bold px-3 py-1.5 rounded transition flex items-center gap-1.5 ${linkCopied ? 'bg-green-500 text-white' : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-100'}`}
                                                            >
                                                                {linkCopied ? (
                                                                    <>
                                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                        Copied!
                                                                    </>
                                                                ) : (
                                                                    'Copy Link'
                                                                )}
                                                            </button>
                                                        </div>
                                                        <div className="bg-white border border-blue-200 rounded p-3 text-xs text-slate-500 break-all font-mono max-h-20 overflow-y-auto">
                                                            {generateRfqLink()}
                                                        </div>
                                                        <p className="text-[10px] text-blue-600/70 mt-2">This link contains the full RFQ package securely encoded. No login required for suppliers.</p>
                                                    </div>

                                                    <div className="flex-1 flex flex-col">
                                                        <h3 className="font-bold text-lg mb-2 text-slate-900">Email Preview</h3>
                                                        <textarea 
                                                            className="flex-1 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brandOrange/20 focus:border-brandOrange outline-none resize-none font-mono text-sm leading-relaxed" 
                                                            value={emailDraft} 
                                                            onChange={e => setEmailDraft(e.target.value)} 
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center">
                                                    {isBroadcasting ? (
                                                        <div className="text-center">
                                                            <div className="w-16 h-16 border-4 border-brandOrange/30 border-t-brandOrange rounded-full animate-spin mx-auto mb-6"></div>
                                                            <h3 className="text-xl font-bold text-slate-900 mb-2">Broadcasting RFQ...</h3>
                                                            <p className="text-slate-500">Sending secure links to {suggestedSuppliers.filter(s => s.selected).length} suppliers.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center animate-in zoom-in-95">
                                                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                            </div>
                                                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Broadcast Complete</h3>
                                                            <p className="text-slate-500 max-w-sm mx-auto mb-8">Your RFQ has been sent. Suppliers will submit quotes directly to this portal via the secure link.</p>
                                                            <button onClick={() => setShowShareModal(false)} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition">Return to Dashboard</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Footer Actions */}
                                <div className="border-t border-slate-200 bg-white p-4 z-10 flex justify-between items-center shrink-0">
                                    <button onClick={() => sourcingStep > 1 && setSourcingStep((sourcingStep - 1) as any)} disabled={sourcingStep === 1 || isBroadcasting || broadcastComplete} className="text-slate-500 font-bold text-sm px-4 hover:text-slate-800 disabled:opacity-30">Back</button>
                                    {sourcingStep < 3 ? (
                                        <button 
                                            onClick={() => setSourcingStep((sourcingStep + 1) as any)} 
                                            disabled={suggestedSuppliers.filter(s => s.selected).length === 0}
                                            className="bg-brandOrange text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next Step
                                        </button>
                                    ) : (
                                        !broadcastComplete && !isBroadcasting && (
                                            <button 
                                                onClick={handleBroadcastRfq} 
                                                className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-500/20 flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                                Send {suggestedSuppliers.filter(s => s.selected).length} Emails
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
                                    <h2 className="text-xl font-bold text-slate-900">Risk Analysis Report</h2>
                                    <button onClick={() => setShowRiskModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full">×</button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-4">
                                    {rfq.risks.map((risk, idx) => (
                                        <div key={idx} className={`p-5 rounded-2xl border flex gap-4 ${risk.impact_level === 'High' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-900">{risk.risk}</h3>
                                                <p className="text-sm text-slate-600 mt-1">{risk.recommendation}</p>
                                                <div className="mt-3 flex gap-3">
                                                    <button onClick={() => handleMitigateRisk(risk, idx)} className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 rounded shadow-sm">Fix</button>
                                                    <button onClick={() => handleIgnoreRisk(idx)} className="text-xs text-slate-400 px-2">Dismiss</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {!rfq ? (
                        // STEP 1: EMPTY DASHBOARD
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 lg:p-12 flex flex-col items-center justify-center animate-in fade-in">
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
                                                            <span className="text-xs font-bold text-slate-700 group-hover:text-brandOrange transition-colors">Approved Vendor List Only</span>
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
                                                        <div className="flex items-center gap-2 ml-auto">
                                                            <label className="text-xs font-bold text-slate-500">Warranty (Months)</label>
                                                            <input 
                                                                type="number" 
                                                                value={rfq.commercial.warranty_months}
                                                                onChange={(e) => setRfq({...rfq, commercial: {...rfq.commercial, warranty_months: parseInt(e.target.value) || 0}})}
                                                                className="w-16 p-1 text-center border border-slate-200 rounded text-xs font-bold focus:border-brandOrange outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Line Items Table */}
                                    <div className="flex-1 overflow-auto relative">
                                        <table className="w-full text-left border-collapse" style={{ minWidth: '1000px' }}>
                                            <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wide border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                                <tr>
                                                    <th className="w-10 px-2 py-3 text-center bg-slate-50"></th>
                                                    {tableConfig.filter(c => c.visible).map((col) => (
                                                        <th 
                                                            key={col.id} 
                                                            className="px-3 py-3 border-r border-slate-200 last:border-0 relative group bg-slate-50 select-none"
                                                            style={{ width: col.width }}
                                                        >
                                                            {col.label}
                                                            <div 
                                                                className="absolute right-0 top-0 bottom-0 w-1 bg-transparent hover:bg-brandOrange cursor-col-resize z-20"
                                                                onMouseDown={(e) => startResize(e, col.id)}
                                                            ></div>
                                                        </th>
                                                    ))}
                                                    <th className="px-3 py-3 bg-slate-50 w-20 text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {rfq.line_items.map((item, idx) => (
                                                    <tr key={item.item_id} className="hover:bg-blue-50/30 transition-colors group">
                                                        <td className="px-2 py-3 text-center text-slate-300 text-xs">{idx + 1}</td>
                                                        {tableConfig.filter(c => c.visible).map((col) => (
                                                            <td key={col.id} className="px-3 py-2 border-r border-slate-50 last:border-0">
                                                                {/* Custom Renderers for Dimensions */}
                                                                {col.id === 'od' ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <input 
                                                                            id={`cell-od-${idx}`}
                                                                            className="w-full bg-transparent outline-none text-xs font-mono text-slate-600 focus:text-blue-600 font-medium"
                                                                            value={item.size.outer_diameter.value || ''}
                                                                            placeholder="-"
                                                                            onChange={(e) => handleUpdateLineItem(idx, 'od', e.target.value)}
                                                                            onKeyDown={(e) => handleKeyDown(e, 'od', idx)}
                                                                        />
                                                                        <span className="text-[10px] text-slate-400">{item.size.outer_diameter.unit || '"'}</span>
                                                                    </div>
                                                                ) : col.id === 'wt' ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <input 
                                                                            id={`cell-wt-${idx}`}
                                                                            className="w-full bg-transparent outline-none text-xs font-mono text-slate-600 focus:text-blue-600 font-medium"
                                                                            value={item.size.wall_thickness.value || ''}
                                                                            placeholder="-"
                                                                            onChange={(e) => handleUpdateLineItem(idx, 'wt', e.target.value)}
                                                                            onKeyDown={(e) => handleKeyDown(e, 'wt', idx)}
                                                                        />
                                                                        <span className="text-[10px] text-slate-400">{item.size.wall_thickness.unit || '"'}</span>
                                                                    </div>
                                                                ) : col.id === 'line' ? (
                                                                    <span className="text-xs text-slate-400 font-mono">{item.line}</span>
                                                                ) : (
                                                                    <input 
                                                                        id={`cell-${col.id}-${idx}`}
                                                                        className={`w-full bg-transparent outline-none text-xs ${col.id === 'description' ? 'font-bold text-slate-800' : 'text-slate-600'} focus:text-blue-600 transition-colors`}
                                                                        // @ts-ignore
                                                                        value={item[col.id]}
                                                                        onChange={(e) => handleUpdateLineItem(idx, col.id as keyof LineItem, e.target.value)}
                                                                        onKeyDown={(e) => handleKeyDown(e, col.id, idx)}
                                                                    />
                                                                )}
                                                            </td>
                                                        ))}
                                                        <td className="px-3 py-2 text-center">
                                                            <button 
                                                                onClick={() => handleDeleteItem(idx)}
                                                                className="text-slate-300 hover:text-red-500 transition p-1 rounded hover:bg-red-50"
                                                                title="Delete Item"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                
                                                {/* Add Item Row */}
                                                <tr>
                                                    <td className="px-2 py-3 text-center text-slate-300 text-xs">+</td>
                                                    <td colSpan={tableConfig.filter(c => c.visible).length + 1} className="px-3 py-2">
                                                        <button 
                                                            onClick={handleAddItem}
                                                            className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-2 py-2 w-full transition"
                                                        >
                                                            <div className="w-5 h-5 rounded border border-slate-300 flex items-center justify-center text-slate-400">+</div>
                                                            Add Line Item
                                                        </button>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}

                            {/* --- STEP 3: COMPARE & AWARD --- */}
                            {currentStep === 3 && (
                                <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
                                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 mb-1">Bid Comparison Matrix</h2>
                                            <p className="text-xs text-slate-500">Analyzing {quotes.length} received quotes against {rfq.line_items.length} line items.</p>
                                        </div>
                                        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                                            <button onClick={() => setComparisonView('matrix')} className={`px-4 py-2 rounded-md text-xs font-bold transition ${comparisonView === 'matrix' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>Total Cost</button>
                                            <button onClick={() => setComparisonView('items')} className={`px-4 py-2 rounded-md text-xs font-bold transition ${comparisonView === 'items' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>Item Level</button>
                                        </div>
                                    </div>

                                    {quotes.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12">
                                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                                <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-600 mb-2">Waiting for Bids</h3>
                                            <p className="max-w-xs text-center text-sm mb-8">Share the RFQ link with suppliers. Their quotes will appear here automatically.</p>
                                            <button onClick={handleOpenSourcingModal} className="text-brandOrange hover:underline font-bold text-sm">Resend Invitations</button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-auto p-6 bg-slate-50/30">
                                            
                                            {/* AI Insight Box */}
                                            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-5 text-white mb-8 shadow-lg flex gap-4 items-start">
                                                <div className="p-2 bg-white/10 rounded-lg">
                                                    <svg className="w-6 h-6 text-brandOrange" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm uppercase tracking-wide text-slate-400 mb-1">AI Recommendation</h4>
                                                    <p className="text-lg font-medium leading-relaxed">{getRecommendation()}</p>
                                                </div>
                                            </div>

                                            {/* Comparison Cards */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                {quotes.map((quote) => {
                                                    const isBestPrice = quote.id === getBestPriceId();
                                                    const isFastest = quote.id === getFastestLeadTimeId();
                                                    
                                                    return (
                                                        <div key={quote.id} className={`bg-white rounded-2xl border transition-all duration-300 flex flex-col relative overflow-hidden ${isBestPrice ? 'border-green-500 shadow-xl scale-[1.02] z-10 ring-1 ring-green-500' : 'border-slate-200 shadow-sm hover:shadow-md'}`}>
                                                            {isBestPrice && <div className="bg-green-500 text-white text-[10px] font-bold uppercase py-1 text-center tracking-widest">Best Price</div>}
                                                            
                                                            <div className="p-6 flex-1 flex flex-col">
                                                                <div className="flex justify-between items-start mb-4">
                                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">
                                                                        {quote.supplierName.substring(0, 2).toUpperCase()}
                                                                    </div>
                                                                    {isFastest && <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase">Fastest</span>}
                                                                </div>
                                                                
                                                                <h3 className="font-bold text-lg text-slate-900 mb-1">{quote.supplierName}</h3>
                                                                <div className="text-xs text-slate-500 mb-6">Ref: {quote.id}</div>
                                                                
                                                                <div className="space-y-3 mb-8">
                                                                    <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                                                                        <span className="text-xs font-bold text-slate-400 uppercase">Total</span>
                                                                        <span className={`text-2xl font-bold font-mono ${isBestPrice ? 'text-green-600' : 'text-slate-900'}`}>{quote.currency} {quote.total.toLocaleString()}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="text-slate-500">Lead Time</span>
                                                                        <span className="font-bold text-slate-700">{quote.leadTime} Days</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="text-slate-500">Payment</span>
                                                                        <span className="font-medium text-slate-700">{quote.payment}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-sm">
                                                                        <span className="text-slate-500">Valid Until</span>
                                                                        <span className="font-medium text-slate-700">{quote.validity}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-auto space-y-2">
                                                                    <button 
                                                                        onClick={() => setSelectedQuoteForReview(quote)}
                                                                        className="w-full py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
                                                                    >
                                                                        Review Details
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleGenerateAwardPO(quote)}
                                                                        className={`w-full py-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${isBestPrice ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/30' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg'}`}
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                        Award & Generate PO
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Quote Detail Modal */}
                                            {selectedQuoteForReview && (
                                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                                                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                                                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                                            <div>
                                                                <h3 className="font-bold text-lg text-slate-900">{selectedQuoteForReview.supplierName}</h3>
                                                                <p className="text-xs text-slate-500">Reference: {selectedQuoteForReview.id}</p>
                                                            </div>
                                                            <button onClick={() => setSelectedQuoteForReview(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition">
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                        </div>
                                                        <div className="p-6 overflow-y-auto">
                                                            <table className="w-full text-sm text-left mb-6">
                                                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                                                    <tr>
                                                                        <th className="px-4 py-2">Item</th>
                                                                        <th className="px-4 py-2 text-right">Qty</th>
                                                                        <th className="px-4 py-2 text-right">Unit Price</th>
                                                                        <th className="px-4 py-2 text-right">Total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {selectedQuoteForReview.items.map((item, idx) => (
                                                                        <tr key={idx}>
                                                                            <td className="px-4 py-3">
                                                                                <div className="font-medium text-slate-900">{item.rfqDescription || "Item"}</div>
                                                                                {item.alternates && <div className="text-xs text-amber-600 mt-1">Note: {item.alternates}</div>}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right">{item.quantity}</td>
                                                                            <td className="px-4 py-3 text-right">{selectedQuoteForReview.currency} {item.unitPrice?.toFixed(2)}</td>
                                                                            <td className="px-4 py-3 text-right font-bold">{selectedQuoteForReview.currency} {item.lineTotal?.toFixed(2)}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                                <tfoot className="border-t border-slate-200 bg-slate-50 font-bold">
                                                                    <tr>
                                                                        <td colSpan={3} className="px-4 py-3 text-right">Grand Total</td>
                                                                        <td className="px-4 py-3 text-right">{selectedQuoteForReview.currency} {selectedQuoteForReview.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                                    </tr>
                                                                </tfoot>
                                                            </table>
                                                            
                                                            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                                <div>
                                                                    <span className="block text-xs text-slate-400 uppercase">Payment Terms</span>
                                                                    <span className="font-medium text-slate-700">{selectedQuoteForReview.payment}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="block text-xs text-slate-400 uppercase">Lead Time</span>
                                                                    <span className="font-medium text-slate-700">{selectedQuoteForReview.leadTime} Days</span>
                                                                </div>
                                                                <div>
                                                                    <span className="block text-xs text-slate-400 uppercase">Validity</span>
                                                                    <span className="font-medium text-slate-700">{selectedQuoteForReview.validity}</span>
                                                                </div>
                                                                 <div className="col-span-2 border-t border-slate-200 pt-2 mt-2">
                                                                    <span className="block text-xs text-slate-400 uppercase">Notes</span>
                                                                    <p className="text-slate-600 italic">{selectedQuoteForReview.notes || "No additional notes."}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                                                            <button onClick={() => setSelectedQuoteForReview(null)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition">Close</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Chat Toggle (Visible when closed) */}
            {!isChatOpen && !showShareModal && !showSettingsModal && !showRiskModal && (
                <button
                    onClick={() => setIsChatOpen(true)}
                    className="fixed bottom-8 right-8 z-50 bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:bg-slate-800 hover:scale-105 transition-all flex items-center justify-center gap-2 group animate-in fade-in slide-in-from-bottom-4 duration-300"
                    title="Open Assistant"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <span className="font-bold text-sm max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap">
                        Assistant
                    </span>
                </button>
            )}
        </div>
    );
}