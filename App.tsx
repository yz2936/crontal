import { useState, useEffect } from 'react';
import LZString from 'lz-string';
import { Rfq, Quote, ViewMode, Language, User, CapabilityId } from './types.ts';
import BuyerView from './views/BuyerView.tsx';
import SupplierView from './views/SupplierView.tsx';
import AuthView from './views/AuthView.tsx';
import LandingPage from './views/LandingPage.tsx';
import TechCapabilities from './views/TechCapabilities.tsx';
import QualityStandards from './views/QualityStandards.tsx';
import About from './views/About.tsx';
import RoiPage from './views/RoiPage.tsx';
import SupplierLandingPage from './views/SupplierLandingPage.tsx';
import PrivacyPolicy from './views/PrivacyPolicy.tsx';
import TermsOfService from './views/TermsOfService.tsx';
import BlogPage from './views/BlogPage.tsx'; 
import IndustryInsights from './views/IndustryInsights.tsx';
import ImageEditor from './views/ImageEditor.tsx';
import CapabilityDetail from './views/CapabilityDetail.tsx';
import { Layout } from './components/Layout.tsx';
import { authService } from './services/authService.ts';
import { storageService } from './services/storageService.ts';
import { t } from './utils/i18n.ts';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewMode>('HOME');
  const [rfq, setRfq] = useState<Rfq | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [lang, setLang] = useState<Language>('en');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [selectedCapability, setSelectedCapability] = useState<CapabilityId>('structuring');

  const apiKey = process.env.API_KEY;

  const handleNavigate = (target: string) => {
    if (target.startsWith('CAPABILITY:')) {
        const capId = target.split(':')[1];
        setSelectedCapability(capId as CapabilityId);
        setView('CAPABILITY');
    } else {
        setView(target as ViewMode);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCapabilityNav = (id: string) => {
      setSelectedCapability(id as CapabilityId);
      handleNavigate('CAPABILITY');
  };

  useEffect(() => {
    if (rfq?.id) {
        const storedQuotes = storageService.getReceivedQuotes(rfq.id);
        setQuotes(storedQuotes);
    } else {
        setQuotes([]);
    }
  }, [rfq?.id]);

  useEffect(() => {
    storageService.subscribeToEvents((event) => {
        if (event.type === 'NEW_QUOTE') {
            const incomingQuote = event.payload as Quote;
            if (rfq && incomingQuote.rfqId === rfq.id) {
                storageService.saveReceivedQuote(incomingQuote);
                setQuotes(prev => {
                    if (prev.find(q => q.id === incomingQuote.id)) return prev;
                    return [incomingQuote, ...prev];
                });
            }
        }
    });
  }, [rfq]);

  useEffect(() => {
    const handleUrlState = () => {
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        const encodedData = params.get('data');
        const viewParam = params.get('view');
        
        if (viewParam) {
            setView(viewParam as ViewMode);
            setCheckingAuth(false);
            return;
        }
        
        if (mode === 'supplier' && encodedData) {
            try {
                const safeData = encodedData.replace(/ /g, '+');
                const decompressed = LZString.decompressFromEncodedURIComponent(safeData);
                if (decompressed) {
                    const sharedRfq = JSON.parse(decompressed);
                    setRfq(sharedRfq);
                    setView('SUPPLIER');
                    setCheckingAuth(false);
                    window.history.replaceState({}, '', window.location.pathname);
                    return;
                }
            } catch (e) {
                console.error("Failed to load shared RFQ", e);
            }
        }

        if (mode === 'quote_response' && encodedData) {
            try {
                const safeData = encodedData.replace(/ /g, '+');
                const decompressed = LZString.decompressFromEncodedURIComponent(safeData);
                if (decompressed) {
                    const incomingQuote: Quote = JSON.parse(decompressed);
                    let originalRfq = null;
                    const storedRfqStr = localStorage.getItem(`rfq_${incomingQuote.rfqId}`);
                    
                    if (storedRfqStr) {
                         originalRfq = JSON.parse(storedRfqStr);
                    } else {
                        const allRfqs = storageService.getRfqs();
                        originalRfq = allRfqs.find(r => r.id === incomingQuote.rfqId);
                    }
                    
                    if (!originalRfq) {
                        originalRfq = {
                            id: incomingQuote.rfqId,
                            project_name: incomingQuote.projectName || "Shadow Request (Imported)",
                            status: 'sent',
                            created_at: Date.now(),
                            original_text: "Imported from Quote Link",
                            commercial: {
                                destination: "Imported Context",
                                incoterm: "",
                                paymentTerm: "",
                                otherRequirements: "",
                                req_mtr: false,
                                req_avl: false,
                                req_tpi: false,
                                warranty_months: 12
                            },
                            line_items: incomingQuote.items.map(qItem => ({
                                item_id: `SHADOW-${qItem.line}`,
                                line: qItem.line,
                                description: qItem.rfqDescription || "Item Description Unavailable",
                                raw_description: "",
                                size: { 
                                    outer_diameter: { value: null, unit: null }, 
                                    wall_thickness: { value: null, unit: null }, 
                                    length: { value: null, unit: null } 
                                },
                                quantity: qItem.quantity,
                                uom: "ea",
                                other_requirements: []
                            }))
                        } as Rfq;
                    }
                    
                    if (originalRfq) {
                        setRfq(originalRfq);
                        storageService.saveReceivedQuote(incomingQuote);
                        const updatedQuotes = storageService.getReceivedQuotes(incomingQuote.rfqId);
                        setQuotes(updatedQuotes);
                        window.history.replaceState({}, '', window.location.pathname);
                        setView('BUYER');
                        if (!authService.getCurrentUser()) {
                             const demoUser = { id: 'demo-buyer', name: 'Demo Buyer', email: 'buyer@demo.com', role: 'buyer' as const };
                             setUser(demoUser);
                        }
                    } 
                }
            } catch (e) {
                console.error("Failed to import quote", e);
            }
        }

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

  const handleRfqUpdate = (updatedRfq: Rfq | null) => {
    setRfq(updatedRfq);
    if (updatedRfq && updatedRfq.id) {
        localStorage.setItem(`rfq_${updatedRfq.id}`, JSON.stringify(updatedRfq));
        storageService.saveRfq(updatedRfq);
    }
  };

  const handleQuoteSubmit = (newQuote: Quote) => {
    setQuotes(prev => [...prev, newQuote]);
  };

  if (checkingAuth) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm">Loading Crontal...</div>;
  }

  const navProps = {
      onBack: () => handleNavigate('HOME'),
      onNavigate: handleNavigate,
      onStart: () => handleNavigate('BUYER'),
      onStartDemo: () => handleNavigate('BUYER'),
      lang,
      setLang
  };

  return (
    <>
      {!apiKey && (
        <div className="bg-red-600 text-white text-center py-2 text-xs font-bold fixed top-0 w-full z-[100] shadow-md">
          ⚠️ DEPLOYMENT WARNING: API_KEY is missing. App is running in offline mode.
        </div>
      )}
      <div className={!apiKey ? 'mt-8' : ''}>
        {(() => {
          if (view === 'TECH') return <TechCapabilities {...navProps} />;
          if (view === 'QUALITY') return <QualityStandards {...navProps} />;
          if (view === 'ABOUT') return <About {...navProps} />;
          if (view === 'ROI') return <RoiPage {...navProps} />;
          if (view === 'SUPPLIER_LANDING') return <SupplierLandingPage {...navProps} />;
          if (view === 'PRIVACY') return <PrivacyPolicy {...navProps} />;
          if (view === 'TERMS') return <TermsOfService {...navProps} />;
          if (view === 'BLOG') return <BlogPage {...navProps} />;
          if (view === 'INSIGHTS') return <IndustryInsights {...navProps} />;
          if (view === 'IMAGE_EDITOR') return <ImageEditor onBack={() => handleNavigate('HOME')} lang={lang} />;
          if (view === 'CAPABILITY') return <CapabilityDetail {...navProps} capabilityId={selectedCapability} />;
          if (view === 'SUPPLIER') return <SupplierView rfq={rfq} onSubmitQuote={handleQuoteSubmit} lang={lang} onExit={() => handleNavigate('HOME')} />;
          
          if (view === 'HOME' && !user) {
              return (
                <LandingPage 
                    onStart={() => setView('BUYER')}
                    onNavigate={handleNavigate} 
                    onTechDemo={() => handleNavigate('TECH')} 
                    onQuality={() => handleNavigate('QUALITY')}
                    onAbout={() => handleNavigate('ABOUT')}
                    onRoi={() => handleNavigate('ROI')}
                    onSupplierPage={() => handleNavigate('SUPPLIER_LANDING')}
                    onPrivacy={() => handleNavigate('PRIVACY')}
                    onTerms={() => handleNavigate('TERMS')}
                    onBlog={() => handleNavigate('BLOG')}
                    onCapability={handleCapabilityNav}
                    lang={lang}
                    setLang={setLang}
                />
              );
          }

          if (view === 'BUYER' && !user) {
            return <AuthView onLogin={handleLogin} onBack={() => handleNavigate('HOME')} />;
          }

          return (
            <Layout view={view} setView={setView} lang={lang} setLang={setLang} user={user} onLogout={handleLogout}>
              {view === 'HOME' && user && (
                 <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-700">
                  <div className="h-20 w-20 rounded-2xl bg-accent/10 border border-accent flex items-center justify-center mb-4">
                    <span className="text-accent font-bold text-4xl">C</span>
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t(lang, 'home_welcome', { name: user.name })}</h1>
                  <div className="flex gap-4 mt-8">
                    <button onClick={() => setView('BUYER')} className="px-6 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition shadow-lg shadow-accent/20">{t(lang, 'start_rfq')}</button>
                    <button onClick={() => setView('IMAGE_EDITOR')} className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition shadow-sm">Visual Specs</button>
                  </div>
                </div>
              )}
              {view === 'BUYER' && <BuyerView rfq={rfq} setRfq={handleRfqUpdate} quotes={quotes} lang={lang} />}
            </Layout>
          );
        })()}
      </div>
    </>
  );
}