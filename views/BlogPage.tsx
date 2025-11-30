
import React from 'react';
import { MarketingNavbar } from '../components/MarketingNavbar';
import { MarketingFooter } from '../components/MarketingFooter';

interface BlogPageProps {
  onBack: () => void;
  onNavigate: (page: string) => void;
}

export default function BlogPage({ onBack, onNavigate }: BlogPageProps) {
  const posts = [
    {
      category: "FUTURE TECH",
      date: "NOV 02, 2024",
      readTime: "7 MIN READ",
      title: "Generative AI In Procurement: Beyond The Hype",
      excerpt: "Everyone is talking about ChatGPT, but how does it actually apply to a structured purchase order? We explore the practical applications of Large Language Models (LLMs) in parsing technical line items and standardizing unstructured supply chain data.",
      author: "Alex Chen",
      role: "CTO, Crontal",
      tags: ["AI", "Procurement", "LLM"]
    },
    {
      category: "INDUSTRY ANALYSIS",
      date: "OCT 24, 2024",
      readTime: "5 MIN READ",
      title: "The Death Of The PDF RFQ: Why Structured Data Is Inevitable",
      excerpt: "For decades, the industrial supply chain has run on PDF attachments. This manual friction costs the EPC industry billions in delays and errors. Here is why generative AI is finally killing the unsearchable document and enabling real-time bidding.",
      author: "Alex Chen",
      role: "CTO, Crontal",
      tags: ["Digital Transformation", "Supply Chain"]
    },
    {
      category: "ENGINEERING",
      date: "OCT 18, 2024",
      readTime: "6 MIN READ",
      title: "Validating API 5L Specs With Computer Vision",
      excerpt: "Large Language Models are now capable of reading complex mill test reports (MTRs) and validating them against API 5L PSL2 standards. We explore the accuracy of AI in detecting chemical composition deviations in high-pressure piping.",
      author: "Sarah Jenkins",
      role: "Lead Engineer",
      tags: ["Quality Control", "API Standards"]
    },
    {
      category: "COST ANALYSIS",
      date: "OCT 12, 2024",
      readTime: "8 MIN READ",
      title: "The Hidden Cost Of 'Free' Manual Bidding",
      excerpt: "Procurement teams often ignore the internal cost of manual data entry. Our analysis shows that for every $1M in spend, $45k is wasted on administrative friction and rework due to copy-paste errors in Excel.",
      author: "Michael Rossi",
      role: "Procurement Director",
      tags: ["ROI", "Efficiency"]
    },
    {
      category: "CASE STUDY",
      date: "SEP 28, 2024",
      readTime: "4 MIN READ",
      title: "How Mid-Sized EPCs Are Outpacing Giants",
      excerpt: "By automating the RFQ-to-Quote loop, smaller firms are reducing bid cycle times by 70%, allowing them to compete with global giants on agility and responsiveness. Read the case study on Texas LNG expansion projects.",
      author: "Alex Chen",
      role: "CTO, Crontal",
      tags: ["EPC", "Case Study"]
    },
    {
      category: "SUPPLY CHAIN",
      date: "SEP 15, 2024",
      readTime: "5 MIN READ",
      title: "From Reactive To Predictive Sourcing",
      excerpt: "Once your procurement data is structured, you can stop reacting to shortages and start predicting price fluctuations based on raw material trends. How to build a data lake from your historical RFQs.",
      author: "Dr. Elena Volkov",
      role: "Data Scientist",
      tags: ["Data Science", "Predictive Analytics"]
    },
    {
      category: "STRATEGY",
      date: "SEP 02, 2024",
      readTime: "4 MIN READ",
      title: "AI As A Co-Pilot, Not An Autopilot",
      excerpt: "Why the 'Human-in-the-Loop' is critical for industrial safety. We discuss why full automation is dangerous for critical piping components and how Crontal keeps engineers in control of the final decision.",
      author: "James Wright",
      role: "CEO",
      tags: ["Safety", "AI Ethics"]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <MarketingNavbar onStart={onBack} onNavigate={onNavigate} />

      <div className="flex-1 max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div className="inline-block px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-4">Engineering Blog</div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">The Future Of Industrial Procurement</h1>
          <p className="text-lg text-slate-500 leading-relaxed">
            Deep dives into AI, procurement automation, and the future of the industrial supply chain.
            Straight from the engineers building the next generation of tools.
          </p>
        </div>

        {/* Featured Post */}
        <div className="mb-16">
            <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl grid md:grid-cols-2">
                <div className="p-8 md:p-12 flex flex-col justify-center">
                    <div className="text-brandOrange font-bold text-xs uppercase tracking-widest mb-4">Featured Article</div>
                    <h2 className="text-3xl font-bold text-white mb-6">Generative AI In Procurement: Beyond The Hype</h2>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        Everyone is talking about ChatGPT, but how does it actually apply to a structured purchase order? We explore the practical applications of Large Language Models (LLMs) in parsing technical line items and standardizing unstructured supply chain data.
                    </p>
                    <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm">AC</div>
                         <div>
                             <div className="text-white text-sm font-bold">Alex Chen</div>
                             <div className="text-slate-500 text-xs">CTO, Crontal</div>
                         </div>
                    </div>
                </div>
                <div className="bg-slate-800 relative min-h-[300px]">
                     <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20"></div>
                     {/* Abstract Network Graph Visual */}
                     <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                        </pattern>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                     </svg>
                </div>
            </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.slice(1).map((post, i) => (
            <article key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col h-full transform hover:-translate-y-1">
              <div className="h-56 bg-slate-100 relative overflow-hidden">
                <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-brandOrange/5 transition duration-500"></div>
                {/* Abstract Pattern Generation based on Index */}
                <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: `radial-gradient(circle at ${i * 30}% ${i * 20}%, #000 1px, transparent 1px)`,
                    backgroundSize: '20px 20px'
                }}></div>
                <div className="absolute bottom-4 left-4 flex gap-2">
                    <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold text-slate-600 shadow-sm uppercase tracking-wide border border-slate-100">
                    {post.category}
                    </div>
                </div>
              </div>
              <div className="p-8 flex-1 flex flex-col">
                <div className="text-xs text-slate-400 font-mono mb-4 flex items-center gap-2">
                  <span>{post.date}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span>{post.readTime}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-brandOrange transition leading-snug">
                  {post.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-8 flex-1">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-3 pt-6 border-t border-slate-100 mt-auto">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 border border-slate-200">
                    {post.author.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{post.author}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wide">{post.role}</div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-24 bg-slate-900 rounded-3xl p-12 text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-brandOrange/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
             
             <div className="relative z-10">
                <h2 className="text-3xl font-bold text-white mb-4">Subscribe To Engineering Intelligence</h2>
                <p className="text-slate-400 mb-8 max-w-lg mx-auto">Get the latest whitepapers and case studies delivered to your inbox. No spam, just specs.</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto">
                    <input 
                        type="email" 
                        placeholder="Enter your work email" 
                        className="px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brandOrange w-full"
                    />
                    <button className="px-6 py-3 rounded-xl bg-brandOrange text-white font-bold hover:bg-orange-600 transition whitespace-nowrap">
                        Subscribe
                    </button>
                </div>
             </div>
        </div>
      </div>
      
      <MarketingFooter onNavigate={onNavigate} />
    </div>
  );
}
