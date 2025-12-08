
import { MarketingNavbar } from '../components/MarketingNavbar';
import { MarketingFooter } from '../components/MarketingFooter';
import { Language } from '../types';
import { t } from '../utils/i18n';

interface PrivacyPolicyProps {
    onBack: () => void;
    onNavigate: (page: string) => void;
    lang: Language;
    setLang: (lang: Language) => void;
}

export default function PrivacyPolicy({ onBack, onNavigate, lang, setLang }: PrivacyPolicyProps) {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
             <MarketingNavbar onStart={onBack} onNavigate={onNavigate} lang={lang} setLang={setLang} />

            <div className="flex-1 max-w-3xl mx-auto px-6 py-16">
                <h1 className="text-4xl font-bold mb-4">{t(lang, 'privacy_title')}</h1>
                <p className="text-slate-500 mb-8">{t(lang, 'privacy_update')}</p>

                <div className="prose prose-slate max-w-none">
                    <h3>1. Introduction</h3>
                    <p>
                        Crontal Inc. ("Crontal," "we," "our," or "us") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our AI-powered procurement automation platform (the "Service").
                    </p>

                    <h3>2. Information We Collect</h3>
                    <p>
                        We collect information that you provide directly to us when you create an account, upload documents (RFQs, engineering drawings, MTOs), or communicate with us.
                    </p>
                    <ul>
                        <li><strong>Account Information:</strong> Name, email address, company name, and password.</li>
                        <li><strong>Operational Data:</strong> RFQ content, line item descriptions, supplier lists, and pricing data.</li>
                        <li><strong>Uploaded Files:</strong> PDF drawings, Excel spreadsheets, and other technical documentation uploaded for processing.</li>
                    </ul>

                    <h3>3. How We Use Your Information</h3>
                    <p>We use the information we collect to:</p>
                    <ul>
                        <li>Provide, maintain, and improve our Service.</li>
                        <li>Process and parse technical documents using AI algorithms.</li>
                        <li>Facilitate communication between Buyers and Suppliers.</li>
                        <li>Monitor and analyze trends, usage, and activities in connection with our Service.</li>
                    </ul>

                    <h3>4. AI Processing and Data Privacy</h3>
                    <p>
                        Crontal utilizes Large Language Models (LLMs) to process text and images.
                    </p>
                    <ul>
                        <li><strong>Data Isolation:</strong> Your proprietary engineering data is processed in real-time. We do not use your proprietary data to train public AI models.</li>
                        <li><strong>Third-Party Processors:</strong> We utilize Google Cloud (Vertex AI / Gemini) for data processing. Google's data usage policies apply to the transmission of data for processing purposes.</li>
                    </ul>

                    <h3>5. Data Security</h3>
                    <p>
                        We implement industry-standard security measures designed to protect your information. However, no security system is impenetrable, and we cannot guarantee the security of our systems 100%. In the event of any information under our control being compromised, we will take reasonable steps to investigate the situation and notify those individuals whose information may have been compromised.
                    </p>

                    <h3>6. Contact Us</h3>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us at: <a href="#" className="text-brandOrange">privacy@crontal.com</a>
                    </p>
                </div>
            </div>

            <MarketingFooter onNavigate={onNavigate} />
        </div>
    );
}
