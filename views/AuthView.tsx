
import React, { useState } from 'react';
import { authService } from '../services/authService';
import { User } from '../types';

interface AuthViewProps {
  onLogin: (user: User) => void;
  onBack: () => void;
}

export default function AuthView({ onLogin, onBack }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ 
      name: '', 
      email: '', 
      password: '',
      companyName: '',
      role: 'buyer' as 'buyer' | 'supplier'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let user: User;
      if (isLogin) {
        user = await authService.login(formData.email, formData.password);
      } else {
        if (!formData.name) throw new Error("Name is required");
        if (!formData.companyName) throw new Error("Company Name is required");
        
        user = await authService.signup(
            formData.name, 
            formData.email, 
            formData.password, 
            formData.role,
            formData.companyName
        );
      }
      onLogin(user);
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative">
      {/* Back Link */}
      <button 
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-accent transition z-10"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        Back to Home
      </button>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <svg viewBox="0 0 40 40" fill="none" className="h-12 w-12 rounded-xl">
                <rect width="40" height="40" rx="8" fill="#0B1121"/>
                <path d="M12 20C12 15.5817 15.5817 12 20 12C22.25 12 24.28 12.93 25.76 14.43" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M12 20C12 24.4183 15.5817 28 20 28C22.25 28 24.28 27.07 25.76 25.57" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                <path d="M22 20H32M32 20L28 16M32 20L28 24" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">
            {isLogin ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="text-center text-slate-500 text-sm mb-8">
            {isLogin ? 'Enter your credentials to access the portal' : 'Join Crontal to streamline your workflow'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Role Switcher */}
            {!isLogin && (
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                    <button
                        type="button"
                        onClick={() => setFormData({...formData, role: 'buyer'})}
                        className={`py-2 text-xs font-bold uppercase rounded-lg transition ${formData.role === 'buyer' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Buyer
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({...formData, role: 'supplier'})}
                        className={`py-2 text-xs font-bold uppercase rounded-lg transition ${formData.role === 'supplier' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Supplier
                    </button>
                </div>
            )}

            {!isLogin && (
              <>
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                    <input
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Company Name</label>
                    <input
                    type="text"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition"
                    value={formData.companyName}
                    onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                    />
                </div>
              </>
            )}
            
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs border border-red-100 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl transition shadow-lg disabled:opacity-70 flex justify-center items-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-500 hover:text-brandOrange transition"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
        <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            Secure Environment: Mock Backend Active.
          </p>
        </div>
      </div>
    </div>
  );
}
