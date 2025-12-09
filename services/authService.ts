
import { User } from "../types";
import { api } from "./api";

const SESSION_KEY = 'crontal_session';

export const authService = {
  
  signup: async (name: string, email: string, password: string, role: 'buyer' | 'supplier', companyName: string): Promise<User> => {
    try {
        const user = await api.auth.register({ name, email, password, role, companyName });
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
    } catch (e) {
        throw e;
    }
  },

  login: async (email: string, password: string): Promise<User> => {
    try {
        const user = await api.auth.login(email, password);
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        return user;
    } catch (e) {
        throw e;
    }
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser: (): User | null => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  }
};
