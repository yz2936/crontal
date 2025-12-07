
import React, { useState, useEffect, useRef } from 'react';
import { MarketingNavbar } from '../components/MarketingNavbar';
import { MarketingFooter } from '../components/MarketingFooter';
import { generateIndustryInsights, getTrendingTopics, getLatestMarketData, InsightResponse, TrendingTopic } from '../services/geminiService';
import { Language } from '../types';
import { t } from '../utils/i18n';

interface IndustryInsightsProps {
    onBack: () => void;
    onNavigate: (page: string) => void;
    lang: Language;
    setLang: (lang: Language) => void;
}

interface MarketDataPoint {
    name: string;
    symbol: string;
    unit: string;
    price: number;
    basePrice: number;
    trend: 'up' | 'down' | 'flat';
    history: number[];
}

type TimeRange = '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y';

// Initial Mock Data (Fallback / Placeholder)
const INITIAL_MARKET_DATA: Record<string, MarketDataPoint> = {
    // Stainless Inputs
    'NICKEL': { name: 'Nickel (LME)', symbol: 'Ni', unit: 'USD/T', price: 0, basePrice: 0, trend: 'flat', history: [] },
    'MOLY': { name: 'Molybdenum', symbol: 'Mo', unit: 'USD/lb', price: 0, basePrice: 0, trend: 'flat', history: [] },
    'CHROME': { name: 'Ferrochrome', symbol: 'Cr', unit: 'USD/lb', price: 0, basePrice: 0, trend: 'flat', history: [] },
    'STEEL': { name: 'HRC Steel (US)', symbol: 'Fe', unit: 'USD/ST', price: 0, basePrice: 0, trend: 'flat', history: [] },
    'OIL': { name: 'Brent Crude', symbol: 'Oil', unit: 'USD/bbl', price: 0, basePrice: 0, trend: 'flat', history: [] },
    // LME Base Metals
    'COPPER': { name: 'Copper (LME)', symbol: 'Cu', unit: 'USD/T', price: 0, basePrice: 0, trend: 'flat', history: [] },
    'ALUMINUM': { name: 'Aluminum (LME)', symbol: 'Al', unit: 'USD/T', price: 0, basePrice: 0, trend: 'flat', history: [] },
    'ZINC': { name: 'Zinc (LME)', symbol: 'Zn', unit: 'USD/T', price: 0, basePrice: 0, trend: 'flat', history: [] },
    'LEAD': { name: 'Lead (LME)', symbol: 'Pb', unit: 'USD/T', price: 0, basePrice: 0, trend: 'flat', history: [] },
    'TIN': { name: 'Tin (LME)', symbol: 'Sn', unit: 'USD/T', price: 0, basePrice: 0, trend: 'flat', history: [] },
};

type GradeOption = '304' | '304L' | '316' | '316L' | '321' | '2205' | '2507' | '904L' | 'Alloy 20';

