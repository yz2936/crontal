import { GoogleGenAI, Type } from "@google/genai";
import { Rfq, LineItem, FileAttachment, Language, RiskAnalysisItem, InsightSource, InsightResponse, TrendingTopic, MarketDataResponse, SupplierCandidate, SupplierFilters } from "../types";

// Initialize Gemini Client
// CRITICAL: We must use process.env.API_KEY directly for Vite to perform build-time replacement.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FAST = "gemini-2.5-flash";
const MODEL_IMAGE = "gemini-2.5-flash-image";

const getLanguageName = (lang: Language): string => {
    switch (lang) {
        case 'zh': return "Simplified Chinese (简体中文)";
        case 'es': return "Spanish (Español)";
        default: return "English";
    }
};

// Helper to robustly extract JSON from potentially conversational text
const cleanJson = (text: string): string => {
    if (!text) return "{}";
    
    // 1. Try to find markdown code block (json or generic)
    const patterns = [
        /```json\s*([\s\S]*?)\s*```/,
        /```\s*([\s\S]*?)\s*```/
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            text = match[1];
            break; 
        }
    }

    // 2. Find start of JSON (Object or Array)
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    
    let start = -1;
    // Check which comes first
    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
        start = firstBracket;
    } else if (firstBrace !== -1) {
        start = firstBrace;
    }

    if (start === -1) return text.trim();

    // 3. Find end of JSON
    let end = -1;
    // If it started with [, look for last ]. If it started with {, look for last }.
    if (text[start] === '[') {
        end = text.lastIndexOf(']');
    } else {
        end = text.lastIndexOf('}');
    }

    if (end !== -1 && end >= start) {
        return text.substring(start, end + 1);
    }

    return text.trim();
};

// Simple regex fallback for shape if AI misses it
const inferShape = (desc: string): string => {
    if (!desc) return "";
    const d = desc.toLowerCase();
    if (d.includes("pipe") || d.includes("tube")) return "Pipe";
    if (d.includes("flange") || d.includes("wn") || d.includes("blind") || d.includes("slip-on")) return "Flange";
    if (d.includes("elbow") || d.includes("tee") || d.includes("reducer") || d.includes("cap")) return "Fitting";
    if (d.includes("valve") || d.includes("ball") || d.includes("gate") || d.includes("check")) return "Valve";
    if (d.includes("gasket")) return "Gasket";
    if (d.includes("bolt") || d.includes("stud")) return "Bolt";
    if (d.includes("plate") || d.includes("sheet")) return "Plate";
    return "Other";
};

