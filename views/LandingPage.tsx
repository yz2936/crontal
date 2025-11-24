
import React from 'react';
import { Language } from '../types';
import { AutoDemo } from '../components/AutoDemo';

interface LandingPageProps {
  onStart: () => void;
  onTechDemo: () => void;
  onAbout: () => void;
  onRoi: () => void;
  onSupplierPage: () => void;
  lang: Language;
}

export default function LandingPage({ onStart, onTechDemo, onAbout, onRoi, onSupplierPage, lang }: LandingPageProps) {
  return (
    <div className="bg-white text-slate-900 font-sans">
      
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-50">
        <div className="flex items-center gap-2">
          {/* CRONTAL LOGO SVG */}
          <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10 shadow-lg rounded-lg">
            <rect width="40" height="40" rx="8" fill="#0B1121"/>
            <path d="M12 20C12 15.5817 15.5817 12 20 12C22.25 12 24.28 12.93 25.76 14.43" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <path d="M12 20C12 24.4183 15.5817 28 20 28C22.25 28 24.28 27.07 25.76 25.57" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            <path d="M22 20H32M32 20L28 16M32 20L28 24" stroke="#F97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-xl font-bold tracking-tight text-slate-900">Crontal</span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-slate-600">
          <button onClick={onAbout} className="hover:text-brandOrange transition">About</button>
          <button onClick={onTechDemo} className="hover:text-brandOrange transition flex items-center gap-1">
             Technology
             <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded font-bold">NEW</span>
          </button>
          <button onClick={onSupplierPage} className="hover:text-brandOrange transition">For Suppliers</button>
          <button onClick={onRoi} className="hover:text-brandOrange transition">ROI Calculator</button>
        </div>
        <button 
          onClick={onStart}
          className="bg-accent text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-accent/90 transition shadow-lg transform hover:-translate-y-0.5"
        >
          Launch Demo
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 lg:pt-24 lg:pb-32 overflow-hidden">
        {/* Subtle Background Elements */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brandOrange/5 rounded-full blur-3xl -z-10 opacity-50 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-40 left-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl -z-10 opacity-50 -translate-x-1/2"></div>

        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider mb-8 animate-in fade-in slide-in-from-bottom-4">
            <span className="w-2 h-2 rounded-full bg-brandOrange animate-pulse"></span>
            The Future of Industrial Procurement
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto leading-tight">
            Industrial Sourcing, <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-slate-600">Autopilot Engaged.</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            From messy PDF drawings to a formal Purchase Order in minutes. Experience the first procurement platform that actually understands engineering physics.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 relative z-20">
            <button 
              onClick={onStart}
              className="px-8 py-4 bg-brandOrange text-white rounded-xl text-lg font-bold hover:bg-orange-600 transition shadow-xl shadow-orange-200 w-full sm:w-auto flex items-center justify-center gap-2 transform hover:scale-105 active:scale-100 duration-200"
            >
              Start Free Demo
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
            <button onClick={onTechDemo} className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl text-lg font-semibold hover:bg-slate-50 transition w-full sm:w-auto">
              See The Tech
            </button>
          </div>
          
          {/* Hero Visual Mockup - Added Spacing here */}
          <div className="relative mx-auto max-w-5xl z-10 mt-40">
            <AutoDemo />
          </div>
        </div>
      </section>

      {/* Trusted By / Stats */}
      <section className="py-16 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                    <p className="text-4xl font-bold text-accent mb-1">90%</p>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Reduction in Data Entry</p>
                </div>
                <div>
                    <p className="text-4xl font-bold text-accent mb-1">10x</p>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Faster Quote Analysis</p>
                </div>
                <div>
                    <p className="text-4xl font-bold text-accent mb-1">0%</p>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Translation Errors</p>
                </div>
                <div>
                    <p className="text-4xl font-bold text-accent mb-1">24/7</p>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Global Sourcing</p>
                </div>
            </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section id="value" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why EPC Firms Choose Crontal</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">Traditional procurement is slow, error-prone, and labor-intensive. We fixed it.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-12">
            {/* Value 1 */}
            <div className="group hover:bg-slate-50 p-6 rounded-2xl transition-all duration-300 border border-transparent hover:border-slate-100">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-accent mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Unleash Labor Efficiency</h3>
                <p className="text-slate-500 leading-relaxed">
                    Stop paying engineers to type data into Excel. Our AI parses PDF drawings and MTOs instantly, freeing your team to focus on negotiation and strategy.
                </p>
            </div>

            {/* Value 2 */}
            <div className="group hover:bg-slate-50 p-6 rounded-2xl transition-all duration-300 border border-transparent hover:border-slate-100">
                <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-brandOrange mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Expand Supplier Reach</h3>
                <p className="text-slate-500 leading-relaxed">
                    Break language barriers. Crontal translates your technical specs into the supplier's native language, opening up high-quality, lower-cost global markets.
                </p>
            </div>

            {/* Value 3 */}
            <div className="group hover:bg-slate-50 p-6 rounded-2xl transition-all duration-300 border border-transparent hover:border-slate-100">
                <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-6 group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">Engineering-Grade Accuracy</h3>
                <p className="text-slate-500 leading-relaxed">
                    Our "AI Audit" feature acts as a second pair of eyes, flagging missing schedules, grades, or testing requirements before you send the RFQ.
                </p>
            </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brandOrange/10 rounded-full blur-3xl"></div>
        <div className="max-w-3xl mx-auto px-6 relative z-10">
            <h2 className="text-4xl font-bold mb-6">Ready to upgrade your procurement?</h2>
            <p className="text-lg text-slate-300 mb-10">Join the forward-thinking EPC firms who are saving 20+ hours per week on sourcing.</p>
            <button 
              onClick={onStart}
              className="px-10 py-4 bg-brandOrange text-white rounded-xl text-lg font-bold hover:bg-orange-600 transition shadow-xl shadow-orange-900/20 hover:-translate-y-1 transform"
            >
              Get Started for Free
            </button>
            <p className="mt-4 text-sm text-slate-500">No credit card required. Instant access.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
                 <div className="h-6 w-6 rounded bg-accent flex items-center justify-center">
                    <span className="text-brandOrange font-bold text-xs">C</span>
                 </div>
                <span className="font-bold text-slate-900">Crontal</span>
            </div>
            <p className="text-slate-400 text-sm">© 2024 Crontal Inc. All rights reserved.</p>
            <div className="flex gap-6 text-slate-400">
                <a href="#" className="hover:text-slate-900">Privacy</a>
                <a href="#" className="hover:text-slate-900">Terms</a>
                <a href="#" className="hover:text-slate-900">Contact</a>
            </div>
        </div>
      </footer>

    </div>
  );
}
