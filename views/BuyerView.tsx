
import React, { useState, useRef, useEffect } from 'react';
import LZString from 'lz-string';
import { Rfq, Quote, ChatMessage, Language, LineItem, FileAttachment, Size, ColumnConfig } from '../types';
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
  const [isInfoVisible, setIsInfoVisible] = useState(true); // Default visible
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default Sidebar Open
  const [showCompareMatrix, setShowCompareMatrix] = useState(false); // Toggle for Matrix
  
  // Column Manager State
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [tableConfig, setTableConfig] = useState<ColumnConfig[]>([
      { id: 'line', label: t(lang, 'line'), visible: true, width: 'sm' },
      { id: 'shape', label: t(lang, 'shape'), visible: true, width: 'md' },
      { id: 'description', label: t(lang, 'desc'), visible: true, width: 'lg' },
      { id: 'grade', label: t(lang, 'grade'), visible: true, width: 'md' },
      { id: 'tolerance', label: t(lang, 'tolerance'), visible: true, width: 'sm' },
      { id: 'tests', label: t(lang, 'tests'), visible: true, width: 'sm' },
      { id: 'od', label: t(lang, 'od'), visible: true, width: 'sm' },
      { id: 'wt', label: t(lang, 'wt'), visible: true, width: 'sm' },
      { id: 'length', label: t(lang, 'length'), visible: true, width: 'sm' },
      { id: 'qty', label: t(lang, 'qty'), visible: true, width: 'sm' },
      { id: 'uom', label: t(lang, 'uom'), visible: true, width: 'sm' }
  ]);

  // Navigation State
  const [sidebarTab, setSidebarTab] = useState<'active' | 'archived'>('active');
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

  // Update config labels when lang changes
  useEffect(() => {
      setTableConfig(prev => prev.map(col => {
          if (col.isCustom) return col;
          const key = col.id === 'description' ? 'desc' : col.id;
          return { ...col, label: t(lang, key as any) || col.label };
      }));
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
                name: file.name,
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
          const updated = { ...rfq };
          // Preserve status if it was sent or awarded
          if (!updated.status) updated.status = 'draft'; 
          
          const newList = storageService.saveRfq(updated);
          setSavedRfqs(newList);
          setRfq(updated);
          
          // Switch sidebar to active so user sees the saved draft immediately
          setSidebarTab('active');
          if (!isSidebarOpen) setIsSidebarOpen(true);

          alert(t(lang, 'save_success'));
      }
  };

  // ... (Keep existing handlers: archive, restore, load, new, delete, sample, send, updateLineItem, deleteItem, updateDim, updateComm, generateSummary, audit, share, generateEmail, generatePDF, generatePO)
  const handleArchiveProject = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const target = savedRfqs.find(r => r.id === id);
      if (target) {
          const updated = { ...target, status: 'archived' as const };
          storageService.saveRfq(updated);
          setSavedRfqs(storageService.getRfqs());
          if (rfq?.id === id) {
             setRfq(updated);
          }
      }
  };

  const handleRestoreProject = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const target = savedRfqs.find(r => r.id === id);
      if (target) {
          const updated = { ...target, status: 'draft' as const };
          storageService.saveRfq(updated);
          setSavedRfqs(storageService.getRfqs());
          if (rfq?.id === id) {
              setRfq(updated);
          }
      }
  };

  const handleLoadRfq = (id: string) => {
      const target = savedRfqs.find(r => r.id === id);
      if (target) {
          setRfq(target);
          setMessages([{ role: 'assistant', content: t(lang, 'clarify_default_response') }]);
          // Auto expand info when loading
          setIsInfoVisible(true);
      }
  };

  const handleNewProject = () => {
      setRfq(null);
      setMessages([{ role: 'assistant', content: t(lang, 'initial_greeting') }]);
      setIsInfoVisible(true);
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
                  material_grade: "API 5L Gr. B", product_type: "Pipe", tolerance: "+/- 12.5% WT", test_reqs: ["HIC Test", "SSC Test"], raw_description: "", other_requirements: [],
                  size: { outer_diameter: { value: 8, unit: "in" }, wall_thickness: { value: 0.322, unit: "in" }, length: { value: 12, unit: "m" } }
              },
              {
                  item_id: "L2", line: 2, quantity: 120, uom: "pcs", description: "Flange, Weld Neck, RF, Class 300", 
                  material_grade: "ASTM A105", product_type: "Flange", tolerance: "", test_reqs: ["Hardness < 22HRC"], raw_description: "", other_requirements: [],
                  size: { outer_diameter: { value: 8, unit: "in" }, wall_thickness: { value: null, unit: null }, length: { value: null, unit: null } }
              },
              {
                  item_id: "L3", line: 3, quantity: 50, uom: "pcs", description: "Elbow 90 deg, Long Radius", 
                  material_grade: "ASTM A234 WPB", product_type: "Fitting", tolerance: "ASME B16.9", test_reqs: [], raw_description: "", other_requirements: [],
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
            
            // Safe merge logic: if model returned items, use them (it should contain merged list now)
            if (incremental.line_items && incremental.line_items.length > 0) {
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

  // ... (Helpers)
  const handleUpdateLineItem = (index: number, field: keyof LineItem, value: any) => {
      if (!rfq) return;
      const updatedItems = [...rfq.line_items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      setRfq({ ...rfq, line_items: updatedItems });
  };

  const handleUpdateCustomField = (index: number, key: string, value: string) => {
      if (!rfq) return;
      const updatedItems = [...rfq.line_items];
      const currentCustom = updatedItems[index].custom_fields || {};
      updatedItems[index] = { 
          ...updatedItems[index], 
          custom_fields: { ...currentCustom, [key]: value }
      };
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

  const handleAddItem = () => {
    let currentRfq = rfq;
    if (!currentRfq) {
        // Create new draft if empty
        currentRfq = {
            id: `RFQ-${Date.now().toString().slice(-4)}`,
            status: 'draft',
            created_at: Date.now(),
            project_name: "New Project",
            line_items: [],
            commercial: { destination: '', incoterm: '', paymentTerm: '', otherRequirements: '', req_mtr: false, req_avl: false, req_tpi: false, warranty_months: 12 },
            original_text: ""
        };
    }

    const newItem: LineItem = {
        item_id: `L${Date.now()}`,
        line: currentRfq.line_items.length + 1,
        raw_description: "",
        description: "",
        product_type: "",
        material_grade: "",
        tolerance: "",
        test_reqs: [],
        standard_or_spec: "",
        size: {
            outer_diameter: { value: null, unit: 'mm' },
            wall_thickness: { value: null, unit: 'mm' },
            length: { value: null, unit: 'mm' }
        },
        quantity: 1,
        uom: 'pcs',
        other_requirements: []
    };

    const updatedRfq = {
        ...currentRfq,
        line_items: [...currentRfq.line_items, newItem]
    };
    
    setRfq(updatedRfq);
    storageService.saveRfq(updatedRfq);
    setSavedRfqs(storageService.getRfqs());
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

  const handleShareLink = async () => {
    if (!rfq) return;
    
    try {
        // Mark as sent when shared
        const sentRfq = { ...rfq, status: 'sent' as const };
        setRfq(sentRfq);
        storageService.saveRfq(sentRfq);
        setSavedRfqs(storageService.getRfqs());

        const jsonStr = JSON.stringify(sentRfq);
        const compressed = LZString.compressToEncodedURIComponent(jsonStr);
        
        // Robust URL generation (clean base) with Unique ID
        const baseUrl = `${window.location.origin}${window.location.pathname}`;
        // Append unique share ID to ensure distinction
        const shareUrl = `${baseUrl}?mode=supplier&data=${compressed}&share_id=${Date.now()}`;
        
        // Attempt to copy
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(shareUrl);
            alert(t(lang, 'link_copied'));
        } else {
            // Fallback for non-secure contexts (e.g. dev)
            prompt("Copy this link to share with suppliers:", shareUrl);
        }
    } catch (e) {
        console.error("Share failed", e);
        alert("Could not create link.");
    }
  };

  const handleAddColumn = () => {
      if (newColumnName.trim()) {
          const id = newColumnName.toLowerCase().replace(/\s+/g, '_');
          if (!tableConfig.find(c => c.id === id)) {
              setTableConfig(prev => [...prev, { 
                  id, 
                  label: newColumnName, 
                  visible: true, 
                  width: 'md', 
                  isCustom: true 
              }]);
              setNewColumnName('');
          }
      }
  };

  const toggleColumnVisibility = (id: string) => {
      setTableConfig(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

  const changeColumnWidth = (id: string, width: 'sm' | 'md' | 'lg') => {
      setTableConfig(prev => prev.map(c => c.id === id ? { ...c, width } : c));
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

      const awardedRfq = { ...rfq, status: 'awarded' as const };
      setRfq(awardedRfq);
      storageService.saveRfq(awardedRfq);
      setSavedRfqs(storageService.getRfqs());

      const emailBody = `Subject: Award Notification - RFQ ${rfq.id} - ${rfq.project_name}\n\nDear ${quote.supplierName},\n\nWe are pleased to inform you that your quotation for RFQ ${rfq.id} has been accepted.\n\nAward Details:\n- Total Value: ${quote.currency} ${quote.total.toLocaleString()}\n- Lead Time: ${quote.leadTime} days\n- Payment Terms: ${quote.payment}\n\nPlease proceed with the order confirmation.\n\nBest regards,\n[Your Name]`;
      setAwardEmail(emailBody);
  };

  const handleGeneratePdf = () => {
    if (!rfq) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 50, 70);
    doc.text("Request for Quotation", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
    
    doc.setDrawColor(200);
    doc.line(14, 32, 196, 32);
    
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Project: ${rfq.project_name || 'N/A'}`, 14, 42);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`RFQ ID: ${rfq.id}`, 14, 48);
    
    if (rfq.commercial.destination) doc.text(`Destination: ${rfq.commercial.destination}`, 14, 54);
    if (rfq.commercial.incoterm) doc.text(`Incoterm: ${rfq.commercial.incoterm}`, 80, 54);
    
    const headers = [['Line', 'Description', 'Material/Grade', 'Tolerance/Tests', 'Qty', 'Unit', 'Size (OD x WT x L)']];
    
    const data = rfq.line_items.map(item => {
        const od = item.size?.outer_diameter?.value ? `${item.size.outer_diameter.value} ${item.size.outer_diameter.unit || ''}` : '-';
        const wt = item.size?.wall_thickness?.value ? `${item.size.wall_thickness.value} ${item.size.wall_thickness.unit || ''}` : '-';
        const len = item.size?.length?.value ? `${item.size.length.value} ${item.size.length.unit || ''}` : '-';
        
        const techDetails = [item.tolerance, ...(item.test_reqs || [])].filter(Boolean).join(", ");

        return [
            item.line.toString(),
            item.description || '',
            item.material_grade || '',
            techDetails || '-',
            item.quantity?.toString() || '0',
            item.uom || '',
            `${od} x ${wt} x ${len}`
        ];
    });

    autoTable(doc, {
        startY: 62,
        head: headers,
        body: data,
        theme: 'grid',
        headStyles: { fillColor: [71, 85, 105], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
    });

    doc.save(`RFQ-${rfq.id}.pdf`);
  };

  const handleGeneratePO = () => {
      if (!selectedQuoteId || !rfq) return;
      const quote = quotes.find(q => q.id === selectedQuoteId);
      if (!quote) return;

      const doc = new jsPDF();
      
      doc.setFillColor(11, 17, 33);
      doc.ellipse(30, 20, 20, 8, 'F');
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text("CRONTAL", 16, 22);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.text("Purchase Order", 120, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Order Number: ${rfq.id.split('-').pop()}`, 65, 30);
      doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'})}`, 130, 30);
      doc.text(`Page 1 of 1`, 180, 30);

      const leftX = 14;
      const rightX = 110;
      let y = 45;

      doc.setFont("helvetica", "bold");
      doc.text(`Buyer: CRONTAL INC`, leftX, y); y += 6;
      doc.text(`Contact: John Buyer`, leftX, y); y += 6;
      doc.text(`Phone: (555) 123-4567`, leftX, y); y += 6;
      doc.text(`Fax: (555) 123-4568`, leftX, y); y += 6;
      doc.text(`Email: buyer@crontal.com`, leftX, y);

      y = 45;
      doc.text("Delivery To:", rightX, y); y += 6;
      doc.setFont("helvetica", "normal");
      doc.text(`${rfq.commercial.destination || "Designated Port"}`, rightX, y, { maxWidth: 80 });
      y += 10;

      y = 80;
      doc.setFont("helvetica", "bold");
      doc.text("Product Description:", leftX, y);
      doc.setFont("helvetica", "normal");
      doc.text(`${rfq.project_name}: ${rfq.project_description || "See detailed items below."}`, leftX, y + 6);
      
      doc.text("Currency: " + quote.currency, 160, y + 14);

      const headers = [['Size\n(OD*WT*L)', 'Specs / Tolerance', 'OD\n(mm)', 'WT\n(mm)', 'Qty', 'N.W\n(Kgs)', 'Price', 'Amount']];
      
      const tableData = rfq.line_items.map((item, i) => {
          const qItem = quote.items.find(qi => qi.line === item.line);
          const price = qItem?.unitPrice || 0;
          const total = qItem?.lineTotal || 0;

          const od = item.size.outer_diameter.value || '-';
          const wt = item.size.wall_thickness.value || '-';
          const len = item.size.length.value || '-';
          const odU = item.size.outer_diameter.unit === 'in' ? '"' : '';
          const wtU = item.size.wall_thickness.unit === 'in' ? '"' : '';
          const sizeStr = `${od}${odU} x ${wt}${wtU} x ${len}`;
          const deepSpecs = [item.material_grade, item.tolerance, ...(item.test_reqs || [])].filter(Boolean).join(", ");

          return [
              sizeStr, deepSpecs, od.toString(), wt.toString(),
              `${item.quantity} ${item.uom}`, "-", price.toFixed(2), total.toFixed(2)
          ];
      });

      tableData.push([
          "", "", "", "Total", 
          rfq.line_items.reduce((acc, i) => acc + (i.quantity || 0), 0).toString(), 
          "-", "", quote.total.toFixed(2)
      ]);

      autoTable(doc, {
          startY: y + 18,
          head: headers,
          body: tableData,
          theme: 'plain',
          styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, valign: 'middle', halign: 'center' },
          headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1 },
          columnStyles: { 0: { halign: 'left', cellWidth: 35 }, 1: { halign: 'left', cellWidth: 40 }, 7: { halign: 'right' } }
      });

      let finalY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFont("helvetica", "bold");
      doc.text(`SAY: ${quote.currency} ${quote.total.toLocaleString()} ONLY`, leftX, finalY);
      finalY += 10;

      const termsX = leftX;
      const valX = leftX + 40;
      
      const addTerm = (label: string, value: string) => {
          doc.setFont("helvetica", "bold");
          doc.text(label, termsX, finalY);
          doc.setFont("helvetica", "normal");
          doc.text(value, valX, finalY);
          finalY += 6;
      };

      addTerm("Delivery Condition:", "Standard Export Packing");
      addTerm("Packing:", "Plywooden cases / Bundles");
      addTerm("Delivery Timeline:", `${quote.leadTime} days from PO`);
      addTerm("Payment:", quote.payment || "Net 30");
      addTerm("Documents:", "Commercial Invoice, Packing List, MTC");
      
      finalY += 4;
      doc.rect(termsX, finalY, 120, 15);
      doc.setFont("helvetica", "bold");
      doc.text("Delivery Instructions:", termsX + 2, finalY + 5);
      doc.setFont("helvetica", "normal");
      doc.text(`Quality to comply with ${rfq.line_items[0]?.material_grade || "ASTM"} standards.`, termsX + 2, finalY + 10);

      doc.rect(140, finalY, 50, 15);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Total", 145, finalY + 10);
      doc.text(quote.total.toFixed(2), 170, finalY + 10, { align: 'center' });

      finalY += 30;
      doc.setFontSize(10);
      doc.text("Brava Stainless Steel Inc .AUTHORIZED SIGNATURE _________________________", leftX, finalY);

      doc.save(`PO_${quote.supplierName}_${rfq.id}.pdf`);
  };

  // --- NEW COMPARISON TABLE RENDERING ---
  const renderComparisonTable = () => {
      if (quotes.length === 0) return null;
      
      const sortedQuotes = getSortedQuotes();
      
      return (
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm mt-4">
              <table className="w-full text-xs text-left">
                  <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <th className="px-4 py-3 font-bold uppercase tracking-wider w-40 bg-slate-100/50 sticky left-0">Criteria</th>
                          {sortedQuotes.map((q, idx) => (
                              <th key={q.id} className={`px-4 py-3 font-bold w-48 ${idx === 0 ? 'bg-green-50/50 text-green-800' : ''}`}>
                                  {q.supplierName}
                                  {idx === 0 && <span className="block text-[9px] text-green-600 font-normal mt-0.5">Best Match</span>}
                              </th>
                          ))}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                      <tr className="group hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-700 bg-slate-50/30 sticky left-0">Total Price</td>
                          {sortedQuotes.map((q, idx) => (
                              <td key={q.id} className="px-4 py-3">
                                  <span className={`font-bold text-sm ${idx === 0 ? 'text-green-700' : 'text-slate-800'}`}>
                                      {q.currency} {q.total.toLocaleString()}
                                  </span>
                              </td>
                          ))}
                      </tr>
                      <tr className="group hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-600 bg-slate-50/30 sticky left-0">Lead Time</td>
                          {sortedQuotes.map((q) => (
                              <td key={q.id} className="px-4 py-3">
                                  {parseInt(q.leadTime) <= 14 ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-medium">
                                          {q.leadTime} Days
                                      </span>
                                  ) : (
                                      <span className="text-slate-600">{q.leadTime} Days</span>
                                  )}
                              </td>
                          ))}
                      </tr>
                      <tr className="group hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-600 bg-slate-50/30 sticky left-0">Payment Terms</td>
                          {sortedQuotes.map((q) => (
                              <td key={q.id} className="px-4 py-3 text-slate-600">{q.payment || "-"}</td>
                          ))}
                      </tr>
                      <tr className="group hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-600 bg-slate-50/30 sticky left-0">Tech Compliance</td>
                          {sortedQuotes.map((q) => {
                              const hasAlternates = q.items.some(i => i.alternates && i.alternates.trim().length > 0);
                              return (
                                  <td key={q.id} className="px-4 py-3">
                                      {hasAlternates ? (
                                          <span className="text-orange-600 text-[10px] font-medium flex items-center gap-1">
                                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                              Deviations
                                          </span>
                                      ) : (
                                          <span className="text-green-600 text-[10px] font-medium flex items-center gap-1">
                                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                              Compliant
                                          </span>
                                      )}
                                  </td>
                              );
                          })}
                      </tr>
                      <tr className="group hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-600 bg-slate-50/30 sticky left-0">Documents (MTRs)</td>
                          {sortedQuotes.map((q) => (
                              <td key={q.id} className="px-4 py-3 text-slate-600">
                                  {q.attachments && q.attachments.length > 0 ? `${q.attachments.length} Files` : "None"}
                              </td>
                          ))}
                      </tr>
                  </tbody>
              </table>
          </div>
      );
  };

  const steps = [
      { selector: '#chat-box', text: t(lang, 'step1') },
      { selector: '#rfq-table', text: t(lang, 'step2') },
      { selector: '#quote-comparison', text: t(lang, 'step3') }
  ];

  const filteredRfqs = savedRfqs.filter(r => 
      sidebarTab === 'active' 
          ? (!r.status || r.status === 'draft' || r.status === 'sent' || r.status === 'awarded') 
          : r.status === 'archived'
  );

  // Helper to get width class
  const getWidthClass = (width: 'sm' | 'md' | 'lg') => {
      switch(width) {
          case 'sm': return 'w-20';
          case 'md': return 'w-32';
          case 'lg': return 'w-64';
          default: return 'w-32';
      }
  };

  return (
    <div className={`flex flex-col md:flex-row transition-all duration-300 relative min-h-[80vh] ${isSidebarOpen ? 'gap-6' : 'gap-0'}`}>
      <Walkthrough steps={steps} isActive={isTourActive} onClose={() => setIsTourActive(false)} lang={lang} />
      
      {/* Sidebar Navigation */}
      <div className={`
          flex-shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-fit sticky top-4 max-h-[calc(100vh-100px)] transition-all duration-300
          ${isSidebarOpen ? 'md:w-64 opacity-100 translate-x-0' : 'w-0 md:w-0 opacity-0 -translate-x-full border-0 p-0 m-0 pointer-events-none'}
      `}>
          <div className="p-4 border-b border-slate-100">
              <button 
                  onClick={handleNewProject}
                  className="w-full bg-accent text-white rounded-xl py-2.5 text-sm font-medium hover:bg-accent/90 transition shadow-sm flex items-center justify-center gap-2"
              >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  {t(lang, 'nav_new_project')}
              </button>
          </div>
          
          <div className="flex border-b border-slate-100">
              <button 
                onClick={() => setSidebarTab('active')}
                className={`flex-1 py-2 text-xs font-medium text-center transition ${sidebarTab === 'active' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {t(lang, 'nav_active')}
              </button>
              <button 
                onClick={() => setSidebarTab('archived')}
                className={`flex-1 py-2 text-xs font-medium text-center transition ${sidebarTab === 'archived' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {t(lang, 'nav_archived')}
              </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[300px]">
              {filteredRfqs.length === 0 && (
                  <p className="px-3 py-4 text-xs text-slate-400 italic text-center">No projects found</p>
              )}
              {filteredRfqs.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => handleLoadRfq(item.id)}
                    className={`group px-3 py-2.5 rounded-lg cursor-pointer flex items-center justify-between text-sm transition ${
                        rfq?.id === item.id ? 'bg-accent/10 text-accent font-medium' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                      <div className="truncate flex-1 min-w-0 pr-2">
                          <div className="truncate">{item.project_name || "Untitled"}</div>
                          <div className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleDateString()} • {item.status || 'draft'}</div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         {sidebarTab === 'active' ? (
                            <button 
                                onClick={(e) => handleArchiveProject(e, item.id)}
                                title={t(lang, 'archive_project')}
                                className="text-slate-400 hover:text-orange-500 p-1"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                            </button>
                         ) : (
                             <button 
                                 onClick={(e) => handleRestoreProject(e, item.id)}
                                 title={t(lang, 'restore_project')}
                                 className="text-slate-400 hover:text-green-500 p-1"
                             >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                         )}
                          <button 
                            onClick={(e) => handleDeleteProject(e, item.id)}
                            className="text-slate-400 hover:text-red-500 p-1"
                          >
                             ×
                          </button>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-4 min-w-0">
        
        {/* Header Bar with Toggle & Steps */}
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
                 <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
                    title={isSidebarOpen ? t(lang, 'hide_sidebar') : t(lang, 'show_sidebar')}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        {isSidebarOpen ? (
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" className="hidden" />
                        ) : (
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" className="hidden" />
                        )}
                    </svg>
                </button>
                {rfq && (
                    <div className="flex items-center gap-2">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex items-center hidden sm:flex">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-medium transition-all shadow-sm ${
                                    activeStep === step 
                                    ? 'bg-white border-accent text-accent ring-2 ring-accent/10' 
                                    : activeStep > step 
                                        ? 'bg-slate-50 border-slate-200 text-slate-500' 
                                        : 'bg-white border-slate-100 text-slate-300'
                                }`}>
                                    <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[9px] ${activeStep === step ? 'bg-accent text-white' : activeStep > step ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        {activeStep > step ? '✓' : step}
                                    </span>
                                    <span>{t(lang, `step${step}` as any)}</span>
                                </div>
                                {step < 3 && <div className={`w-6 h-[2px] mx-1 rounded-full ${activeStep > step ? 'bg-green-500' : 'bg-slate-200'}`} />}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        <div className="grid md:grid-cols-12 gap-6 items-start">
            {/* Left Col: Chat (4 cols) */}
            <div className="md:col-span-4 flex flex-col sticky top-4" style={{ height: 'calc(100vh - 120px)' }}>
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden flex flex-col h-full" id="chat-box">
                    {/* ... (Keep Chat UI) ... */}
                    <div className="p-3 border-b border-slate-100 bg-white flex justify-between items-center sticky top-0 z-10">
                        <div className="flex items-center gap-2">
                             <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">1</div>
                             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                             <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{t(lang, 'drafting_assistant')}</span>
                        </div>
                        <button onClick={() => setIsTourActive(true)} className="text-[10px] text-accent hover:text-accent/80 font-medium px-2 py-1 bg-accent/5 rounded-md transition">{t(lang, 'guide_me')}</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/30">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] relative group ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
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
                        <div className="flex flex-col gap-2">
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
                                className="w-full bg-slate-50 rounded-xl border-0 px-4 py-3 text-sm focus:ring-2 focus:ring-accent/20 focus:bg-white transition placeholder-slate-400 min-h-[80px] max-h-[200px] resize-none leading-relaxed"
                                rows={3}
                            />
                            <div className="flex justify-between items-center">
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
                                    className="text-slate-400 hover:text-accent hover:bg-accent/5 px-2 py-1.5 rounded-lg transition text-xs flex items-center gap-1"
                                    title={t(lang, 'upload_file')}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                    <span className="hidden sm:inline">Attach</span>
                                </button>
                                <button 
                                    onClick={handleSend}
                                    disabled={isProcessing || (!input && attachedFiles.length === 0)}
                                    className="bg-accent hover:bg-accent/90 text-white rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-accent/20 flex items-center gap-2"
                                >
                                    <span>{t(lang, 'send')}</span>
                                    <svg className="w-3 h-3 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Col: RFQ Data */}
            <div className="md:col-span-8 flex flex-col">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden flex flex-col">
                    {/* Action Bar */}
                    <div className="px-4 py-3 border-b border-slate-100 bg-white flex justify-between items-center h-14" id="action-bar">
                        <div className="flex items-center gap-2">
                             {/* STEP 2 BADGE */}
                             <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">2</div>
                             {/* Show Project Name in Header if Info is Hidden */}
                             {!isInfoVisible && rfq && (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                                     <span className="text-sm font-bold text-slate-800">{rfq.project_name || "Untitled Project"}</span>
                                     <span className={`text-[10px] px-2 py-0.5 rounded-full border ${rfq.status === 'awarded' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
                                        {rfq.status || 'draft'}
                                     </span>
                                     <div className="h-4 w-[1px] bg-slate-300 mx-1"></div>
                                </div>
                             )}
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t(lang, 'live_preview')}</span>
                        </div>
                        <div className="flex gap-2">
                            {rfq && (
                                <button
                                    onClick={() => setIsInfoVisible(!isInfoVisible)}
                                    className={`text-[10px] font-medium px-3 py-1.5 border rounded-lg transition flex items-center gap-1 ${isInfoVisible ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-accent/10 text-accent border-accent/20'}`}
                                >
                                    {isInfoVisible ? t(lang, 'hide_info') : t(lang, 'show_info')}
                                </button>
                            )}
                            <button
                                onClick={handleSaveDraft}
                                disabled={!rfq}
                                className="text-[10px] font-medium text-slate-600 hover:text-accent transition px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-50"
                            >
                                {t(lang, 'save_draft')}
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
                    
                    <div className="p-4 space-y-4" id="rfq-table">
                        {!rfq ? (
                            <div className="min-h-[400px] flex flex-col justify-center gap-6">
                                {/* Empty State Dashboard */}
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
                                    
                                    <div onClick={handleAddItem} className="group cursor-pointer bg-slate-50 hover:bg-white border border-slate-200 hover:border-accent/50 p-6 rounded-2xl transition-all shadow-sm hover:shadow-md text-center flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                                            <span className="text-2xl font-bold">+</span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-900 text-sm">{t(lang, 'add_line_item')}</h4>
                                            <p className="text-xs text-slate-500 mt-1">Manually create a new list</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Project Info Section */}
                                {isInfoVisible && (
                                    <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        <div className="px-4 py-2 border-b border-slate-100 bg-slate-100/50 flex justify-between items-center">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t(lang, 'project_info')}</h3>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={handleAudit}
                                                    disabled={isAuditing}
                                                    className="text-[10px] text-orange-600 hover:text-white hover:bg-orange-500 font-medium flex items-center gap-1 bg-white border border-orange-200 px-2 py-0.5 rounded transition disabled:opacity-50"
                                                >
                                                    {isAuditing ? t(lang, 'audit_running') : t(lang, 'audit_specs')}
                                                </button>
                                                <button 
                                                    onClick={handleGenerateSummary}
                                                    disabled={isGeneratingSummary}
                                                    className="text-[10px] text-accent hover:text-white hover:bg-accent font-medium flex items-center gap-1 bg-white border border-accent/20 px-2 py-0.5 rounded transition disabled:opacity-50"
                                                >
                                                    {isGeneratingSummary ? '...' : t(lang, 'generate_summary')}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-4">
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
                                )}

                                {/* Editable Items Table */}
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-1 relative">
                                    <div className="text-[10px] font-medium text-slate-500 p-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span>{t(lang, 'edit_mode_hint')}</span>
                                            <button 
                                                onClick={handleAddItem}
                                                className="bg-white border border-slate-200 text-accent px-2 py-0.5 rounded shadow-sm hover:bg-accent hover:text-white transition flex items-center gap-1"
                                            >
                                                <span>+</span> {t(lang, 'add_line_item')}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-accent">{rfq.line_items.length} items</span>
                                            {/* Column Manager Button */}
                                            <button 
                                                onClick={() => setShowColumnManager(!showColumnManager)}
                                                className="text-slate-400 hover:text-accent transition p-1 rounded hover:bg-slate-100 relative"
                                                title={t(lang, 'column_settings')}
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Column Manager Popover */}
                                    {showColumnManager && (
                                        <div className="absolute right-2 top-10 z-50 bg-white border border-slate-200 shadow-xl rounded-xl w-64 p-3 animate-in fade-in zoom-in-95 duration-200">
                                            <h4 className="text-xs font-bold text-slate-700 uppercase mb-2 border-b border-slate-100 pb-1">{t(lang, 'column_settings')}</h4>
                                            <div className="max-h-64 overflow-y-auto space-y-2">
                                                {tableConfig.map(col => (
                                                    <div key={col.id} className="flex items-center justify-between">
                                                        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={col.visible} 
                                                                onChange={() => toggleColumnVisibility(col.id)}
                                                                className="rounded border-slate-300 text-accent focus:ring-accent"
                                                            />
                                                            {col.label}
                                                        </label>
                                                        <div className="flex gap-1 bg-slate-100 rounded p-0.5">
                                                            <button onClick={() => changeColumnWidth(col.id, 'sm')} className={`text-[8px] px-1.5 rounded ${col.width === 'sm' ? 'bg-white shadow text-accent' : 'text-slate-400'}`}>S</button>
                                                            <button onClick={() => changeColumnWidth(col.id, 'md')} className={`text-[8px] px-1.5 rounded ${col.width === 'md' ? 'bg-white shadow text-accent' : 'text-slate-400'}`}>M</button>
                                                            <button onClick={() => changeColumnWidth(col.id, 'lg')} className={`text-[8px] px-1.5 rounded ${col.width === 'lg' ? 'bg-white shadow text-accent' : 'text-slate-400'}`}>L</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-slate-100">
                                                <label className="block text-[10px] text-slate-500 mb-1">{t(lang, 'add_column')}</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        value={newColumnName}
                                                        onChange={e => setNewColumnName(e.target.value)}
                                                        placeholder={t(lang, 'enter_col_name')}
                                                        className="text-xs border border-slate-200 rounded px-2 py-1 flex-1 focus:outline-none focus:border-accent"
                                                    />
                                                    <button 
                                                        onClick={handleAddColumn}
                                                        className="bg-accent text-white text-xs px-2 py-1 rounded hover:bg-accent/90"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setShowColumnManager(false)}
                                                className="mt-3 w-full bg-slate-100 text-slate-600 text-xs py-1.5 rounded hover:bg-slate-200"
                                            >
                                                {t(lang, 'close_window')}
                                            </button>
                                        </div>
                                    )}

                                    <div className="overflow-x-auto max-h-[600px]">
                                    <table className="w-full text-xs text-left table-fixed">
                                        <thead className="bg-white text-slate-500 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                {tableConfig.filter(c => c.visible).map(col => (
                                                    <th key={col.id} className={`px-4 py-3 bg-white/95 backdrop-blur border-b border-slate-200 ${getWidthClass(col.width)}`}>
                                                        {col.label}
                                                    </th>
                                                ))}
                                                <th className="px-4 py-3 text-center w-10 bg-white/95 backdrop-blur border-b border-slate-200 sticky right-0 shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)] z-20"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {rfq.line_items.map((item, index) => (
                                                <tr key={item.item_id} className="hover:bg-slate-50 transition-colors group">
                                                    {tableConfig.filter(c => c.visible).map(col => {
                                                        if (col.id === 'line') return <td key={col.id} className="px-4 py-2.5 text-center text-slate-400 bg-slate-50/30 border-r border-slate-50 font-mono text-[10px] w-20 align-middle"><div className="w-full truncate">{item.line}</div></td>;
                                                        if (col.id === 'shape') return <td key={col.id} className="px-4 py-2.5 w-32 align-middle"><input value={item.product_type || ''} onChange={(e) => handleUpdateLineItem(index, 'product_type', e.target.value)} className="w-full bg-transparent border border-transparent rounded px-1.5 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none text-slate-600 transition-all" placeholder="Pipe/Flange" /></td>;
                                                        if (col.id === 'description') return <td key={col.id} className="px-4 py-2.5 w-64 align-middle"><input value={item.description} onChange={(e) => handleUpdateLineItem(index, 'description', e.target.value)} className="w-full bg-transparent border border-transparent rounded px-1.5 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none font-medium text-slate-700 transition-all" /></td>;
                                                        if (col.id === 'grade') return <td key={col.id} className="px-4 py-2.5 w-32 align-middle"><input value={item.material_grade || ''} onChange={(e) => handleUpdateLineItem(index, 'material_grade', e.target.value)} className="w-full bg-transparent border border-transparent rounded px-1.5 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none text-slate-600 transition-all" /></td>;
                                                        if (col.id === 'tolerance') return <td key={col.id} className="px-4 py-2.5 w-20 align-middle"><input value={item.tolerance || ''} onChange={(e) => handleUpdateLineItem(index, 'tolerance', e.target.value)} placeholder="-" className="w-full bg-transparent border border-transparent rounded px-1.5 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none text-slate-500 text-[10px] transition-all" /></td>;
                                                        if (col.id === 'tests') return <td key={col.id} className="px-4 py-2.5 w-20 align-middle"><input value={item.test_reqs?.join(', ') || ''} onChange={(e) => handleUpdateLineItem(index, 'test_reqs', e.target.value.split(',').map(s => s.trim()))} placeholder="-" className="w-full bg-transparent border border-transparent rounded px-1.5 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none text-slate-500 text-[10px] transition-all" /></td>;
                                                        if (col.id === 'od') return <td key={col.id} className="px-4 py-2.5 w-20 align-middle"><div className="flex items-center"><input type="number" value={item.size.outer_diameter.value || ''} onChange={(e) => handleUpdateDimension(index, 'outer_diameter', 'value', Number(e.target.value))} className="w-12 text-right bg-transparent border border-transparent rounded px-1 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none text-slate-700 font-mono transition-all" /><span className="text-[10px] text-slate-400 ml-1">{item.size.outer_diameter.unit}</span></div></td>;
                                                        if (col.id === 'wt') return <td key={col.id} className="px-4 py-2.5 w-20 align-middle"><div className="flex items-center"><input type="number" value={item.size.wall_thickness.value || ''} onChange={(e) => handleUpdateDimension(index, 'wall_thickness', 'value', Number(e.target.value))} className="w-12 text-right bg-transparent border border-transparent rounded px-1 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none text-slate-700 font-mono transition-all" /><span className="text-[10px] text-slate-400 ml-1">{item.size.wall_thickness.unit}</span></div></td>;
                                                        if (col.id === 'length') return <td key={col.id} className="px-4 py-2.5 w-20 align-middle"><div className="flex items-center"><input type="number" value={item.size.length.value || ''} onChange={(e) => handleUpdateDimension(index, 'length', 'value', Number(e.target.value))} className="w-12 text-right bg-transparent border border-transparent rounded px-1 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none text-slate-700 font-mono transition-all" /><span className="text-[10px] text-slate-400 ml-1">{item.size.length.unit}</span></div></td>;
                                                        if (col.id === 'qty') return <td key={col.id} className="px-4 py-2.5 w-20 align-middle"><input type="number" value={item.quantity || 0} onChange={(e) => handleUpdateLineItem(index, 'quantity', Number(e.target.value))} className="w-full text-right bg-transparent border border-transparent rounded px-1 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none text-slate-700 font-bold transition-all" /></td>;
                                                        if (col.id === 'uom') return <td key={col.id} className="px-4 py-2.5 w-20 align-middle"><input value={item.uom || ''} onChange={(e) => handleUpdateLineItem(index, 'uom', e.target.value)} className="w-full bg-transparent border border-transparent rounded px-1 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none text-slate-400 text-[10px] transition-all" /></td>;
                                                        if (col.isCustom) return <td key={col.id} className="px-4 py-2.5 w-32 align-middle"><input value={item.custom_fields?.[col.id] || ''} onChange={(e) => handleUpdateCustomField(index, col.id, e.target.value)} className="w-full bg-transparent border border-transparent rounded px-1.5 py-0.5 hover:border-slate-200 focus:border-accent focus:bg-white focus:outline-none text-slate-600 transition-all" placeholder="-" /></td>;
                                                        return <td key={col.id}></td>;
                                                    })}
                                                    <td className="px-4 py-2.5 text-center w-10 sticky right-0 bg-white shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)] align-middle">
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
                                        <div className="flex justify-between items-center px-1">
                                            <div className="flex items-center gap-2">
                                                {/* STEP 3 BADGE */}
                                                <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">3</div>
                                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">{t(lang, 'received_quotes')}</h3>
                                                <span className="bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{quotes.length}</span>
                                                
                                                <div className="ml-4 flex bg-slate-100 rounded-lg p-0.5">
                                                    <button 
                                                        onClick={() => setShowCompareMatrix(false)}
                                                        className={`px-3 py-1 text-[10px] rounded-md font-medium transition ${!showCompareMatrix ? 'bg-white text-accent shadow-sm' : 'text-slate-500'}`}
                                                    >
                                                        Cards
                                                    </button>
                                                    <button 
                                                        onClick={() => setShowCompareMatrix(true)}
                                                        className={`px-3 py-1 text-[10px] rounded-md font-medium transition ${showCompareMatrix ? 'bg-white text-accent shadow-sm' : 'text-slate-500'}`}
                                                    >
                                                        Table
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-slate-500">{t(lang, 'sort_by')}</span>
                                                <select 
                                                    value={sortBy} 
                                                    onChange={(e) => setSortBy(e.target.value as 'price' | 'leadTime')}
                                                    className="border-none bg-transparent font-medium text-slate-700 focus:ring-0 cursor-pointer"
                                                >
                                                    <option value="price">{t(lang, 'price')}</option>
                                                    <option value="leadTime">{t(lang, 'delivery')}</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        {showCompareMatrix ? (
                                            renderComparisonTable()
                                        ) : (
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
                                                            {idx === 0 && sortBy === 'price' && (
                                                                <div className="absolute -top-3 left-6 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                                                                    {t(lang, 'best_offer')}
                                                                </div>
                                                            )}
                                                            {idx === 0 && sortBy === 'leadTime' && (
                                                                <div className="absolute -top-3 left-6 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                                                                    {t(lang, 'fastest_delivery')}
                                                                </div>
                                                            )}

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

                                                            {/* Attachments Display */}
                                                            {q.attachments && q.attachments.length > 0 && (
                                                                <div className="mt-2 border-t border-slate-100 pt-2">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Documents</p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {q.attachments.map((file, i) => (
                                                                            <div key={i} className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-[10px] text-slate-600">
                                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                                                <span className="truncate max-w-[100px]" title={file.name}>{file.name}</span>
                                                                                {!file.data && <span className="text-xs text-orange-400" title="Content attached">*</span>}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
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
                                        )}

                                        {selectedQuoteId && awardEmail && !showCompareMatrix && (
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
