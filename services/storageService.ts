
import { Rfq, Quote } from '../types';

const BUYER_RFQ_KEY = 'crontal_buyer_rfqs';
const SUPPLIER_QUOTE_KEY = 'crontal_supplier_quotes';

export const storageService = {
    // Buyer Methods
    saveRfq: (rfq: Rfq) => {
        const existingStr = localStorage.getItem(BUYER_RFQ_KEY);
        let list: Rfq[] = existingStr ? JSON.parse(existingStr) : [];
        
        const index = list.findIndex(item => item.id === rfq.id);
        if (index > -1) {
            list[index] = rfq;
        } else {
            list.push(rfq);
        }
        
        // Sort by date descending
        list.sort((a, b) => b.created_at - a.created_at);
        
        localStorage.setItem(BUYER_RFQ_KEY, JSON.stringify(list));
        return list;
    },

    getRfqs: (): Rfq[] => {
        const existingStr = localStorage.getItem(BUYER_RFQ_KEY);
        return existingStr ? JSON.parse(existingStr) : [];
    },

    deleteRfq: (id: string) => {
        const existingStr = localStorage.getItem(BUYER_RFQ_KEY);
        if (!existingStr) return [];
        let list: Rfq[] = JSON.parse(existingStr);
        list = list.filter(item => item.id !== id);
        localStorage.setItem(BUYER_RFQ_KEY, JSON.stringify(list));
        return list;
    },

    // Buyer Methods - Received Quotes (For Comparison)
    saveReceivedQuote: (quote: Quote) => {
        const key = `crontal_received_quotes_${quote.rfqId}`;
        const existingStr = localStorage.getItem(key);
        let list: Quote[] = existingStr ? JSON.parse(existingStr) : [];
        
        // Check duplicates based on ID
        const index = list.findIndex(item => item.id === quote.id);
        if (index > -1) {
            list[index] = quote;
        } else {
            list.push(quote);
        }
        
        localStorage.setItem(key, JSON.stringify(list));
        return list;
    },

    getReceivedQuotes: (rfqId: string): Quote[] => {
        const key = `crontal_received_quotes_${rfqId}`;
        const existingStr = localStorage.getItem(key);
        return existingStr ? JSON.parse(existingStr) : [];
    },

    // Supplier Methods - Outgoing Quotes
    saveQuote: (quote: Quote) => {
        const existingStr = localStorage.getItem(SUPPLIER_QUOTE_KEY);
        let list: Quote[] = existingStr ? JSON.parse(existingStr) : [];
        
        // Check duplicates based on ID
        const index = list.findIndex(item => item.id === quote.id);
        if (index > -1) {
            list[index] = quote;
        } else {
            list.push(quote);
        }
        
        list.sort((a, b) => b.timestamp - a.timestamp);
        localStorage.setItem(SUPPLIER_QUOTE_KEY, JSON.stringify(list));
        return list;
    },

    getQuotes: (): Quote[] => {
        const existingStr = localStorage.getItem(SUPPLIER_QUOTE_KEY);
        return existingStr ? JSON.parse(existingStr) : [];
    }
};