export const parseRequest = async (
  text: string, 
  projectName: string | null, 
  files?: FileAttachment[], 
  lang: Language = 'en', 
  currentLineItems: LineItem[] = []
): Promise<{ rfqUpdates: Partial<Rfq>, responseText: string }> => {
  
  const isEditMode = currentLineItems.length > 0;
  const targetLang = getLanguageName(lang);

  const systemInstruction = `
    You are Crontal's expert procurement AI. Your role is to interact naturally with the buyer AND extract/modify structured RFQ data.

    MODE: ${isEditMode ? "EDITING EXISTING LIST" : "CREATING NEW LIST"}
    TARGET LANGUAGE FOR TEXT FIELDS & RESPONSE: ${targetLang}

    YOUR TASKS:
    1. **CONVERSATIONAL RESPONSE (Priority)**:
       - Generate a natural, helpful response in "conversational_response" field.
       - Acknowledge the user's input directly (e.g., "I've added the 3 flanges you requested.").
       - If the user asks a question, answer it.
       - If specific details are missing (e.g., material grade), politely ask for them in the response.
       - Keep it professional but conversational.

    2. **DATA EXTRACTION / EDITING**:
       - Analyze text and files.
       ${isEditMode 
        ? `- LOGIC: You are provided a [CURRENT LINE ITEMS] list.
             * "Add...": APPEND new items.
             * "Change line X...": MODIFY item with "line": X.
             * "Delete line X": REMOVE item with "line": X.
             * "Set name...": Update project_name.
           - RETURN THE FULL, MERGED LIST in the "line_items" array. Do not return partial updates. Preserve IDs.` 
        : `- LOGIC: Extract all line items from scratch.`}
    
    3. **ENGINEERING INTELLIGENCE**:
       - **Dimensions**: Split into OD, WT, Length. Normalize units.
       - **Product Type**: Detect Pipe, Flange, Valve, etc.
       - **Specs**: Extract Grade, Tolerance, Tests (HIC, SSC, MTR).
    
    4. **COMMERCIAL TERMS**:
       - Extract Destination, Incoterm, Payment Terms if mentioned.

    OUTPUT FORMAT:
    - Return ONLY valid JSON matching the schema.
  `;

  try {
    const parts: any[] = [];
    
    let promptText = `USER REQUEST:\n"""${text}"""\n\nRFP Name Context: ${projectName || "N/A"}\n`;
    
    if (isEditMode) {
        // Send a simplified version of current items to save tokens, but keep IDs
        const cleanList = currentLineItems.map(item => ({
            line: item.line,
            item_id: item.item_id,
            description: item.description,
            qty: item.quantity,
            grade: item.material_grade
        }));
        promptText += `\n\n[CURRENT LINE ITEMS DATA]:\n${JSON.stringify(cleanList)}\n`;
    }

    parts.push({ text: promptText });

    if (files && files.length > 0) {
        files.forEach(file => {
            parts.push({
                inlineData: {
                    mimeType: file.mimeType,
                    data: file.data
                }
            });
        });
    }

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            conversational_response: { type: Type.STRING, description: "Natural language response to the user." },
            project_name: { type: Type.STRING, nullable: true },
            commercial: {
                type: Type.OBJECT,
                properties: {
                    destination: { type: Type.STRING, nullable: true },
                    incoterm: { type: Type.STRING, nullable: true },
                    payment_terms: { type: Type.STRING, nullable: true },
                    other_requirements: { type: Type.STRING, nullable: true }
                }
            },
            line_items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item_id: { type: Type.STRING, nullable: true },
                  description: { type: Type.STRING },
                  product_type: { type: Type.STRING, nullable: true },
                  material_grade: { type: Type.STRING, nullable: true },
                  tolerance: { type: Type.STRING, nullable: true },
                  test_reqs: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                  size: {
                    type: Type.OBJECT,
                    properties: {
                      od_val: { type: Type.NUMBER, nullable: true },
                      od_unit: { type: Type.STRING, nullable: true },
                      wt_val: { type: Type.NUMBER, nullable: true },
                      wt_unit: { type: Type.STRING, nullable: true },
                      len_val: { type: Type.NUMBER, nullable: true },
                      len_unit: { type: Type.STRING, nullable: true }
                    }
                  },
                  quantity: { type: Type.NUMBER, nullable: true },
                  uom: { type: Type.STRING, nullable: true }
                }
              }
            }
          }
        }
      }
    });

    const cleanText = cleanJson(response.text || "{}");
    let parsedData;
    try {
        parsedData = JSON.parse(cleanText);
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError, cleanText);
        throw new Error("Failed to parse AI response");
    }
    
    const items: LineItem[] = (parsedData.line_items || []).map((li: any, idx: number) => {
        const id = li.item_id || `L${Date.now()}-${idx}`;
        
        return {
            item_id: id,
            line: idx + 1,
            raw_description: li.description || "",
            description: li.description || "",
            product_category: null,
            product_type: li.product_type || inferShape(li.description),
            material_grade: li.material_grade,
            standard_or_spec: null,
            tolerance: li.tolerance,
            test_reqs: li.test_reqs || [],
            size: {
                outer_diameter: { value: li.size?.od_val, unit: li.size?.od_unit },
                wall_thickness: { value: li.size?.wt_val, unit: li.size?.wt_unit },
                length: { value: li.size?.len_val, unit: li.size?.len_unit }
            },
            quantity: li.quantity,
            uom: li.uom,
            delivery_location: null,
            required_delivery_date: null,
            incoterm: null,
            payment_terms: null,
            other_requirements: []
        };
    });

    return {
        rfqUpdates: {
            project_name: parsedData.project_name,
            commercial: {
                destination: parsedData.commercial?.destination || "",
                incoterm: parsedData.commercial?.incoterm || "",
                paymentTerm: parsedData.commercial?.payment_terms || "",
                otherRequirements: parsedData.commercial?.other_requirements || "",
                req_mtr: false,
                req_avl: false,
                req_tpi: false,
                warranty_months: 12
            },
            line_items: items
        },
        responseText: parsedData.conversational_response || (lang === 'zh' ? "已处理您的请求。" : "Request processed.")
    };

  } catch (error) {
    console.error("Gemini Parse Error:", error);
    return { rfqUpdates: { line_items: [] }, responseText: "I encountered an error processing that request." }; 
  }
};

