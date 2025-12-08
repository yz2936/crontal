
import { MarketingNavbar } from '../components/MarketingNavbar';
import { MarketingFooter } from '../components/MarketingFooter';
import { Language } from '../types';
import { t } from '../utils/i18n';

interface QualityStandardsProps {
  onBack: () => void;
  onStartDemo: () => void;
  onNavigate: (page: string) => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

export default function QualityStandards({ onStartDemo, onNavigate, lang, setLang }: QualityStandardsProps) {
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans overflow-hidden relative flex flex-col">
      
      {/* Background Tech Elements */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(11,17,33,0.95),rgba(11,17,33,0.95)),url('https://grainy-gradients.vercel.app/noise.svg')] z-0 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

      <MarketingNavbar onStart={onStartDemo} onNavigate={onNavigate} darkMode={true} lang={lang} setLang={setLang} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 flex-1">
        
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
                {t(lang, 'quality_title')} <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">{t(lang, 'quality_title_accent')}</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
                {t(lang, 'quality_intro')}
            </p>
        </div>

        {/* Interactive MTR Scanner Demo */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left: The Messy Document */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
                <div className="relative bg-white rounded-xl overflow-hidden h-[500px] border border-slate-700">
                    {/* Simulated Document Header */}
                    <div className="bg-slate-100 p-4 border-b border-slate-300 flex justify-between items-center">
                        <div className="font-serif font-bold text-slate-900 text-lg">{t(lang, 'quality_cert_title')}</div>
                        <div className="font-mono text-xs text-slate-500">EN 10204 3.1</div>
                    </div>
                    {/* Simulated Document Body (Blurry Text look) */}
                    <div className="p-6 space-y-4 filter opacity-80">
                        <div className="flex justify-between font-mono text-xs text-slate-800 border-b border-slate-200 pb-2">
                            <span>HEAT NO: <strong>894452-A</strong></span>
                            <span>DATE: 2023-10-12</span>
                        </div>
                        
                        <div className="font-mono text-[10px] text-slate-600 space-y-2">
                             <div className="grid grid-cols-6 gap-2 border-b border-black/10 pb-1 font-bold">
                                <span>C</span><span>Mn</span><span>P</span><span>S</span><span>Si</span><span>Cr</span>
                             </div>
                             <div className="grid grid-cols-6 gap-2 border-b border-black/10 pb-1">
                                <span className="bg-yellow-200/50">0.21</span>
                                <span>0.95</span>
                                <span>0.012</span>
                                <span>0.005</span>
                                <span>0.28</span>
                                <span>0.15</span>
                             </div>
                        </div>

                        <div className="font-mono text-[10px] text-slate-600 pt-4">
                            <p className="font-bold">{t(lang, 'quality_mech_props')}</p>
                            <div className="flex gap-8 mt-1">
                                <div>Yield: <span className="bg-blue-200/50 font-bold">42,500 PSI</span></div>
                                <div>Tensile: 65,000 PSI</div>
                                <div>Elongation: 24%</div>
                            </div>
                        </div>

                         <div className="font-mono text-[10px] text-slate-600 pt-4">
                            <p className="font-bold">NOTES:</p>
                            <p>Material conforms to NACE MR0175 / ISO 15156 Hardness max 22 HRC.</p>
                            <p className="bg-red-200/50 inline-block mt-1">Product manufactured in South Korea.</p>
                        </div>
                        
                        {/* Signatures (Scribbles) */}
                        <div className="mt-12 flex justify-between">
                             <div className="w-32 h-10 border-b border-black relative">
                                <div className="absolute bottom-2 left-2 w-20 h-8 border-2 border-blue-900 rounded-full opacity-40 rotate-12"></div>
                             </div>
                             <div className="w-20 h-20 rounded-full border-4 border-slate-300 flex items-center justify-center opacity-30 rotate-[-12deg]">QA</div>
                        </div>
                    </div>

                    {/* Scanning Laser Animation */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] z-20 animate-scan"></div>
                </div>
            </div>

            {/* Right: The Extracted Data Intelligence */}
            <div className="space-y-6">
                
                {/* Extraction Card 1 */}
                <div className="bg-slate-800/50 backdrop-blur border border-slate-700 p-5 rounded-2xl animate-fade-up" style={{animationDelay: '0.2s'}}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-white">{t(lang, 'quality_chem_val')}</h3>
                            <p className="text-xs text-slate-400">{t(lang, 'quality_chem_desc')}</p>
                        </div>
                    </div>
                    <div className="flex gap-4 text-sm font-mono">
                         <div className="flex-1 bg-slate-900 p-2 rounded border border-slate-700">
                            <span className="text-slate-500 block text-[10px]">C Content</span>
                            <span className="text-emerald-400">0.21% (Pass)</span>
                         </div>
                         <div className="flex-1 bg-slate-900 p-2 rounded border border-slate-700">
                            <span className="text-slate-500 block text-[10px]">CE Value</span>
                            <span className="text-white">0.38</span>
                         </div>
                    </div>
                </div>

                {/* Extraction Card 2 */}
                <div className="bg-slate-800/50 backdrop-blur border border-slate-700 p-5 rounded-2xl animate-fade-up" style={{animationDelay: '0.4s'}}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-white">{t(lang, 'quality_origin')}</h3>
                            <p className="text-xs text-slate-400">{t(lang, 'quality_origin_desc')}</p>
                        </div>
                    </div>
                     <div className="bg-slate-900 p-3 rounded border border-slate-700 flex justify-between items-center">
                        <span className="text-sm text-slate-300">Origin: <strong>South Korea</strong></span>
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30">APPROVED LIST</span>
                     </div>
                </div>

                 {/* Extraction Card 3 */}
                 <div className="bg-slate-800/50 backdrop-blur border border-slate-700 p-5 rounded-2xl animate-fade-up" style={{animationDelay: '0.6s'}}>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-white">{t(lang, 'quality_trace')}</h3>
                            <p className="text-xs text-slate-400">{t(lang, 'quality_trace_desc')}</p>
                        </div>
                    </div>
                    <div className="text-xs font-mono text-slate-500">
                        <span className="text-purple-400">HEAT 894452-A</span> ➔ PO 65619-00 ➔ Line Item 3
                    </div>
                </div>

            </div>
        </div>

        {/* Standards Ticker Section */}
        <div className="mt-24 border-t border-slate-800 pt-16 text-center">
            <h2 className="text-2xl font-bold mb-8">{t(lang, 'quality_frameworks')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 {['ASTM / ASME', 'API (5L, 6D, 6A)', 'NACE MR0175 / 0103', 'EN 10204 (3.1/3.2)'].map((std, i) => (
                     <div key={i} className="p-4 rounded-xl border border-slate-800 bg-slate-800/30 hover:bg-slate-800 hover:border-blue-500/30 transition duration-300 cursor-default">
                         <span className="font-bold text-slate-300">{std}</span>
                     </div>
                 ))}
            </div>
        </div>
      </div>
      
      <MarketingFooter onNavigate={onNavigate} darkMode={true} />
    </div>
  );
}
