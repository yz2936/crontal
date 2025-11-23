
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
    size: Size;
    quantity: number | null;
    uom: string | null;
    delivery_location?: string | null;
    required_delivery_date?: string | null;
    incoterm?: string | null;
    payment_terms?: string | null;
    other_requirements: string[];
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
    project_name: string | null;
    project_description?: string; 
    ai_summary?: string;
    audit_warnings?: string[]; // AI Engineering Audit results
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
  }
  
  export interface Quote {
    id: string;
    rfqId: string;
    supplierName: string;
    currency: string;
    total: number;
    items: QuoteItem[];
    leadTime: string;
    payment: string;
    validity: string;
    notes: string;
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
  
  export type ViewMode = 'HOME' | 'BUYER' | 'SUPPLIER';
  
  export interface TourStep {
    selector: string;
    text: string;
  }
  
  export type Language = 'en' | 'es' | 'zh';

  export interface FileAttachment {
    mimeType: string;
    data: string; // base64 encoded string
  }
