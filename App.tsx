
import React, { useState, useEffect } from 'react';
import LZString from 'lz-string';
import { Rfq, Quote, ViewMode, Language, User } from './types';
import BuyerView from './views/BuyerView';
import SupplierView from './views/SupplierView';
import AuthView from './views/AuthView';
import LandingPage from './views/LandingPage';
import TechCapabilities from './views/TechCapabilities';
import QualityStandards from './views/QualityStandards';
import About from './views/About';
import RoiPage from './views/RoiPage';
import SupplierLandingPage from './views/SupplierLandingPage';
import PrivacyPolicy from './views/PrivacyPolicy';
import TermsOfService from './views/TermsOfService';
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
        
        // 1. Supplier Mode: Loading an RFQ to quote on
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

        // 2. Buyer Mode: Loading a Quote Response from a Supplier
        if (mode === 'quote_response' && encodedData) {
            try {
                const decompressed = LZString.decompressFromEncodedURIComponent(encodedData);
                if (decompressed) {
                    const incomingQuote: Quote = JSON.parse(decompressed);
                    
                    // Attempt to find the original RFQ in local storage to contextually load it
                    const storedRfqStr = localStorage.getItem(`rfq_${incomingQuote.rfqId}`);
                    
                    if (storedRfqStr) {
                        const originalRfq = JSON.parse(storedRfqStr);
                        setRfq(originalRfq);
                        // Append quote to list, deduplicating by ID
                        setQuotes(prev => {
                            const exists = prev.some(q => q.id === incomingQuote.id);
                            return exists ? prev : [...prev, incomingQuote];
                        });
                        alert(t('en', 'quote_imported_success', { supplier: incomingQuote.supplierName }));
                    } else {
                        alert("Quote received, but the original RFQ was not found on this device.");
                    }
                }
            } catch (e) {
                console.error("Failed to import quote", e);
            }
        }

        // 3. Standard Auth Check
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
    setQuotes(prev => [...prev, newQuote]);
  };

  const handleSupplierExit = () => {
      window.location.href = window.location.pathname;
  };

  if (checkingAuth) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm">Loading Crontal...</div>;
  }

  // Standalone Views
  if (view === 'TECH') {
      return <TechCapabilities onBack={() => setView('HOME')} onStartDemo={() => setView('BUYER')} />;
  }

  if (view === 'QUALITY') {
      return <QualityStandards onBack={() => setView('HOME')} onStartDemo={() => setView('BUYER')} />;
  }

  if (view === 'ABOUT') {
      return <About onBack={() => setView('HOME')} onStart={() => setView('BUYER')} />;
  }

  if (view === 'ROI') {
      return <RoiPage onBack={() => setView('HOME')} onStart={() => setView('BUYER')} />;
  }

  if (view === 'SUPPLIER_LANDING') {
      return <SupplierLandingPage onBack={() => setView('HOME')} onStartDemo={() => setView('BUYER')} />;
  }

  if (view === 'PRIVACY') {
      return <PrivacyPolicy onBack={() => setView('HOME')} />;
  }

  if (view === 'TERMS') {
      return <TermsOfService onBack={() => setView('HOME')} />;
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
  
  if (view === 'HOME' && !user) {
      return (
        <LandingPage 
            onStart={() => setView('BUYER')} 
            onTechDemo={() => setView('TECH')} 
            onQuality={() => setView('QUALITY')}
            onAbout={() => setView('ABOUT')}
            onRoi={() => setView('ROI')}
            onSupplierPage={() => setView('SUPPLIER_LANDING')}
            onPrivacy={() => setView('PRIVACY')}
            onTerms={() => setView('TERMS')}
            lang={lang} 
        />
      );
  }

  // Auth View 
  if (view === 'BUYER' && !user) {
    return <AuthView onLogin={handleLogin} onBack={() => setView('HOME')} />;
  }

  // Main App Layout (Logged in or viewing Buyer Demo)
  return (
    <Layout 
      view={view} 
      setView={setView} 
      lang={lang} 
      setLang={setLang}
      user={user}
      onLogout={handleLogout}
    >
      {view === 'HOME' && user && (
         <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-700">
          <div className="h-20 w-20 rounded-2xl bg-accent/10 border border-accent flex items-center justify-center mb-4">
            <span className="text-accent font-bold text-4xl">C</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            {t(lang, 'home_welcome', { name: user.name })}
          </h1>
          <div className="flex gap-4 mt-8">
            <button 
              onClick={() => setView('BUYER')}
              className="px-6 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition shadow-lg shadow-accent/20"
            >
              {t(lang, 'start_rfq')}
            </button>
          </div>
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
