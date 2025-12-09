
import { User, Rfq, Quote } from "../types";

// --- SIMULATED DATABASE KEYS ---
const DB_USERS = 'crontal_db_users';
const DB_RFQS = 'crontal_db_rfqs';
const DB_QUOTES = 'crontal_db_quotes';

// --- MOCK LATENCY ---
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * MOCK API CLIENT
 * This service simulates a real backend API. 
 * In a real deployment, these methods would use `fetch()` to call your Node.js/Next.js/Supabase backend.
 */
export const api = {
    
    // --- AUTHENTICATION ---
    auth: {
        login: async (email: string, password: string): Promise<User> => {
            await delay(600); // Simulate network
            const users: any[] = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
            // Simple insecure password check for demo
            const user = users.find(u => u.email === email && u.password === password);
            
            if (!user) throw new Error("Invalid credentials");
            
            // Return safe user object
            return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role || 'buyer',
                companyName: user.companyName
            };
        },

        register: async (user: Omit<User, 'id'> & { password: string }): Promise<User> => {
            await delay(800);
            const users: any[] = JSON.parse(localStorage.getItem(DB_USERS) || '[]');
            
            if (users.find(u => u.email === user.email)) {
                throw new Error("User already exists");
            }

            const newUser = {
                id: `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                ...user
            };

            users.push(newUser);
            localStorage.setItem(DB_USERS, JSON.stringify(users));

            // Return without password
            const { password, ...safeUser } = newUser;
            return safeUser as User;
        }
    },

    // --- RFQ OPERATIONS ---
    rfq: {
        list: async (userId: string): Promise<Rfq[]> => {
            await delay(400);
            const allRfqs: Rfq[] = JSON.parse(localStorage.getItem(DB_RFQS) || '[]');
            // Filter assuming simplified ownership (all RFQs created by this user)
            // In a real app, you would filter by `owner_id`. 
            // For this demo, we return all since we don't strictly link RFQ to user ID in the schema yet.
            return allRfqs.sort((a, b) => b.created_at - a.created_at);
        },

        get: async (id: string): Promise<Rfq | null> => {
            await delay(300);
            const allRfqs: Rfq[] = JSON.parse(localStorage.getItem(DB_RFQS) || '[]');
            return allRfqs.find(r => r.id === id) || null;
        },

        save: async (rfq: Rfq): Promise<Rfq> => {
            await delay(500);
            const allRfqs: Rfq[] = JSON.parse(localStorage.getItem(DB_RFQS) || '[]');
            const index = allRfqs.findIndex(r => r.id === rfq.id);
            
            if (index >= 0) {
                allRfqs[index] = rfq;
            } else {
                allRfqs.push(rfq);
            }
            
            localStorage.setItem(DB_RFQS, JSON.stringify(allRfqs));
            return rfq;
        },

        delete: async (id: string): Promise<void> => {
            await delay(300);
            let allRfqs: Rfq[] = JSON.parse(localStorage.getItem(DB_RFQS) || '[]');
            allRfqs = allRfqs.filter(r => r.id !== id);
            localStorage.setItem(DB_RFQS, JSON.stringify(allRfqs));
        }
    },

    // --- QUOTE OPERATIONS ---
    quote: {
        submit: async (quote: Quote): Promise<Quote> => {
            await delay(800);
            const allQuotes: Quote[] = JSON.parse(localStorage.getItem(DB_QUOTES) || '[]');
            allQuotes.push(quote);
            localStorage.setItem(DB_QUOTES, JSON.stringify(allQuotes));
            return quote;
        },

        listByRfq: async (rfqId: string): Promise<Quote[]> => {
            await delay(400);
            const allQuotes: Quote[] = JSON.parse(localStorage.getItem(DB_QUOTES) || '[]');
            return allQuotes.filter(q => q.rfqId === rfqId);
        }
    }
};