export const findSuppliers = async (rfq: Rfq, filters: SupplierFilters): Promise<SupplierCandidate[]> => {
    // Construct a concise summary for the prompt
    const summary = `
        Project: ${rfq.project_name || "Industrial Project"}
        Delivery Location: ${rfq.commercial.destination || "Not Specified (Assume Global)"}
        Key Items: ${rfq.line_items.slice(0, 5).map(i => `${i.quantity} ${i.uom} ${i.description}`).join('; ')}
        Special Requirements: ${rfq.commercial.req_avl ? "AVL Required" : "Open Market"}, ${rfq.commercial.req_mtr ? "MTR Required" : ""}
    `;

    // Construct strategy based on granular filters
    let strategy = `STRATEGY: INTELLIGENT SOURCING.\n`;
    
    // 1. Region Logic
    if (filters.region && filters.region !== "Global") {
        strategy += `- REGION CONSTRAINT: STRICTLY search for suppliers with facilities in ${filters.region.toUpperCase()}. Prioritize local presence.\n`;
    } else {
        strategy += `- REGION: Global Best Value (Balance Logistics vs Cost).\n`;
    }

    // 2. Type Logic
    if (filters.types && filters.types.length > 0) {
        strategy += `- SUPPLIER TYPE: Prioritize ${filters.types.join(' or ')}. \n`;
        if (filters.types.includes("Manufacturer")) strategy += "  * NOTE: Avoid traders if 'Manufacturer' is selected.\n";
    }

    // 3. Certifications
    if (filters.certs && filters.certs.length > 0) {
        strategy += `- REQUIRED CERTS: Must likely hold ${filters.certs.join(', ')}.\n`;
    }

    const prompt = `
        You are an expert Strategic Sourcing Specialist and Supply Chain Analyst.
        TASK: Find 4-6 real, high-quality potential suppliers for this project using Google Search.
        
        PROJECT DETAILS:
        ${summary}
        
        ${strategy}
        
        OUTPUT FORMAT:
        Return ONLY a raw JSON Array of objects. Do not use Markdown formatting.
        
        JSON Structure:
        [
          {
            "name": "Supplier Name",
            "website": "URL or N/A",
            "location": "City, Country",
            "match_reason": "Brief reason why they are a fit based on the specific items (e.g. 'Specializes in Heavy Wall Pipe')",
            "rationale": "Strategic reason for selection based on filters",
            "email": "General sales email if found publicly, otherwise null",
            "tags": ["Tag1", "Tag2"] // e.g. "ISO 9001", "Manufacturer", "USA"
          }
        ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        const clean = cleanJson(response.text || "[]");
        const results = JSON.parse(clean);
        
        return results.map((s: any, i: number) => ({
            id: `SUP-${i}`,
            name: s.name,
            website: s.website,
            location: s.location,
            match_reason: s.match_reason,
            rationale: s.rationale,
            email: s.email || '',
            tags: s.tags || [],
            selected: true, // Select by default
            contacts: []    // Initialize empty contacts array for buyer input
        }));

    } catch (e) {
        console.error("Sourcing Error", e);
        return [];
    }
};

export const analyzeRfqRisks = async (rfq: Rfq, lang: Language = 'en'): Promise<RiskAnalysisItem[]> => {
    const targetLang = getLanguageName(lang);
    const systemInstruction = `
      You are a Senior Procurement Risk Officer. Your job is to audit this RFQ before it is sent to suppliers.
      Identify WEAKNESSES that could lead to ambiguity, wrong quotes, manufacturing errors, or commercial disputes.
      
      ANALYZE:
      1. **Technical**: Missing grades, undefined specs (e.g. "Carbon Steel" without Grade), missing dimensions, missing NACE/HIC requirements for O&G. 
         - **IMPORTANT**: If a specific item is missing data, reference it clearly as "Line X" (e.g., "Line 3 is missing Schedule").
      2. **Commercial**: Missing Incoterms, vague payment terms, missing warranty.
      3. **Strategic**: Single sourcing risks, unfeasible delivery times, incomplete project description.
      
      OUTPUT:
      Return a structured JSON list of specific recommendations.
      Language: ${targetLang}
    `;

    const rfqContext = {
        project: rfq.project_name,
        description: rfq.project_description,
        commercial: rfq.commercial,
        items: rfq.line_items.map(i => ({
            line: i.line,
            desc: i.description,
            grade: i.material_grade || "MISSING",
            qty: i.quantity,
            type: i.product_type
        }))
    };

    try {
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: JSON.stringify(rfqContext),
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            category: { type: Type.STRING, enum: ['Technical', 'Commercial', 'Strategic'] },
                            risk: { type: Type.STRING },
                            recommendation: { type: Type.STRING },
                            impact_level: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
                        }
                    }
                }
            }
        });

        const clean = cleanJson(response.text || "[]");
        const parsed: RiskAnalysisItem[] = JSON.parse(clean);
        return parsed;
    } catch (e) {
        console.error("Risk Analysis Error", e);
        return [{
            category: "Technical",
            risk: "AI Analysis Failed",
            recommendation: "Please review specs manually. The AI service encountered an error.",
            impact_level: "Low"
        }];
    }
};

export const auditRfqSpecs = async (rfq: Rfq, lang: Language = 'en'): Promise<string[]> => {
    const targetLang = getLanguageName(lang);
    const systemInstruction = `
      Role: EPC QA Engineer.
      Task: Audit RFQ for missing specs.
      Output: JSON Array of warning strings in ${targetLang}.
      
      Checks:
      - Pipes: Missing Schedule/WT?
      - Flanges: Missing Class (#150)?
      - Materials: Missing Grade?
      - Valves: Missing Trim?
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: JSON.stringify(rfq.line_items),
        config: { 
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      });
      const clean = cleanJson(response.text || "[]");
      const parsed = JSON.parse(clean);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
};

