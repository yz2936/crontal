

import React, { useState, useEffect, useRef } from 'react';
import { MarketingNavbar } from '../components/MarketingNavbar';
import { MarketingFooter } from '../components/MarketingFooter';
import { generateIndustryInsights, getTrendingTopics, getLatestMarketData, InsightResponse, TrendingTopic } from '../services/geminiService';

interface IndustryInsightsProps {
    onBack: () => void;
    onNavigate: (page: string) => void;
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

// Initial Mock Data (Fallback)
const INITIAL_MARKET_DATA: Record<string, MarketDataPoint> = {
    'NICKEL': {
        name: 'Nickel (LME)',
        symbol: 'Ni',
        unit: 'USD/T',
        price: 16850,
        basePrice: 16850,
        trend: 'up',
        history: [16200, 16350, 16100, 16400, 16600, 16500, 16800, 16950, 16850, 17100, 17250, 17100, 16900, 16850]
    },
    'MOLY': {
        name: 'Molybdenum',
        symbol: 'Mo',
        unit: 'USD/lb',
        price: 42.50,
        basePrice: 42.50,
        trend: 'down',
        history: [48.00, 47.50, 47.20, 46.80, 46.00, 45.50, 45.00, 44.20, 43.80, 43.00, 42.80, 42.50, 42.20, 42.50]
    },
    'STEEL': {
        name: 'HRC Steel (US)',
        symbol: 'Fe',
        unit: 'USD/ST',
        price: 780,
        basePrice: 780,
        trend: 'flat',
        history: [750, 755, 760, 758, 765, 770, 775, 775, 780, 782, 780, 778, 780, 780]
    },
    'OIL': {
        name: 'Brent Crude',
        symbol: 'Oil',
        unit: 'USD/bbl',
        price: 82.40,
        basePrice: 82.40,
        trend: 'up',
        history: [78.00, 79.20, 80.10, 79.50, 80.50, 81.20, 81.00, 81.50, 82.00, 82.20, 82.40, 83.10, 82.80, 82.40]
    }
};

export default function IndustryInsights({ onBack, onNavigate }: IndustryInsightsProps) {
    // --- MARKET DATA STATE ---
    const [marketData, setMarketData] = useState<Record<string, MarketDataPoint>>(INITIAL_MARKET_DATA);
    const [activeCommodity, setActiveCommodity] = useState<string>('NICKEL');
    const [isFetchingPrices, setIsFetchingPrices] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<string>('Simulated');
    
    // Track if it's the first real data load to initialize history correctly
    const isFirstLoad = useRef(true);

    // --- CALCULATOR STATE ---
    const [selectedGrade, setSelectedGrade] = useState<'304L' | '316L' | '2205'>('304L');
    const [simulationMode, setSimulationMode] = useState(false);
    const [simulatedNiChange, setSimulatedNiChange] = useState(0); // Percentage
    const [simulatedMoChange, setSimulatedMoChange] = useState(0); // Percentage

    // --- FEED STATE ---
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('Regulatory');
    const [viewMode, setViewMode] = useState<'feed' | 'report'>('feed');
    const [headlines, setHeadlines] = useState<TrendingTopic[]>([]);
    const [insightData, setInsightData] = useState<InsightResponse | null>(null);
    const [isGeneratingHeadlines, setIsGeneratingHeadlines] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    // --- FETCH REAL MARKET DATA ON MOUNT AND INTERVAL ---
    useEffect(() => {
        const fetchRealPrices = async () => {
            const data = await getLatestMarketData();
            if (data) {
                setMarketData(prev => {
                    const update = (key: string, realPrice: number) => {
                        const existing = prev[key];
                        let newHistory;

                        if (isFirstLoad.current) {
                            // Generate synthetic history based on real price for smooth initial chart
                            newHistory = [realPrice * 0.97, realPrice * 0.99, realPrice * 0.98, realPrice * 0.995, realPrice];
                        } else {
                            // Append new real data point
                            newHistory = [...existing.history, realPrice];
                            if (newHistory.length > 30) newHistory = newHistory.slice(-30);
                        }

                        return {
                            ...existing,
                            price: realPrice,
                            basePrice: realPrice,
                            history: newHistory
                        };
                    };

                    return {
                        'NICKEL': update('NICKEL', data.nickel),
                        'MOLY': update('MOLY', data.moly),
                        'STEEL': update('STEEL', data.steel),
                        'OIL': update('OIL', data.oil)
                    };
                });
                setLastUpdated(new Date().toLocaleTimeString());
                isFirstLoad.current = false;
            }
            setIsFetchingPrices(false);
        };

        // Initial fetch
        fetchRealPrices();

        // Refresh every 60 seconds
        const interval = setInterval(fetchRealPrices, 60000);

        return () => clearInterval(interval);
    }, []);

    // --- LIVE SIMULATION EFFECT ---
    useEffect(() => {
        const interval = setInterval(() => {
            setMarketData(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(key => {
                    const item = next[key];
                    const volatility = item.basePrice * 0.002; // 0.2% fluctuation
                    const change = (Math.random() - 0.5) * volatility;
                    const newPrice = Number((item.price + change).toFixed(2));
                    
                    // Update trend
                    let trend: 'up' | 'down' | 'flat' = 'flat';
                    if (newPrice > item.price) trend = 'up';
                    if (newPrice < item.price) trend = 'down';

                    // Update history occasionally (simplification: push new price, shift old)
                    let newHistory = [...item.history];
                    if (Math.random() > 0.8) {
                        newHistory.push(newPrice);
                        if (newHistory.length > 30) newHistory.shift();
                    }

                    next[key] = {
                        ...item,
                        price: newPrice,
                        trend,
                        history: newHistory
                    };
                });
                return next;
            });
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    // --- AI FETCHING LOGIC ---
    const categories = [
        { id: 'Regulatory', icon: '⚖️', title: "Regulatory" },
        { id: 'SupplyChain', icon: '🚢', title: "Supply Chain" },
        { id: 'Innovation', icon: '🧪', title: "Innovation" }
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
    // Surcharge Formula Approximation
    // 304L: ~8% Nickel + Base
    // 316L: ~10% Nickel + ~2% Moly + Base
    // 2205: ~5% Nickel + ~3% Moly + Base
    // Moly conversion: $/lb * 2204.62 = $/T
    
    const getSurchargeData = () => {
        const niPrice = marketData['NICKEL'].price * (1 + (simulationMode ? simulatedNiChange / 100 : 0));
        const moPriceLb = marketData['MOLY'].price * (1 + (simulationMode ? simulatedMoChange / 100 : 0));
        const moPriceT = moPriceLb * 2204.62;

        let niContent = 0;
        let moContent = 0;
        let baseCost = 800; // Fixed fabrication/iron base cost assumption for demo

        if (selectedGrade === '304L') {
            niContent = 0.08;
            moContent = 0;
        } else if (selectedGrade === '316L') {
            niContent = 0.10;
            moContent = 0.02;
        } else if (selectedGrade === '2205') {
            niContent = 0.055;
            moContent = 0.03;
            baseCost = 1200; // Duplex harder to make
        }

        const niCost = niPrice * niContent;
        const moCost = moPriceT * moContent;
        const total = baseCost + niCost + moCost;

        return { niCost, moCost, baseCost, total };
    };

    const surcharge = getSurchargeData();

    // --- CHART RENDERER ---
    const renderSparkline = () => {
        const comm = marketData[activeCommodity];
        const data = [...comm.history];
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const width = 800;
        const height = 200;
        
        const points = data.map((val, i) => {
            const x = (i / (data.length - 1)) * width;
            const normalizedY = (val - min) / range;
            const y = height - (normalizedY * height * 0.8) - (height * 0.1);
            return `${x},${y}`;
        }).join(' ');

        return (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F97316" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={`M0,${height} ${points} L${width},${height} Z`} fill="url(#chartGradient)" />
                <polyline points={points} fill="none" stroke="#F97316" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                <circle cx={width} cy={points.split(' ').pop()?.split(',')[1]} r="6" fill="#F97316" className="animate-pulse" />
            </svg>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
            <MarketingNavbar onStart={onBack} onNavigate={onNavigate} />

            {/* --- TOP SECTION: MARKET WATCH DASHBOARD --- */}
            <div className="bg-slate-900 text-white pb-12 pt-8">
                <div className="max-w-7xl mx-auto px-6">
                    
                    {/* Header & Tabs */}
                    <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                                <span className={`w-2 h-2 rounded-full ${isFetchingPrices ? 'bg-amber-400' : 'bg-blue-400 animate-pulse'}`}></span>
                                {isFetchingPrices ? 'Fetching Live Data...' : 'Live Indices'}
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight">Raw Material Markets</h1>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Last Updated: {lastUpdated}</div>
                            <div className="flex gap-2 bg-slate-800 p-1 rounded-xl">
                                {Object.keys(marketData).map((key) => (
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
                                        <span className="text-5xl font-mono font-bold tracking-tighter text-white">
                                            {marketData[activeCommodity].price.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                        </span>
                                        <span className="text-slate-400 text-lg">{marketData[activeCommodity].unit}</span>
                                    </div>
                                </div>
                                <div className={`text-right ${marketData[activeCommodity].trend === 'up' ? 'text-green-400' : marketData[activeCommodity].trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
                                    <div className="text-lg font-bold flex items-center gap-1 justify-end">
                                        {marketData[activeCommodity].trend === 'up' ? '▲' : marketData[activeCommodity].trend === 'down' ? '▼' : '—'}
                                        {Math.abs((marketData[activeCommodity].price - marketData[activeCommodity].basePrice) / marketData[activeCommodity].basePrice * 100).toFixed(2)}%
                                    </div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wide">Intraday Change</div>
                                </div>
                            </div>

                            <div className="flex-1 min-h-[200px] relative z-10">
                                {renderSparkline()}
                            </div>

                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                            
                            <div className="absolute bottom-6 right-6 z-20">
                                <button 
                                    onClick={handleAnalyzeTrend}
                                    className="flex items-center gap-2 bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition shadow-lg"
                                >
                                    <svg className="w-4 h-4 text-brandOrange" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    Explain This Trend with AI
                                </button>
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
                                    <h3 className="font-bold text-white text-sm uppercase tracking-wide">Surcharge Estimator</h3>
                                </div>

                                {/* Grade Selector */}
                                <div className="mb-6">
                                    <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">Select Product Grade</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['304L', '316L', '2205'].map(g => (
                                            <button
                                                key={g}
                                                onClick={() => setSelectedGrade(g as any)}
                                                className={`py-2 rounded border text-xs font-bold transition ${selectedGrade === g ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Dynamic Price Display */}
                                <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 mb-6">
                                    <div className="text-xs text-slate-500 mb-1">Est. Finished Goods Price</div>
                                    <div className="text-3xl font-mono font-bold text-white mb-2">
                                        ${surcharge.total.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-sm text-slate-500 font-sans">/ Ton</span>
                                    </div>
                                    
                                    {/* Cost Drivers Visualization */}
                                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-800 w-full mb-2">
                                        <div style={{ width: `${(surcharge.baseCost / surcharge.total) * 100}%` }} className="bg-slate-600" title="Base Mfg"></div>
                                        <div style={{ width: `${(surcharge.niCost / surcharge.total) * 100}%` }} className="bg-blue-500" title="Nickel Surcharge"></div>
                                        {surcharge.moCost > 0 && <div style={{ width: `${(surcharge.moCost / surcharge.total) * 100}%` }} className="bg-purple-500" title="Moly Surcharge"></div>}
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>Base</span>
                                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>Ni: ${surcharge.niCost.toFixed(0)}</span>
                                        {surcharge.moCost > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>Mo: ${surcharge.moCost.toFixed(0)}</span>}
                                    </div>
                                </div>

                                {/* Scenario Simulator Toggle */}
                                <div className="border-t border-slate-700 pt-4">
                                    <button 
                                        onClick={() => setSimulationMode(!simulationMode)}
                                        className="flex items-center justify-between w-full text-xs font-bold text-slate-400 hover:text-white mb-4"
                                    >
                                        <span>Scenario Simulator</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${simulationMode ? 'bg-green-500/20 text-green-400' : 'bg-slate-700'}`}>{simulationMode ? 'ON' : 'OFF'}</span>
                                    </button>

                                    {simulationMode && (
                                        <div className="space-y-4 animate-in slide-in-from-top-2">
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-blue-400">Nickel Price Change</span>
                                                    <span className="text-white font-mono">{simulatedNiChange > 0 ? '+' : ''}{simulatedNiChange}%</span>
                                                </div>
                                                <input 
                                                    type="range" min="-50" max="50" step="5"
                                                    value={simulatedNiChange}
                                                    onChange={(e) => setSimulatedNiChange(Number(e.target.value))}
                                                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                />
                                            </div>
                                            {(selectedGrade === '316L' || selectedGrade === '2205') && (
                                                <div>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-purple-400">Moly Price Change</span>
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
                                                *Estimates only. Base fabrication costs assumed constant.
                                            </div>
                                        </div>
                                    )}
                                </div>

                             </div>
                        </div>

                    </div>

                    {/* Ticker Below */}
                    <div className="mt-6 flex gap-8 overflow-hidden whitespace-nowrap text-xs text-slate-500 font-mono">
                         {['LME Copper: $8,500 (+1.2%)', 'LME Aluminum: $2,200 (-0.4%)', 'Baltic Dry Index: 1,500 (+2.1%)', 'EUR/USD: 1.08 (-0.1%)', 'Nat Gas: $2.80 (+4.0%)'].map((tick, i) => (
                             <span key={i} className="inline-block opacity-70">{tick}</span>
                         ))}
                    </div>

                </div>
            </div>

            {/* --- BOTTOM SECTION: INTELLIGENCE FEED --- */}
            <div id="report-section" className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full flex flex-col">
                
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Intelligence Channels</h2>
                        <p className="text-sm text-slate-500">Curated AI insights grounded in real-time search data.</p>
                    </div>
                    {/* Search Bar */}
                    <div className="relative w-full max-w-xs hidden md:block">
                        <input 
                            type="text" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerateReport(query)}
                            placeholder="Custom topic..." 
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
                                         ← Back to Feed
                                    </button>
                                    <div className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-mono">GENERATED BY GEMINI</div>
                                </div>
    
                                {/* Content */}
                                <div className="flex-1 p-8 md:p-10 overflow-y-auto bg-white min-h-[400px]">
                                    {isGeneratingReport ? (
                                        <div className="flex flex-col items-center justify-center h-full space-y-4">
                                            <div className="w-12 h-12 border-4 border-brandOrange/30 border-t-brandOrange rounded-full animate-spin"></div>
                                            <p className="text-sm font-bold text-slate-500 animate-pulse">Analyzing Market Data...</p>
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
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Sources</h4>
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
