import React, { useState, useEffect } from 'react';
import LZString from 'lz-string';
import { Rfq, Quote, ViewMode, Language, User } from './types';
import BuyerView from './views/BuyerView';
import SupplierView from './views/SupplierView';
import AuthView from './views/AuthView';
import { Layout } from './components/Layout';
import { authService } from './services/authService';
import { t } from './utils/i18n';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewMode>('HOME');
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [lang, setLang] = useState<Language>('en');
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const handleUrlState = () => {
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        const encodedData = params.get('data');
        
        // 1. Supplier Mode with Data in URL (Serverless)
        if (mode === 'supplier' && encodedData) {
            try {
                const decompressed = LZString.decompressFromEncodedURIComponent(encodedData);
                if (decompressed) {
                    const sharedRfq = JSON.parse(decompressed);
                    setRfq(sharedRfq);
                    setView('SUPPLIER');
                    setCheckingAuth(false);
                    return;
                }
            } catch (e) {
                console.error("Failed to load shared RFQ", e);
            }
        }

        // 2. Standard Auth Check
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
        setCheckingAuth(false);
    };

    handleUrlState();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setView('HOME');
    setRfq(null);
    setQuotes([]);
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleRfqUpdate = (updatedRfq: Rfq) => {
    setRfq(updatedRfq);
    // Also save to local storage for the buyer's own history
    if (updatedRfq.id) {
        localStorage.setItem(`rfq_${updatedRfq.id}`, JSON.stringify(updatedRfq));
    }
  };

  const handleQuoteSubmit = (newQuote: Quote) => {
    // In a serverless demo, we can't easily push this back to the buyer without a DB.
    // For now, we simulate success and maybe download the quote as a file.
    setQuotes(prev => [...prev, newQuote]);
    alert("Quote generated! Since this is a serverless demo, please save the PDF or screenshot to send back to the buyer.");
  };

  const handleSupplierExit = () => {
      // Clear URL params to return to "Home"
      window.location.href = window.location.pathname;
  };

  if (checkingAuth) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm">Loading Crontal...</div>;
  }

  if (view === 'SUPPLIER') {
      return (
          <SupplierView 
            rfq={rfq} 
            onSubmitQuote={handleQuoteSubmit}
            lang={lang}
            onExit={handleSupplierExit}
          />
      );
  }

  if (!user) {
    return <AuthView onLogin={handleLogin} />;
  }

  return (
    <Layout 
      view={view} 
      setView={setView} 
      lang={lang} 
      setLang={setLang}
      user={user}
      onLogout={handleLogout}
    >
      {view === 'HOME' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-700">
          <div className="h-20 w-20 rounded-2xl bg-accent/10 border border-accent flex items-center justify-center mb-4">
            <span className="text-accent font-bold text-4xl">C</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            {t(lang, 'home_welcome', { name: user.name })}
          </h1>
          <p className="max-w-md text-slate-500 text-lg">
            {t(lang, 'home_subtitle')}
          </p>
          <div className="flex gap-4 mt-8">
            <button 
              onClick={() => setView('BUYER')}
              className="px-6 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition shadow-lg shadow-accent/20"
            >
              {t(lang, 'start_rfq')}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-8">{t(lang, 'powered_by')}</p>
        </div>
      )}

      {view === 'BUYER' && (
        <BuyerView 
          rfq={rfq} 
          setRfq={handleRfqUpdate} 
          quotes={quotes} 
          lang={lang}
        />
      )}
    </Layout>
  );
}