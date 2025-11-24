
import React from 'react';

interface TermsOfServiceProps {
    onBack: () => void;
}

export default function TermsOfService({ onBack }: TermsOfServiceProps) {
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
                    <span className="font-bold text-lg">Crontal <span className="text-slate-400 font-normal">| Terms of Service</span></span>
                </div>
                <button onClick={onBack} className="text-sm font-semibold text-slate-600 hover:text-accent">
                    Close
                </button>
            </nav>

            <div className="max-w-3xl mx-auto px-6 py-16">
                <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
                <p className="text-slate-500 mb-8">Last Updated: October 24, 2023</p>

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
        </div>
    );
}