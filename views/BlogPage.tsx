
import React, { useState } from 'react';
import { MarketingNavbar } from '../components/MarketingNavbar';
import { MarketingFooter } from '../components/MarketingFooter';

interface BlogPageProps {
  onBack: () => void;
  onNavigate: (page: string) => void;
}

interface BlogPost {
  category: string;
  date: string;
  readTime: string;
  title: string;
  excerpt: string;
  content: React.ReactNode;
  author: string;
  role: string;
  tags: string[];
}

export default function BlogPage({ onBack, onNavigate }: BlogPageProps) {
  const [activePost, setActivePost] = useState<BlogPost | null>(null);

  const posts: BlogPost[] = [
    {
      category: "FUTURE TECH",
      date: "NOV 02, 2024",
      readTime: "7 MIN READ",
      title: "Generative AI in Procurement: The 2024 Guide to Automating RFQs",
      excerpt: "Stop manually transcribing PDFs. Discover how Generative AI and LLMs are revolutionizing the EPC supply chain by instantly converting unstructured technical specifications into structured, actionable data for rapid bidding.",
      author: "Alex Chen",
      role: "CTO, Crontal",
      tags: ["AI in Procurement", "Generative AI", "Supply Chain Automation"],
      content: (
        <>
          <p className="lead text-xl text-slate-600 mb-8">
            The Engineering, Procurement, and Construction (EPC) sector stands on the precipice of a shift as significant as the move from drafting tables to CAD. For decades, the procurement function has been bottlenecked by a fundamental disconnect: engineering data lives in unstructured formats (PDFs, drawings, emails), while ERP systems require structured data (rows, columns, tables).
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">The Unstructured Data Problem</h3>
          <p className="mb-6">
            Every day, procurement engineers spend hours manually transcribing line items from PDF Material Take-Offs (MTOs) into Excel. It is a process rife with friction. A single typo in a wall thickness specification or a missed material grade can lead to manufacturing errors costing hundreds of thousands of dollars in rework and delays.
          </p>
          <p className="mb-6">
            Traditional OCR (Optical Character Recognition) has failed to solve this. It can read characters, but it lacks context. It sees "Sch40", but it doesn't understand that for a 6-inch pipe, Schedule 40 implies a specific wall thickness in millimeters defined by ASME B36.10.
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">Enter Generative AI</h3>
          <p className="mb-6">
            Generative AI and Large Language Models (LLMs) differ from OCR because they understand semantic context. When Crontal's engine reads a spec sheet, it doesn't just copy the text; it interprets the engineering intent.
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Standard Normalization:</strong> Converting "6 inch", "6in", and "DN150" into a unified standard automatically.</li>
            <li><strong>Gap Detection:</strong> Identifying that a line item for "Carbon Steel Pipe" is missing a specific Grade (e.g., Gr.B vs Gr.C) and flagging it for the engineer.</li>
            <li><strong>Risk Auditing:</strong> Cross-referencing requirements like NACE MR0175 against the material selection to prevent compliance failures.</li>
          </ul>
          <p>
            By automating this "Level 1" data entry work, we free up procurement teams to focus on "Level 2" strategy: negotiation, supplier relationship management, and complex project logistics. The future of procurement isn't replacing humans; it's giving them a co-pilot that handles the drudgery.
          </p>
        </>
      )
    },
    {
      category: "INDUSTRY ANALYSIS",
      date: "OCT 24, 2024",
      readTime: "5 MIN READ",
      title: "Why PDF RFQs Are Killing Your Bid Win Rate (And How to Fix It)",
      excerpt: "Unsearchable PDF attachments create a 40% efficiency drag on procurement teams. Learn why the industry is shifting to structured JSON data and how this transition unlocks real-time competitive bidding and eliminates costly manual errors.",
      author: "Alex Chen",
      role: "CTO, Crontal",
      tags: ["Digital Transformation", "RFQ Management", "Bid Efficiency"],
      content: (
        <>
          <p className="lead text-xl text-slate-600 mb-8">
            It is the industry's dirty secret: despite millions spent on digital transformation, the primary currency of the supply chain remains the unsearchable PDF. When a buyer receives a 200-page specification package, the clock starts ticking.
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">The Speed vs. Accuracy Trade-off</h3>
          <p className="mb-6">
            Suppliers are inundated with RFQs. They often prioritize the ones that are easiest to quote. If your RFQ requires a supplier to manually re-type 500 line items from a scanned PDF into their own quoting system, you are immediately at a disadvantage. You will receive fewer bids, slower responses, and higher "nuisance fees" baked into the margin.
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">The JSON Advantage</h3>
          <p className="mb-6">
            The shift to structured data (like JSON) means that an RFQ is machine-readable the moment it arrives.
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Instant Ingestion:</strong> Suppliers can import your line items directly into their ERP.</li>
            <li><strong>Automated Inventory Checks:</strong> Suppliers can instantly check stock levels against your requirements.</li>
            <li><strong>Dynamic Pricing:</strong> Pricing models can run immediately, returning a quote in minutes rather than days.</li>
          </ul>
          <p>
             Crontal facilitates this transition by acting as the translation layer. You upload the PDF, we convert it to structured data, and the supplier receives a clean, digital interface. The result? A 40% reduction in bid cycle time and a significant increase in bid participation rates.
          </p>
        </>
      )
    },
    {
      category: "ENGINEERING",
      date: "OCT 18, 2024",
      readTime: "6 MIN READ",
      title: "Automated Compliance: Validating API 5L & ASTM Specs with AI",
      excerpt: "Manual QA of Mill Test Reports (MTRs) leaves you vulnerable to non-compliance. See how Computer Vision and AI models can automatically cross-reference chemical compositions against API 5L PSL2 standards to ensure zero-defect sourcing.",
      author: "Sarah Jenkins",
      role: "Lead Engineer",
      tags: ["Quality Control", "API Standards", "Compliance Automation"],
      content: (
        <>
           <p className="lead text-xl text-slate-600 mb-8">
            In the high-stakes world of oil and gas piping, "close enough" is a recipe for disaster. Verifying Mill Test Reports (MTRs) against project specifications is one of the most tedious yet critical tasks in Quality Assurance.
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">The Chemical Composition Challenge</h3>
          <p className="mb-6">
            Consider a requirement for API 5L X52 pipe for sour service. This triggers a cascade of chemical restrictions under NACE MR0175, typically limiting Sulfur to 0.002% and Phosphorus to 0.010%, among other controls on Carbon Equivalent (CE).
          </p>
          <p className="mb-6">
            A human reviewer, fatigued after checking 50 MTRs, might miss a Sulfur content of 0.003%. It seems minor, but it violates the spec and could lead to Hydrogen Induced Cracking (HIC) in the field.
          </p>
           <h3 className="text-2xl font-bold text-slate-900 mb-4">AI as the QA Gatekeeper</h3>
          <p className="mb-6">
            Crontal's AI models are trained on these standards. When an MTR is uploaded, the system:
          </p>
          <ol className="list-decimal pl-6 mb-6 space-y-2">
            <li><strong>Extracts</strong> the heat analysis table from the scanned image.</li>
            <li><strong>Identifies</strong> the applicable standard (e.g., API 5L PSL2).</li>
            <li><strong>Calculates</strong> the Carbon Equivalent (CE_IIW and CE_Pcm).</li>
            <li><strong>Flags</strong> any element that deviates from the maximum allowable limit.</li>
          </ol>
          <p>
            This automated compliance layer ensures that non-conforming material is rejected before it ever leaves the supplier's yard, protecting both the project timeline and the integrity of the infrastructure.
          </p>
        </>
      )
    },
    {
      category: "COST ANALYSIS",
      date: "OCT 12, 2024",
      readTime: "8 MIN READ",
      title: "The Hidden ROI Killer: Calculating the Cost of Manual Data Entry",
      excerpt: "Your 'free' manual bidding process is costing you $45k per $1M spend. We analyze the hidden financial impact of administrative friction, rework from typos, and delayed cycle times—and how to reclaim that margin.",
      author: "Michael Rossi",
      role: "Procurement Director",
      tags: ["Procurement ROI", "Cost Reduction", "Operational Efficiency"],
      content: (
        <>
          <p className="lead text-xl text-slate-600 mb-8">
            Procurement leaders often view manual data entry as a "sunk cost"—part of the job description. But when you quantify the hours spent re-keying data, correcting errors, and chasing email attachments, the financial leakage is staggering.
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">The $45,000 Problem</h3>
          <p className="mb-6">
            Our analysis of mid-sized EPC firms reveals that for every $1 Million in procurement spend, approximately $45,000 is lost to process inefficiencies.
          </p>
          <div className="bg-slate-100 p-6 rounded-xl border-l-4 border-brandOrange mb-6">
            <h4 className="font-bold text-slate-900 mb-2">The Breakdown:</h4>
            <ul className="space-y-1 text-sm text-slate-700">
                <li><strong>Engineer Time:</strong> $15,000 (Highly paid staff doing data entry)</li>
                <li><strong>Error Correction:</strong> $20,000 (Rework, shipping returns, restocking fees)</li>
                <li><strong>Opportunity Cost:</strong> $10,000 (Delayed project starts due to long bid cycles)</li>
            </ul>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">Reclaiming the Margin</h3>
          <p className="mb-6">
            Automation is the lever to reclaim this margin. By reducing the time per RFQ from 4 hours to 15 minutes, companies not only reduce direct labor costs but also accelerate the entire project timeline. In construction, time is money. Shortening the procurement critical path by two weeks can save hundreds of thousands in project overhead.
          </p>
          <p>
            Investing in AI procurement tools isn't just about "tech"; it's about basic financial hygiene.
          </p>
        </>
      )
    },
    {
      category: "CASE STUDY",
      date: "SEP 28, 2024",
      readTime: "4 MIN READ",
      title: "Case Study: How Agile EPCs Are Winning Contracts Against Industry Giants",
      excerpt: "Size no longer guarantees success. Discover how mid-sized EPC firms are using AI-driven RFQ automation to reduce bid cycle times by 70%, allowing them to outmaneuver global competitors on speed and responsiveness.",
      author: "Alex Chen",
      role: "CTO, Crontal",
      tags: ["EPC Strategies", "Case Study", "Competitive Advantage"],
      content: (
        <>
          <p className="lead text-xl text-slate-600 mb-8">
            In the EPC world, the giants have scale, but they also have inertia. Legacy ERP systems, rigid approval workflows, and siloed data lakes make them slow to react. This has opened a window for agile, mid-sized firms to capture market share.
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">The "Fast Bid" Strategy</h3>
          <p className="mb-6">
            We worked with a Texas-based piping fabricator competing for a fast-track LNG expansion project. The project owner required a complete material bid within 72 hours—a timeline the industry giants deemed impossible for a 2,000-line MTO.
          </p>
          <p className="mb-6">
            Using Crontal, the fabricator ingested the PDF drawings, parsed the 2,000 lines into structured data, and auto-generated RFQs for their top 5 suppliers within 2 hours.
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">The Outcome</h3>
          <p className="mb-6">
            By the time their competitors were finished manually typing line items into Excel on Day 2, our client had already received supplier quotes, analyzed the best options, and submitted their final commercial bid.
          </p>
          <p>
            They won the contract not because they were cheaper, but because they proved they could move at the speed of the project. Automation is the great equalizer.
          </p>
        </>
      )
    },
    {
      category: "SUPPLY CHAIN",
      date: "SEP 15, 2024",
      readTime: "5 MIN READ",
      title: "Predictive Sourcing: Turning Historical Data into Future Savings",
      excerpt: "Move from reactive buying to strategic forecasting. Learn how to build a procurement data lake from your historical RFQs to predict raw material price fluctuations and secure inventory before shortages hit.",
      author: "Dr. Elena Volkov",
      role: "Data Scientist",
      tags: ["Predictive Analytics", "Data Science", "Strategic Sourcing"],
      content: (
        <>
          <p className="lead text-xl text-slate-600 mb-8">
            Most procurement teams are reactive. They wait for a requisition, then they go to market. But your historical data holds the key to predicting the future.
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">Building the Data Lake</h3>
          <p className="mb-6">
            Every RFQ you have ever sent, and every quote you have received, is a data point. Traditionally, this data dies in email inboxes. By structuring this data, you build a proprietary history of market pricing.
          </p>
          <p className="mb-6">
            Crontal users are leveraging this "Data Lake" to track price trends for specific commodities like Nickel (critical for Stainless Steel) or Molybdenum.
          </p>
           <h3 className="text-2xl font-bold text-slate-900 mb-4">Strategic Forecasting</h3>
           <p className="mb-6">
             If your data shows that 316L Stainless Steel flange prices have risen 4% month-over-month for three consecutive months, you can predict a shortage or a price hike. Smart procurement teams use this signal to buy inventory ahead of the curve, locking in lower prices before the market corrects.
           </p>
           <p>
             Predictive sourcing transforms procurement from a cost center into a strategic asset that protects the company's bottom line against volatility.
           </p>
        </>
      )
    },
    {
      category: "STRATEGY",
      date: "SEP 02, 2024",
      readTime: "4 MIN READ",
      title: "Human-in-the-Loop AI: The Safe Path to Autonomous Procurement",
      excerpt: "Full automation in critical infrastructure is dangerous. We explore the 'Co-Pilot' model: how AI handles the heavy lifting of data extraction while keeping expert engineers in control of safety-critical decisions.",
      author: "James Wright",
      role: "CEO",
      tags: ["AI Safety", "Engineering Ethics", "Human-in-the-Loop"],
      content: (
        <>
          <p className="lead text-xl text-slate-600 mb-8">
            In the rush to adopt AI, there is a temptation to automate everything. In critical infrastructure—pipelines, refineries, power plants—this is dangerous. A hallucinated pipe grade isn't just a data error; it's a potential safety hazard.
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">The Co-Pilot Philosophy</h3>
          <p className="mb-6">
            At Crontal, we believe in "Human-in-the-Loop" systems. AI should be the engine, but the human must be the steering wheel.
          </p>
          <p className="mb-6">
            We design our interface to highlight low-confidence extractions. If the AI is 99% sure a drawing says "Sch 40" but 60% sure about the material grade due to a coffee stain on the scan, it explicitly flags that field for human review.
          </p>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">Trust but Verify</h3>
          <p className="mb-6">
            This approach builds trust. Engineers are not being replaced; they are being augmented. They no longer have to type data, but they remain the final authority on what gets ordered. This balance ensures efficiency gains without compromising the rigorous safety standards of the engineering profession.
          </p>
          <p>
            Autonomous procurement is the goal, but the path there must be paved with safeguards, transparency, and respect for human expertise.
          </p>
        </>
      )
    }
  ];

  // SCROLL TO TOP WHEN SWITCHING VIEWS
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [activePost]);

  const handlePostClick = (post: BlogPost) => {
    setActivePost(post);
  };

  const handleBackToBlog = () => {
    setActivePost(null);
  };

  if (activePost) {
    return (
      <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
        <MarketingNavbar onStart={onBack} onNavigate={onNavigate} />
        
        <div className="flex-1 max-w-3xl mx-auto px-6 py-16 lg:py-24">
           {/* Navigation */}
           <button onClick={handleBackToBlog} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-brandOrange transition mb-12">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Articles
           </button>

           {/* Article Header */}
           <div className="mb-12">
              <div className="flex gap-4 items-center mb-6">
                 <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest">{activePost.category}</span>
                 <span className="text-xs font-mono text-slate-400">{activePost.date}</span>
                 <span className="text-xs font-mono text-slate-400">• {activePost.readTime}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8 leading-tight">{activePost.title}</h1>
              
              <div className="flex items-center gap-4 py-8 border-y border-slate-100">
                 <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                    {activePost.author.charAt(0)}
                 </div>
                 <div>
                    <div className="font-bold text-slate-900">{activePost.author}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">{activePost.role}</div>
                 </div>
                 <div className="ml-auto flex gap-2">
                    {/* Share Buttons Placeholder */}
                    <button className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-brandOrange hover:text-white transition">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                    </button>
                    <button className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-brandOrange hover:text-white transition">
                         <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    </button>
                 </div>
              </div>
           </div>

           {/* Article Content */}
           <article className="prose prose-lg prose-slate max-w-none mb-16 prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-600 prose-a:text-brandOrange hover:prose-a:text-orange-600 prose-img:rounded-2xl">
              {activePost.content}
           </article>

           {/* Tags */}
           <div className="flex flex-wrap gap-2 mb-16">
              {activePost.tags.map(tag => (
                 <span key={tag} className="bg-slate-50 text-slate-500 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-slate-100">#{tag}</span>
              ))}
           </div>
           
           {/* CTA */}
           <div className="bg-slate-900 rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-brandOrange/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
               <h3 className="text-2xl font-bold text-white mb-4 relative z-10">Ready to automate your RFQs?</h3>
               <p className="text-slate-400 mb-8 max-w-md mx-auto relative z-10">Join the engineering teams saving 40 hours per month with Crontal.</p>
               <button onClick={onBack} className="bg-brandOrange text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg relative z-10">
                   Start Free Draft
               </button>
           </div>
        </div>

        <MarketingFooter onNavigate={onNavigate} />
      </div>
    );
  }

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
        <div className="mb-16 cursor-pointer group" onClick={() => handlePostClick(posts[0])}>
            <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl grid md:grid-cols-2 transition-transform duration-300 hover:scale-[1.01]">
                <div className="p-8 md:p-12 flex flex-col justify-center">
                    <div className="text-brandOrange font-bold text-xs uppercase tracking-widest mb-4">Featured Article</div>
                    <h2 className="text-3xl font-bold text-white mb-6 group-hover:text-brandOrange transition-colors">{posts[0].title}</h2>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        {posts[0].excerpt}
                    </p>
                    <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-sm">AC</div>
                         <div>
                             <div className="text-white text-sm font-bold">{posts[0].author}</div>
                             <div className="text-slate-500 text-xs">{posts[0].role}</div>
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
            <article key={i} onClick={() => handlePostClick(post)} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col h-full transform hover:-translate-y-1">
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
