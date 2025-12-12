


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

  // Moved from geminiService.ts
  export interface RiskAnalysisItem {
    category: 'Technical' | 'Commercial' | 'Strategic';
    risk: string;
    recommendation: string;
    impact_level: 'High' | 'Medium' | 'Low';
}

export interface InsightSource {
    title: string;
    uri: string;
}

export interface InsightResponse {
    content: string;
    sources: InsightSource[];
}

export interface TrendingTopic {
    title: string;
    subtitle: string;
    tag: string;
    impact: 'High' | 'Medium' | 'Low';
}

export interface MarketDataResponse {
    nickel: number;
    moly: number;
    chrome: number; // Added Ferrochrome
    steel: number;
    oil: number;
    copper: number;
    aluminum: number;
    zinc: number;
    lead: number;
    tin: number;
    last_updated: string;
    isFallback?: boolean; // New flag to indicate quota limits
}

export interface SupplierFilters {
    region: string;
    types: string[]; // e.g. Manufacturer, Stockist
    certs: string[]; // e.g. ISO 9001, API 5L
}

export interface SupplierCandidate {
    id: string;
    name: string;
    website?: string;
    location?: string;
    match_reason: string; // The specific reason ("Low Cost Leader")
    rationale?: string;   // The AI's strategic reasoning
    email?: string;       // Primary discovered email
    contacts: string[];   // Buyer added contacts
    selected?: boolean;
    sendStatus?: 'idle' | 'sending' | 'sent' | 'error'; // New status for UI feedback
    tags?: string[];      // e.g. "ISO 9001", "Manufacturer"
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
    invited_suppliers?: SupplierCandidate[]; // Track who was invited
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
    role: 'buyer' | 'supplier'; // Added Role
    companyName?: string;       // Added Company
  }

  export interface BuyerProfile {
    companyName: string;
    address: string;
    logo: string; // Base64
    contactPhone?: string;
    contactEmail?: string;
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
    width: number; // Changed from string union to number for pixels
    isCustom?: boolean;
  }
