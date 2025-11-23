import { User } from "../types";

const USERS_KEY = 'crontal_users';
const SESSION_KEY = 'crontal_session';

// For demo purposes, we store passwords in plain text or simple base64. 
// IN PRODUCTION: Use a real backend and bcrypt/argon2.
export const authService = {
  signup: (name: string, email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        
        if (users.find((u: any) => u.email === email)) {
          reject(new Error('Email already exists'));
          return;
        }

        const newUser = {
          id: `u-${Date.now()}`,
          name,
          email,
          password // storing password locally for demo only
        };

        users.push(newUser);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        
        // Auto login
        const sessionUser = { id: newUser.id, name: newUser.name, email: newUser.email };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
        resolve(sessionUser);
      }, 500);
    });
  },

  login: (email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const user = users.find((u: any) => u.email === email && u.password === password);

        if (!user) {
          reject(new Error('Invalid email or password'));
          return;
        }

        const sessionUser = { id: user.id, name: user.name, email: user.email };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
        resolve(sessionUser);
      }, 500);
    });
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser: (): User | null => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  }
};