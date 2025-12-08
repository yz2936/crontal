
import { MarketingNavbar } from '../components/MarketingNavbar';
import { MarketingFooter } from '../components/MarketingFooter';
import { Language } from '../types';
import { t } from '../utils/i18n';

interface AboutProps {
    onBack: () => void;
    onStart: () => void;
    onNavigate: (page: string) => void;
    lang: Language;
    setLang: (lang: Language) => void;
}

export default function About({ onStart, onNavigate, lang, setLang }: AboutProps) {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
             <MarketingNavbar onStart={onStart} onNavigate={onNavigate} lang={lang} setLang={setLang} />

            <div className="flex-1 max-w-4xl mx-auto px-6 py-20">
                <div className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider mb-6">{t(lang, 'about_vision_tag')}</div>
                <h1 className="text-4xl md:text-6xl font-bold mb-8 leading-tight">
                    {t(lang, 'about_title')} <br/>
                    <span className="text-brandOrange">{t(lang, 'about_title_accent')}</span>
                </h1>
                
                <div className="prose prose-lg text-slate-600">
                    <p className="text-xl leading-relaxed mb-10 text-slate-800">
                        {t(lang, 'about_intro')}
                    </p>
                    
                    <h3 className="text-2xl font-bold text-slate-900 mt-12 mb-4">{t(lang, 'about_trap_title')}</h3>
                    <p>
                        {t(lang, 'about_trap_desc')}
                    </p>

                    <h3 className="text-2xl font-bold text-slate-900 mt-12 mb-4">{t(lang, 'about_autopilot_title')}</h3>
                    <p>
                        {t(lang, 'about_autopilot_desc')}
                    </p>

                    <div className="bg-slate-50 p-8 rounded-2xl my-12 border border-slate-200">
                        <h4 className="font-bold text-lg mb-4 text-slate-900">{t(lang, 'about_principles_title')}</h4>
                        <ul className="space-y-4">
                            <li className="flex gap-3">
                                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
                                <span><strong>{t(lang, 'about_p1_title')}</strong> {t(lang, 'about_p1_desc')}</span>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
                                <span><strong>{t(lang, 'about_p2_title')}</strong> {t(lang, 'about_p2_desc')}</span>
                            </li>
                            <li className="flex gap-3">
                                <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
                                <span><strong>{t(lang, 'about_p3_title')}</strong> {t(lang, 'about_p3_desc')}</span>
                            </li>
                        </ul>
                    </div>

                    <button 
                        onClick={onStart}
                        className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg"
                    >
                        {t(lang, 'about_cta')}
                    </button>
                </div>
            </div>

            <MarketingFooter onNavigate={onNavigate} />
        </div>
    );
}