export const editImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: MODEL_IMAGE,
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            },
        });
        
        const candidate = response.candidates?.[0];
        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
        }
        return null;
    } catch (e) {
        console.error("Image Edit Error", e);
        throw e;
    }
};

export const getTrendingTopics = async (category: string): Promise<TrendingTopic[]> => {
    const systemInstruction = `
        You are an industrial news curator.
        TASK: Generate 4 realistic news headlines/topics for: "${category}".
        Focus: Regulatory, Supply Chain, Innovation.
        OUTPUT: JSON Array of 4 items.
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: `Give me 4 trending topics for ${category}`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            subtitle: { type: Type.STRING },
                            tag: { type: Type.STRING },
                            impact: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
                        }
                    }
                }
            }
        });
        
        const clean = cleanJson(response.text || "[]");
        return JSON.parse(clean);
    } catch(e) {
        console.error("News Fetch Error", e);
        return [
            { title: "Market Volatility Alert", subtitle: "Unable to fetch specific news. General caution advised.", tag: "System", impact: "Low" }
        ];
    }
};

export const getLatestMarketData = async (): Promise<MarketDataResponse | null> => {
    const systemInstruction = `
        You are a financial data assistant. 
        TASK: Search for LATEST market prices using Google Search Grounding.
        
        REQUIRED DATA (Stainless & LME):
        Nickel, Molybdenum, Ferrochrome, US HRC Steel, Brent Crude, Copper, Aluminum, Zinc, Lead, Tin.

        OUTPUT FORMAT: JSON ONLY. No markdown.
        Structure:
        {
          "nickel": number, "moly": number, "chrome": number, "steel": number, "oil": number,
          "copper": number, "aluminum": number, "zinc": number, "lead": number, "tin": number,
          "last_updated": "YYYY-MM-DD"
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: "Get latest prices for: LME Nickel USD/Ton, Molybdenum USD/lb, Ferrochrome USD/lb, US HRC Steel USD/ST, Brent Crude USD/bbl, LME Copper, LME Aluminum, LME Zinc, LME Lead, LME Tin",
            config: {
                systemInstruction,
                tools: [{googleSearch: {}}]
            }
        });

        const clean = cleanJson(response.text || "{}");
        const data = JSON.parse(clean);
        data.isFallback = false;
        return data;
    } catch (e) {
        console.error("Live Market Data Fetch Failed", e);
        // Fallback data
        return {
            nickel: 16200, moly: 42, chrome: 1.45, steel: 820, oil: 78,
            copper: 8900, aluminum: 2200, zinc: 2400, lead: 2100, tin: 26000,
            last_updated: new Date().toISOString(),
            isFallback: true
        };
    }
};

export const generateIndustryInsights = async (category: string, query: string): Promise<InsightResponse> => {
    const systemInstruction = `
        You are a Senior Industrial Analyst.
        TASK: Provide a concise executive summary on: ${category} - ${query}.
        OUTPUT STRUCTURE (Markdown):
        ## 1. Executive Summary
        ## 2. Key Developments
        ## 3. Market Impact
        ## 4. Strategic Advice
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: `Generate insights for: ${query} in category: ${category}`,
            config: { 
                systemInstruction,
                tools: [{googleSearch: {}}]
            }
        });

        const text = response.text || "Unable to generate insights at this time.";
        const sources: InsightSource[] = [];
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        chunks.forEach((chunk: any) => {
            if (chunk.web?.uri && chunk.web?.title) {
                sources.push({
                    title: chunk.web.title,
                    uri: chunk.web.uri
                });
            }
        });

        return { content: text, sources };

    } catch (e) {
        console.error("Industry Insights Error", e);
        return { content: "Service unavailable. Please try again later.", sources: [] };
    }
};