export default function IndustryInsights({ onBack, onNavigate, lang, setLang }: IndustryInsightsProps) {
    // --- MARKET DATA STATE ---
    const [marketData, setMarketData] = useState<Record<string, MarketDataPoint>>(INITIAL_MARKET_DATA);
    const [activeCommodity, setActiveCommodity] = useState<string>('NICKEL');
    const [activeRange, setActiveRange] = useState<TimeRange>('1D');
    const [isFetchingPrices, setIsFetchingPrices] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<string>(t(lang, 'initializing'));
    const [firstLoadComplete, setFirstLoadComplete] = useState(false);
    const [isChartUpdating, setIsChartUpdating] = useState(false);
    const [chartCategory, setChartCategory] = useState<'Stainless' | 'LME'>('Stainless');
    const [isFallbackMode, setIsFallbackMode] = useState(false);
    
    // --- CHART INTERACTION STATE ---
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const chartRef = useRef<HTMLDivElement>(null);

    // --- CALCULATOR STATE ---
    const [selectedGrade, setSelectedGrade] = useState<GradeOption>('304L');
    const [simulationMode, setSimulationMode] = useState(false);
    const [simulatedNiChange, setSimulatedNiChange] = useState(0); // Percentage
    const [simulatedMoChange, setSimulatedMoChange] = useState(0); // Percentage
    const [simulatedCrChange, setSimulatedCrChange] = useState(0); // Percentage

    // --- FEED STATE ---
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('Regulatory');
    const [viewMode, setViewMode] = useState<'feed' | 'report'>('feed');
    const [headlines, setHeadlines] = useState<TrendingTopic[]>([]);
    const [insightData, setInsightData] = useState<InsightResponse | null>(null);
    const [isGeneratingHeadlines, setIsGeneratingHeadlines] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    // --- HELPER: GENERATE REALISTIC HISTORY CURVE ---
    const generateHistoryData = (currentPrice: number, range: TimeRange): number[] => {
        const points = 50;
        const history: number[] = [];
        let volatility = 0.005; // Default low volatility
        let trend = 0;

        switch (range) {
            case '1D': volatility = 0.002; trend = 0; break;
            case '5D': volatility = 0.01; trend = 0.005; break;
            case '1M': volatility = 0.02; trend = -0.01; break;
            case '6M': volatility = 0.05; trend = 0.03; break;
            case 'YTD': volatility = 0.08; trend = 0.02; break;
            case '1Y': volatility = 0.12; trend = 0.05; break;
        }

        // Generate backwards from current price
        let price = currentPrice;
        for (let i = 0; i < points; i++) {
            history.unshift(price);
            const change = (Math.random() - 0.5) * volatility * currentPrice;
            const trendFactor = (Math.random() - 0.5) * trend * currentPrice;
            price = price - change - trendFactor;
        }
        return history;
    };

    // --- FETCH REAL MARKET DATA ON MOUNT AND INTERVAL ---
    const activeRangeRef = useRef(activeRange);
    useEffect(() => {
        activeRangeRef.current = activeRange;
    }, [activeRange]);

    const fetchRealPrices = async () => {
        if (!firstLoadComplete) setIsChartUpdating(true);

        try {
            const data = await getLatestMarketData();
            if (data) {
                // Check if we are in fallback mode
                setIsFallbackMode(!!data.isFallback);

                setMarketData(prev => {
                    const update = (key: string, realPrice: number) => {
                        const existing = prev[key];
                        // Use the ref to get the current range for history generation
                        const newHistory = generateHistoryData(realPrice, activeRangeRef.current);

                        const startPrice = newHistory[0];
                        let trend: 'up' | 'down' | 'flat' = 'flat';
                        if (realPrice > startPrice) trend = 'up';
                        else if (realPrice < startPrice) trend = 'down';

                        return {
                            ...existing,
                            price: realPrice,
                            basePrice: realPrice, 
                            trend: trend,
                            history: newHistory
                        };
                    };

                    return {
                        'NICKEL': update('NICKEL', data.nickel),
                        'MOLY': update('MOLY', data.moly),
                        'CHROME': update('CHROME', data.chrome),
                        'STEEL': update('STEEL', data.steel),
                        'OIL': update('OIL', data.oil),
                        'COPPER': update('COPPER', data.copper),
                        'ALUMINUM': update('ALUMINUM', data.aluminum),
                        'ZINC': update('ZINC', data.zinc),
                        'LEAD': update('LEAD', data.lead),
                        'TIN': update('TIN', data.tin)
                    };
                });
                setLastUpdated(new Date().toLocaleTimeString());
                setFirstLoadComplete(true);
            }
        } catch (e) {
            console.error("Failed to update market data", e);
        } finally {
            setIsFetchingPrices(false);
            setIsChartUpdating(false);
        }
    };

    // 1. Effect for Initial Load + Interval Fetching
    useEffect(() => {
        fetchRealPrices();
        const interval = setInterval(fetchRealPrices, 300000); 
        return () => clearInterval(interval);
    }, []); 

    // 2. Effect for Range Change
    useEffect(() => {
        if (!firstLoadComplete) return;
        
        setIsChartUpdating(true);
        const timer = setTimeout(() => {
            setMarketData(prev => {
                const newData = { ...prev };
                Object.keys(newData).forEach(key => {
                    const item = newData[key];
                    const newHistory = generateHistoryData(item.price, activeRange);
                    const startPrice = newHistory[0];
                    let trend: 'up' | 'down' | 'flat' = 'flat';
                    if (item.price > startPrice) trend = 'up';
                    else if (item.price < startPrice) trend = 'down';

                    newData[key] = {
                        ...item,
                        history: newHistory,
                        trend: trend
                    };
                });
                return newData;
            });
            setIsChartUpdating(false);
        }, 500);
        return () => clearTimeout(timer);
    }, [activeRange]);

    // --- AI FETCHING LOGIC ---
    const categories = [
        { id: 'Regulatory', icon: '⚖️', title: t(lang, 'channel_reg') },
        { id: 'SupplyChain', icon: '🚢', title: t(lang, 'channel_supply') },
        { id: 'Innovation', icon: '🧪', title: t(lang, 'channel_inno') }
    ];

    const fetchHeadlines = async (catId: string) => {
        setIsGeneratingHeadlines(true);
        setHeadlines([]);
        setActiveCategory(catId);
        setViewMode('feed');
        try {
            const topics = await getTrendingTopics(catId);
            setHeadlines(topics);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingHeadlines(false);
        }
    };

    const handleGenerateReport = async (prompt: string) => {
        setIsGeneratingReport(true);
        setViewMode('report');
        try {
            const response = await generateIndustryInsights(activeCategory, prompt);
            setInsightData(response);
            setTimeout(() => {
                document.getElementById('report-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (e) {
            setInsightData({ content: "Failed to retrieve insights.", sources: [] });
        } finally {
            setIsGeneratingReport(false);
        }
    };

    const handleAnalyzeTrend = () => {
        const comm = marketData[activeCommodity];
        const prompt = `Analyze the current price trend of ${comm.name}. It is currently trading at ${comm.price} ${comm.unit}. What market factors are driving this?`;
        setActiveCategory('SupplyChain');
        handleGenerateReport(prompt);
    };

    useEffect(() => {
        fetchHeadlines(categories[0].id);
    }, []);

    // --- CALCULATOR LOGIC ---
    const getSurchargeData = () => {
        const currentPriceNi = marketData['NICKEL'].price || 16000; 
        const currentPriceMo = marketData['MOLY'].price || 40;
        const currentPriceCr = marketData['CHROME'].price || 1.5;
        const currentPriceCu = marketData['COPPER'].price || 9000;
        const currentPriceSteel = marketData['STEEL'].price || 800; 

        const normNi = currentPriceNi;
        const normMo = currentPriceMo * 2204.62;
        const normCr = currentPriceCr * 2204.62;
        const normCu = currentPriceCu;
        const normSteel = currentPriceSteel * 1.1023; 

        // Apply Simulation Factors
        const finalNi = normNi * (1 + (simulationMode ? simulatedNiChange / 100 : 0));
        const finalMo = normMo * (1 + (simulationMode ? simulatedMoChange / 100 : 0));
        const finalCr = normCr * (1 + (simulationMode ? simulatedCrChange / 100 : 0));
        const finalCu = normCu;
        const finalSteel = normSteel;

        let niPct = 0;
        let moPct = 0;
        let crPct = 0;
        let cuPct = 0;
        let fePct = 0;
        let fabBase = 600;

        switch (selectedGrade) {
            case '304':
            case '304L':
                niPct = 0.08; crPct = 0.18; fePct = 0.74;
                break;
            case '316':
            case '316L':
                niPct = 0.10; crPct = 0.16; moPct = 0.02; fePct = 0.72;
                fabBase = 700;
                break;
            case '321':
                niPct = 0.09; crPct = 0.18; fePct = 0.73;
                fabBase = 750;
                break;
            case '2205': // Duplex
                niPct = 0.055; crPct = 0.22; moPct = 0.03; fePct = 0.695;
                fabBase = 1100;
                break;
            case '2507': // Super Duplex
                niPct = 0.07; crPct = 0.25; moPct = 0.04; fePct = 0.64;
                fabBase = 1300;
                break;
            case '904L': // High Alloy
                niPct = 0.25; crPct = 0.20; moPct = 0.045; cuPct = 0.015; fePct = 0.49;
                fabBase = 1500;
                break;
            case 'Alloy 20':
                niPct = 0.35; crPct = 0.20; moPct = 0.025; cuPct = 0.035; fePct = 0.39;
                fabBase = 1600;
                break;
        }

        const costNi = finalNi * niPct;
        const costMo = finalMo * moPct;
        const costCr = finalCr * crPct;
        const costCu = finalCu * cuPct;
        const costFe = finalSteel * fePct;

        const total = fabBase + costNi + costMo + costCr + costCu + costFe;

        return { 
            costNi, costMo, costCr, costCu, costFe, fabBase, total 
        };
    };

    const surcharge = getSurchargeData();

    // --- CHART VARIABLES ---
    const comm = marketData[activeCommodity];
    const data = comm.history;
    const width = 800;
    const height = 240;
    const padding = 20;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    // Coordinate Calculation
    const getCoordinates = (index: number) => {
        const x = (index / (data.length - 1)) * (width - 2 * padding) + padding;
        const normalizedY = (data[index] - min) / range;
        const y = (height - padding) - (normalizedY * (height - 2 * padding));
        return { x, y };
    };

    const points = data.map((_, i) => {
        const { x, y } = getCoordinates(i);
        return `${x},${y}`;
    }).join(' ');

    const areaPath = `${points} L${width - padding},${height} L${padding},${height} Z`;

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!chartRef.current) return;
        const rect = chartRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        const relativeX = Math.max(0, Math.min(width, (x / rect.width) * width));
        const rawIndex = ((relativeX - padding) / (width - 2 * padding)) * (data.length - 1);
        const index = Math.round(Math.max(0, Math.min(data.length - 1, rawIndex)));
        
        setHoverIndex(index);
    };

    const handleMouseLeave = () => {
        setHoverIndex(null);
    };

    const activeIndex = hoverIndex !== null ? hoverIndex : data.length - 1;
    const activePoint = getCoordinates(activeIndex);
    const activeValue = data[activeIndex];

    // --- RENDER HELPERS ---
    const chartTabs = chartCategory === 'Stainless' 
        ? ['NICKEL', 'MOLY', 'CHROME', 'STEEL', 'OIL'] 
        : ['COPPER', 'ALUMINUM', 'ZINC', 'LEAD', 'TIN'];

    const lmeIndices = ['COPPER', 'ALUMINUM', 'ZINC', 'LEAD', 'TIN'];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
            <MarketingNavbar onStart={onBack} onNavigate={onNavigate} lang={lang} setLang={setLang} />

            {/* --- TOP SECTION: MARKET WATCH DASHBOARD --- */}
            <div className="bg-slate-900 text-white pb-12 pt-8">
                <div className="max-w-7xl mx-auto px-6">
                    
                    {/* Header & Tabs */}
                    <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                        <div>
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider mb-2 ${
                                !firstLoadComplete ? 'bg-slate-800 border-slate-700 text-blue-400' :
                                isFallbackMode ? 'bg-amber-900/30 border-amber-800 text-amber-400' : 
                                'bg-green-900/30 border-green-800 text-green-400'
                            }`}>
                                <span className={`w-2 h-2 rounded-full ${!firstLoadComplete ? 'bg-blue-400 animate-pulse' : isFallbackMode ? 'bg-amber-500' : 'bg-green-500'}`}></span>
                                {!firstLoadComplete ? t(lang, 'initializing') : isFallbackMode ? t(lang, 'cached_data') : t(lang, 'live_connection')}
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight">{t(lang, 'insights_title')}</h1>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-wide">
                                <span>{t(lang, 'last_updated')}: {lastUpdated}</span>
                                <button onClick={() => fetchRealPrices()} className="text-brandOrange hover:text-white" title="Refresh Now">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                </button>
                            </div>
                            
                            {/* Category Switcher */}
                            <div className="flex gap-2 mb-2">
                                <button 
                                    onClick={() => { setChartCategory('Stainless'); setActiveCommodity('NICKEL'); }}
                                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded transition-colors ${chartCategory === 'Stainless' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {t(lang, 'stainless_inputs')}
                                </button>
                                <button 
                                    onClick={() => { setChartCategory('LME'); setActiveCommodity('COPPER'); }}
                                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded transition-colors ${chartCategory === 'LME' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {t(lang, 'lme_metals')}
                                </button>
                            </div>

                            <div className="flex gap-2 bg-slate-800 p-1 rounded-xl">
                                {chartTabs.map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => setActiveCommodity(key)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeCommodity === key ? 'bg-brandOrange text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {marketData[key].symbol}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">
                        
                        {/* CHART CARD (2/3 Width) */}
                        <div className="lg:col-span-2 bg-slate-800/50 rounded-2xl border border-slate-700 p-6 md:p-8 relative overflow-hidden shadow-2xl flex flex-col">
                            <div className="relative z-10 flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">{marketData[activeCommodity].name}</h2>
                                    <div className="flex items-baseline gap-3">
                                        <span className={`text-5xl font-mono font-bold tracking-tighter text-white transition-opacity duration-500 ${!firstLoadComplete ? 'opacity-50' : 'opacity-100'}`}>
                                            {!firstLoadComplete ? "----.--" : marketData[activeCommodity].price.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </span>
                                        <span className="text-slate-400 text-lg">{marketData[activeCommodity].unit}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-4">
                                     {/* Time Range Selector */}
                                    <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                                        {(['1D', '5D', '1M', '6M', 'YTD', '1Y'] as TimeRange[]).map(range => (
                                            <button
                                                key={range}
                                                onClick={() => {
                                                    setActiveRange(range);
                                                    // Note: We do NOT trigger fetchRealPrices() here anymore to save API calls
                                                }}
                                                className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${activeRange === range ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                                            >
                                                {range}
                                            </button>
                                        ))}
                                    </div>

                                    <div className={`text-right ${!firstLoadComplete ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500 ${marketData[activeCommodity].trend === 'up' ? 'text-green-400' : marketData[activeCommodity].trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
                                        <div className="text-lg font-bold flex items-center gap-1 justify-end">
                                            {marketData[activeCommodity].trend === 'up' ? '▲' : marketData[activeCommodity].trend === 'down' ? '▼' : '—'}
                                            {marketData[activeCommodity].history.length > 0 ? Math.abs((marketData[activeCommodity].price - marketData[activeCommodity].history[0]) / marketData[activeCommodity].history[0] * 100).toFixed(2) : '0.00'}%
                                        </div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wide">{t(lang, 'period_change')}</div>
                                    </div>
                                </div>
                            </div>

                            {/* CHART AREA */}
                            <div className="flex-1 min-h-[240px] relative z-10">
                                <div 
                                    ref={chartRef}
                                    className="w-full h-full relative cursor-crosshair touch-none"
                                    onMouseMove={handleMouseMove}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    {/* SVG Chart */}
                                    <div className={`w-full h-full transition-all duration-500 ${(!firstLoadComplete || isChartUpdating) ? 'blur-md opacity-30' : 'blur-0 opacity-100'}`}>
                                        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                            <defs>
                                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#F97316" stopOpacity="0.3" />
                                                    <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
                                                </linearGradient>
                                            </defs>

                                            {/* Background Grid Lines */}
                                            <g opacity="0.1">
                                                <line x1="0" y1={height * 0.25} x2={width} y2={height * 0.25} stroke="white" strokeWidth="1" strokeDasharray="4 4"/>
                                                <line x1="0" y1={height * 0.5} x2={width} y2={height * 0.5} stroke="white" strokeWidth="1" strokeDasharray="4 4"/>
                                                <line x1="0" y1={height * 0.75} x2={width} y2={height * 0.75} stroke="white" strokeWidth="1" strokeDasharray="4 4"/>
                                            </g>

                                            {data.length > 0 && (
                                                <>
                                                    <path d={`M${padding},${height} ${areaPath}`} fill="url(#chartGradient)" />
                                                    <polyline points={points} fill="none" stroke="#F97316" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                                                    
                                                    {hoverIndex !== null && (
                                                        <>
                                                            <line x1={activePoint.x} y1={0} x2={activePoint.x} y2={height} stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="4 4" />
                                                            <line x1={0} y1={activePoint.y} x2={width} y2={activePoint.y} stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="4 4" />
                                                        </>
                                                    )}
                                                    <circle cx={activePoint.x} cy={activePoint.y} r="5" fill="#F97316" stroke="white" strokeWidth="2" />
                                                </>
                                            )}
                                        </svg>
                                    </div>
                                    
                                    {/* Floating Tooltip */}
                                    {firstLoadComplete && !isChartUpdating && data.length > 0 && (
                                        <div 
                                            className="absolute pointer-events-none z-20 bg-slate-900 border border-slate-700 shadow-xl rounded-lg px-3 py-2 flex flex-col items-center min-w-[100px]"
                                            style={{ 
                                                left: `${(activePoint.x / width) * 100}%`, 
                                                top: `${(activePoint.y / height) * 100}%`,
                                                transform: `translate(-50%, -120%)`
                                            }}
                                        >
                                            <div className="text-xs text-slate-400 font-bold mb-0.5">
                                                {hoverIndex !== null ? `Data Point ${activeIndex + 1}` : t(lang, 'current_price')}
                                            </div>
                                            <div className="text-sm font-bold text-white font-mono">
                                                {activeValue?.toLocaleString(undefined, {minimumFractionDigits: 2})} {comm.unit}
                                            </div>
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45"></div>
                                        </div>
                                    )}

                                    {/* Loading Overlay */}
                                    {(!firstLoadComplete || isChartUpdating) && (
                                        <div className="absolute inset-0 flex items-center justify-center z-30">
                                            <div className="bg-slate-900/95 border border-slate-700 px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in zoom-in-95 duration-200">
                                                <span className="w-5 h-5 border-2 border-brandOrange/30 border-t-brandOrange rounded-full animate-spin"></span>
                                                <span className="text-xs font-bold text-white tracking-wide uppercase">
                                                    {firstLoadComplete ? t(lang, 'updating_chart') : t(lang, 'verifying_data')}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                            
                            <div className="absolute bottom-6 right-6 z-20 pointer-events-none">
                                <div 
                                    className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-bold shadow-lg pointer-events-auto cursor-pointer hover:bg-slate-200 transition"
                                    onClick={handleAnalyzeTrend}
                                >
                                    <svg className="w-4 h-4 text-brandOrange" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    {t(lang, 'explain_trend')}
                                </div>
                            </div>
                        </div>

                        {/* SURCHARGE CALCULATOR (1/3 Width) */}
                        <div className="lg:col-span-1 bg-slate-800/50 rounded-2xl border border-slate-700 p-6 flex flex-col shadow-xl relative overflow-hidden">
                             {/* Background Glow */}
                             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>

                             <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-white">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                    </div>
                                    <h3 className="font-bold text-white text-sm uppercase tracking-wide">{t(lang, 'surcharge_estimator')}</h3>
                                </div>

                                {/* Grade Selector */}
                                <div className="mb-6">
                                    <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">{t(lang, 'select_grade')}</label>
                                    <div className="relative">
                                        <select 
                                            value={selectedGrade}
                                            onChange={(e) => setSelectedGrade(e.target.value as GradeOption)}
                                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-sm text-white focus:ring-2 focus:ring-brandOrange/50 focus:border-brandOrange outline-none appearance-none font-bold"
                                        >
                                            <optgroup label="Standard Stainless">
                                                <option value="304">304 Stainless</option>
                                                <option value="304L">304L Stainless</option>
                                                <option value="316">316 Stainless</option>
                                                <option value="316L">316L Stainless</option>
                                                <option value="321">321 Stainless</option>
                                            </optgroup>
                                            <optgroup label="Duplex / Super Duplex">
                                                <option value="2205">2205 Duplex</option>
                                                <option value="2507">2507 Super Duplex</option>
                                            </optgroup>
                                            <optgroup label="High Alloy">
                                                <option value="904L">904L (Uranus B6)</option>
                                                <option value="Alloy 20">Alloy 20 (Carpenter 20)</option>
                                            </optgroup>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic Price Display */}
                                <div className={`bg-slate-900 rounded-xl p-4 border border-slate-800 mb-6 transition-all duration-500 ${!firstLoadComplete ? 'opacity-50 blur-sm' : 'opacity-100 blur-0'}`}>
                                    <div className="text-xs text-slate-500 mb-1">{t(lang, 'est_price')}</div>
                                    <div className="text-3xl font-mono font-bold text-white mb-2">
                                        ${surcharge.total.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-sm text-slate-500 font-sans">/ Ton</span>
                                    </div>
                                    
                                    {/* Cost Drivers Visualization */}
                                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-800 w-full mb-2">
                                        <div style={{ width: `${(surcharge.fabBase / surcharge.total) * 100}%` }} className="bg-slate-600" title="Fab Base"></div>
                                        <div style={{ width: `${(surcharge.costFe / surcharge.total) * 100}%` }} className="bg-slate-500" title="Steel Base"></div>
                                        <div style={{ width: `${(surcharge.costCr / surcharge.total) * 100}%` }} className="bg-green-500" title="Chrome"></div>
                                        <div style={{ width: `${(surcharge.costNi / surcharge.total) * 100}%` }} className="bg-blue-500" title="Nickel"></div>
                                        {surcharge.costMo > 0 && <div style={{ width: `${(surcharge.costMo / surcharge.total) * 100}%` }} className="bg-purple-500" title="Moly"></div>}
                                        {surcharge.costCu > 0 && <div style={{ width: `${(surcharge.costCu / surcharge.total) * 100}%` }} className="bg-orange-500" title="Copper"></div>}
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 font-mono">
                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>Fab</span>
                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>Fe</span>
                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>Cr</span>
                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Ni</span>
                                        {surcharge.costMo > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>Mo</span>}
                                        {surcharge.costCu > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>Cu</span>}
                                    </div>
                                </div>

                                {/* Scenario Simulator Toggle */}
                                <div className="border-t border-slate-700 pt-4">
                                    <button 
                                        onClick={() => setSimulationMode(!simulationMode)}
                                        disabled={!firstLoadComplete}
                                        className="flex items-center justify-between w-full text-xs font-bold text-slate-400 hover:text-white mb-4 disabled:opacity-50"
                                    >
                                        <span>{t(lang, 'scenario_sim')}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${simulationMode ? 'bg-green-500/20 text-green-400' : 'bg-slate-700'}`}>{simulationMode ? 'ON' : 'OFF'}</span>
                                    </button>

                                    {simulationMode && (
                                        <div className="space-y-3 animate-in slide-in-from-top-2">
                                            {/* Nickel Slider */}
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-blue-400">{t(lang, 'ni_price')}</span>
                                                    <span className="text-white font-mono">{simulatedNiChange > 0 ? '+' : ''}{simulatedNiChange}%</span>
                                                </div>
                                                <input 
                                                    type="range" min="-50" max="50" step="5"
                                                    value={simulatedNiChange}
                                                    onChange={(e) => setSimulatedNiChange(Number(e.target.value))}
                                                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                />
                                            </div>

                                            {/* Chrome Slider */}
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-green-400">{t(lang, 'cr_price')}</span>
                                                    <span className="text-white font-mono">{simulatedCrChange > 0 ? '+' : ''}{simulatedCrChange}%</span>
                                                </div>
                                                <input 
                                                    type="range" min="-50" max="50" step="5"
                                                    value={simulatedCrChange}
                                                    onChange={(e) => setSimulatedCrChange(Number(e.target.value))}
                                                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                                                />
                                            </div>

                                            {/* Moly Slider (Conditional) */}
                                            {(surcharge.costMo > 0) && (
                                                <div>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-purple-400">{t(lang, 'mo_price')}</span>
                                                        <span className="text-white font-mono">{simulatedMoChange > 0 ? '+' : ''}{simulatedMoChange}%</span>
                                                    </div>
                                                    <input 
                                                        type="range" min="-50" max="50" step="5"
                                                        value={simulatedMoChange}
                                                        onChange={(e) => setSimulatedMoChange(Number(e.target.value))}
                                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                                    />
                                                </div>
                                            )}
                                            
                                            <div className="text-[10px] text-slate-500 italic text-center mt-2">
                                                {t(lang, 'interactive_impact')}
                                            </div>
                                        </div>
                                    )}
                                </div>

                             </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* --- NEW SECTION: GLOBAL INDICES (LME SNAPSHOT) --- */}
            <div className="bg-slate-900 border-t border-slate-800 py-6">
                <div className="max-w-7xl mx-auto px-6">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{t(lang, 'lme_metals')}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {lmeIndices.map(key => {
                            const data = marketData[key];
                            const trendColor = data.trend === 'up' ? 'text-green-400' : data.trend === 'down' ? 'text-red-400' : 'text-slate-400';
                            return (
                                <button 
                                    key={key}
                                    onClick={() => { setChartCategory('LME'); setActiveCommodity(key); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                                    className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl p-4 transition-all text-left"
                                >
                                    <div className="text-xs text-slate-400 font-bold mb-1">{data.name.split(' (')[0]}</div>
                                    <div className="text-lg font-mono font-bold text-white mb-1">
                                        {!firstLoadComplete ? '----' : data.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>
                                    <div className={`text-[10px] font-bold ${trendColor}`}>
                                        {data.trend === 'up' ? '▲' : data.trend === 'down' ? '▼' : '—'} 
                                        {data.history.length > 0 ? Math.abs((data.price - data.history[0]) / data.history[0] * 100).toFixed(1) : '0.0'}%
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* --- BOTTOM SECTION: INTELLIGENCE FEED --- */}
            <div id="report-section" className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full flex flex-col">
                
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">{t(lang, 'intel_channels')}</h2>
                        <p className="text-sm text-slate-500">{t(lang, 'intel_desc')}</p>
                    </div>
                    {/* Search Bar */}
                    <div className="relative w-full max-w-xs hidden md:block">
                        <input 
                            type="text" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerateReport(query)}
                            placeholder={t(lang, 'custom_topic')} 
                            className="w-full pl-3 pr-10 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-brandOrange outline-none"
                        />
                         <button 
                            onClick={() => handleGenerateReport(query)}
                            className="absolute right-2 top-2 text-slate-400 hover:text-brandOrange"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-12 gap-8 flex-1">
                    
                    {/* LEFT SIDEBAR */}
                    <div className="lg:col-span-3 space-y-3">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => fetchHeadlines(cat.id)}
                                disabled={isGeneratingHeadlines}
                                className={`w-full text-left px-4 py-4 rounded-xl transition-all duration-200 flex items-center gap-3 border ${activeCategory === cat.id ? 'bg-white shadow-lg shadow-slate-200/50 border-slate-100 ring-1 ring-slate-100' : 'bg-transparent border-transparent hover:bg-white hover:border-slate-100'}`}
                            >
                                <span className="text-xl">{cat.icon}</span>
                                <div className="flex-1">
                                    <div className={`text-sm font-bold ${activeCategory === cat.id ? 'text-slate-900' : 'text-slate-500'}`}>{cat.title}</div>
                                </div>
                                {activeCategory === cat.id && <svg className="w-4 h-4 text-brandOrange" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                            </button>
                        ))}
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div className="lg:col-span-9 flex flex-col min-h-[500px]">
                        
                        {/* FEED VIEW */}
                        {viewMode === 'feed' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {isGeneratingHeadlines ? (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {[1,2,3,4].map(i => (
                                            <div key={i} className="h-32 bg-white rounded-xl border border-slate-100 shadow-sm p-6 animate-pulse">
                                                <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
                                                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {headlines.map((topic, idx) => (
                                            <div 
                                                key={idx}
                                                onClick={() => handleGenerateReport(topic.title)}
                                                className="bg-white rounded-xl border border-slate-200 p-6 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
                                            >
                                                <div className={`absolute top-0 left-0 w-1 h-full ${topic.impact === 'High' ? 'bg-red-500' : topic.impact === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                                
                                                <div className="flex justify-between items-start mb-3 pl-3">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                                        topic.impact === 'High' ? 'bg-red-50 text-red-600' :
                                                        topic.impact === 'Medium' ? 'bg-amber-50 text-amber-600' :
                                                        'bg-blue-50 text-blue-600'
                                                    }`}>
                                                        {topic.impact} Priority
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900 mb-2 pl-3 group-hover:text-brandOrange transition-colors">
                                                    {topic.title}
                                                </h3>
                                                <p className="text-sm text-slate-500 pl-3 line-clamp-2">
                                                    {topic.subtitle}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* REPORT VIEW */}
                        {viewMode === 'report' && (
                             <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col h-full relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                                {/* Header */}
                                <div className="h-14 border-b border-slate-100 bg-slate-50 flex items-center px-6 justify-between shrink-0">
                                    <button onClick={() => setViewMode('feed')} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition">
                                         ← {t(lang, 'back_to_feed')}
                                    </button>
                                    <div className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono">{t(lang, 'generated_by')}</div>
                                </div>
    
                                {/* Content */}
                                <div className="flex-1 p-8 md:p-10 overflow-y-auto bg-white min-h-[400px]">
                                    {isGeneratingReport ? (
                                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                                            <div className="w-12 h-12 border-4 border-brandOrange/30 border-t-brandOrange rounded-full animate-spin"></div>
                                            <p className="text-sm font-bold text-slate-500 animate-pulse">{t(lang, 'analyzing_market')}</p>
                                        </div>
                                    ) : (
                                        <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600">
                                            {insightData?.content && insightData.content.split('\n').map((line, i) => {
                                                if (line.startsWith('## ')) return <h3 key={i} className="text-lg uppercase tracking-wide border-b border-slate-100 pb-2 mt-8 mb-4 text-brandOrange">{line.replace('## ', '')}</h3>;
                                                if (line.startsWith('- **')) {
                                                    const parts = line.split('**');
                                                    return <li key={i} className="ml-4 mb-2 list-disc"><strong className="text-slate-900 font-bold">{parts[1]}</strong>{parts[2]}</li>;
                                                }
                                                if (line.startsWith('- ')) return <li key={i} className="ml-4 mb-2 list-disc">{line.replace('- ', '')}</li>;
                                                if (line.trim() === '') return <br key={i} />;
                                                return <p key={i} className="mb-3 leading-relaxed text-sm md:text-base">{line}</p>;
                                            })}
                                        </div>
                                    )}
                                </div>
    
                                {/* Footer Sources */}
                                {insightData?.sources && insightData.sources.length > 0 && !isGeneratingReport && (
                                    <div className="bg-slate-50 border-t border-slate-200 p-6">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t(lang, 'sources')}</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {insightData.sources.map((source, idx) => (
                                                <a key={idx} href={source.uri} target="_blank" rel="noreferrer" className="bg-white border border-slate-200 rounded px-2 py-1 text-[10px] text-slate-600 hover:text-brandOrange hover:border-brandOrange transition truncate max-w-[200px]">
                                                    {idx + 1}. {source.title}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <MarketingFooter onNavigate={onNavigate} />
        </div>
    );
}
