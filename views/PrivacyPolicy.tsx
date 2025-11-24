
import React from 'react';

interface PrivacyPolicyProps {
    onBack: () => void;
}

export default function PrivacyPolicy({ onBack }: PrivacyPolicyProps) {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">
             {/* Nav */}
             <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur z-50">
                <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
                    <svg viewBox="0 0 40 40" fill="none" className="h-8 w-8 rounded-lg">
                        <rect width="40" height="40" rx="8" fill="#0B1121"/>
                        <path d="M12 20C12 15.5817 15.5817 12 20 12C22.25 12 24.28 12.93 25.76 14.43" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                        <path d="M12 20C12 24.4183 15.5817 28 20 28C22.25 28 24.28 27.07 25.76 25.57" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                        <path d="M22 20H32M32 20L28 16M32 20L28 24" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="font-bold text-lg">Crontal <span className="text-slate-400 font-normal">| Privacy Policy</span></span>
                </div>
                <button onClick={onBack} className="text-sm font-semibold text-slate-600 hover:text-accent">
                    Close
                </button>
            </nav>

            <div className="max-w-3xl mx-auto px-6 py-16">
                <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
                <p className="text-slate-500 mb-8">Last Updated: October 24, 2023</p>

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
        </div>
    );
}