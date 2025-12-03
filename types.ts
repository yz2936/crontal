

import { RiskAnalysisItem } from './services/geminiService';

export interface Dimension {
    value: number | null;
    unit: string | null;
  }
  
  export interface Size {
    outer_diameter: Dimension;
    wall_thickness: Dimension;
    length: Dimension;
  }
  
  export interface LineItem {
    item_id: string;
    line: number;
    raw_description: string;
    description: string;
    product_category?: string | null;
    product_type?: string | null;
    material_grade?: string | null;
    standard_or_spec?: string | null;
    tolerance?: string | null; // Deep Spec
    test_reqs?: string[];      // Deep Spec
    size: Size;
    quantity: number | null;
    uom: string | null;
    delivery_location?: string | null;
    required_delivery_date?: string | null;
    incoterm?: string | null;
    payment_terms?: string | null;
    other_requirements: string[];
    custom_fields?: Record<string, string>; // Dynamic columns
  }
  
  export interface CommercialTerms {
    destination: string;
    incoterm: string;
    paymentTerm: string;
    otherRequirements: string;
    // EPC Specific Booleans
    req_mtr: boolean; // Material Test Reports (EN 10204 3.1)
    req_avl: boolean; // Approved Vendor List Restriction
    req_tpi: boolean; // Third Party Inspection
    warranty_months: number;
  }
  
  export interface Rfq {
    id: string;
    status?: 'draft' | 'sent' | 'awarded' | 'archived';
    project_name: string | null;
    project_description?: string; 
    ai_summary?: string;
    audit_warnings?: string[]; // Legacy
    risks?: RiskAnalysisItem[]; // New Structured Risk Data
    line_items: LineItem[];
    original_text: string;
    commercial: CommercialTerms;
    created_at: number;
  }
  
  export interface QuoteItem {
    line: number;
    unitPrice: number | null;
    quantity: number | null;
    lineTotal: number | null;
    rfqDescription?: string; // Helper for display
    moq?: number | null;     // Supplier Requirement
    alternates?: string;     // Supplier Requirement
  }
  
  export interface Quote {
    id: string;
    rfqId: string;
    projectName?: string; // Helper for list view
    supplierName: string;
    currency: string;
    total: number;
    items: QuoteItem[];
    leadTime: string;
    payment: string;
    validity: string;
    notes: string;
    attachments?: FileAttachment[]; // MTRs, Certs
    email: string;
    phone: string;
    timestamp: number;
  }
  
  export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    seedKey?: string;
  }

  export interface User {
    id: string;
    email: string;
    name: string;
  }
  
  // Added INSIGHTS to ViewMode
  export type ViewMode = 'HOME' | 'BUYER' | 'SUPPLIER' | 'TECH' | 'ABOUT' | 'ROI' | 'SUPPLIER_LANDING' | 'QUALITY' | 'PRIVACY' | 'TERMS' | 'BLOG' | 'INSIGHTS';
  
  export interface TourStep {
    selector: string;
    text: string;
  }
  
  export type Language = 'en' | 'es' | 'zh';

  export interface FileAttachment {
    name?: string;
    mimeType: string;
    data: string; // base64 encoded string
  }

  export interface ColumnConfig {
    id: string;
    label: string;
    visible: boolean;
    width: 'sm' | 'md' | 'lg';
    isCustom?: boolean;
  }