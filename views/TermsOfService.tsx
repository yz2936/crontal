
import { MarketingNavbar } from '../components/MarketingNavbar';
import { MarketingFooter } from '../components/MarketingFooter';
import { Language } from '../types';
import { t } from '../utils/i18n';

interface TermsOfServiceProps {
    onBack: () => void;
    onNavigate: (page: string) => void;
    lang: Language;
    setLang: (lang: Language) => void;
}

export default function TermsOfService({ onBack, onNavigate, lang, setLang }: TermsOfServiceProps) {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
             <MarketingNavbar onStart={onBack} onNavigate={onNavigate} lang={lang} setLang={setLang} />

            <div className="flex-1 max-w-3xl mx-auto px-6 py-16">
                <h1 className="text-4xl font-bold mb-4">{t(lang, 'terms_title')}</h1>
                <p className="text-slate-500 mb-8">{t(lang, 'terms_update')}</p>

                <div className="prose prose-slate max-w-none">
                    <h3>1. Acceptance of Terms</h3>
                    <p>
                        By accessing or using the Crontal platform, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.
                    </p>

                    <h3>2. Description of Service</h3>
                    <p>
                        Crontal provides an AI-powered automation tool for the EPC (Engineering, Procurement, and Construction) industry, designed to assist in the parsing of Request for Quotation (RFQ) documents and the generation of structured data.
                    </p>

                    <div className="bg-orange-50 p-6 rounded-xl border border-orange-100 my-6">
                        <h4 className="text-orange-800 font-bold mt-0">CRITICAL ENGINEERING DISCLAIMER</h4>
                        <p className="text-sm text-orange-900 mb-0">
                            Crontal utilizes artificial intelligence to extract technical specifications. <strong>This Service is an assistive tool, not a substitute for professional engineering judgment.</strong> You acknowledge that AI outputs may contain errors, hallucinations, or inaccuracies regarding dimensions, material grades, or compliance standards. You agree to manually verify all outputs before making procurement decisions, issuing purchase orders, or relying on the data for safety-critical applications. Crontal accepts no liability for procurement errors resulting from unverified AI data.
                        </p>
                    </div>

                    <h3>3. User Responsibilities</h3>
                    <p>
                        You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree not to upload any data that is classified, restricted by ITAR (International Traffic in Arms Regulations), or violates any third-party intellectual property rights.
                    </p>

                    <h3>4. Intellectual Property</h3>
                    <p>
                        The Service and its original content, features, and functionality are and will remain the exclusive property of Crontal Inc. and its licensors. Your uploaded data (RFQs, Quotes, Drawings) remains your proprietary information.
                    </p>

                    <h3>5. Limitation of Liability</h3>
                    <p>
                        In no event shall Crontal Inc., nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
                    </p>

                    <h3>6. Governing Law</h3>
                    <p>
                        These Terms shall be governed and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
                    </p>
                </div>
            </div>

            <MarketingFooter onNavigate={onNavigate} />
        </div>
    );
}
