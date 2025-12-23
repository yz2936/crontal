
import { GoogleGenAI, Type } from "@google/genai";
import { Rfq, LineItem, FileAttachment, Language, RiskAnalysisItem, InsightSource, InsightResponse, TrendingTopic, MarketDataResponse, SupplierCandidate, SupplierFilters } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FAST = "gemini-3-flash-preview";
const MODEL_PRO = "gemini-3-pro-preview";
const MODEL_IMAGE = "gemini-2.5-flash-image";

const getLanguageName = (lang: Language): string => {
    switch (lang) {
        case 'zh': return "Simplified Chinese (简体中文)";
        case 'es': return "Spanish (Español)";
        default: return "English";
    }
};

const cleanJson = (text: string): string => {
    if (!text) return "{}";
    // Improved regex to handle nested code blocks or prefixes
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
        let candidate = jsonMatch[0];
        // Remove markdown backticks if they are still present
        candidate = candidate.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
        return candidate;
    }
    return text.trim();
};

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
    TARGET LANGUAGE: ${targetLang}
    TASKS:
    1. Conversational response in "conversational_response".
    2. Extract line items, commercial terms, and project name.
    3. Normalise dimensions (OD, WT, Length) into numerical values.
    4. Focus on industrial codes (ASTM, ASME, API).
  `;

  try {
    const parts: any[] = [];
    let promptText = `USER REQUEST:\n"""${text}"""\n\nRFP Context: ${projectName || "N/A"}\n`;
    
    if (isEditMode) {
        const cleanList = currentLineItems.map(item => ({
            line: item.line,
            id: item.item_id,
            desc: item.description,
            qty: item.quantity
        }));
        promptText += `\n[CURRENT ITEMS]:\n${JSON.stringify(cleanList)}\n`;
    }

    parts.push({ text: promptText });
    if (files?.length) {
        files.forEach(f => parts.push({ inlineData: { mimeType: f.mimeType, data: f.data } }));
    }

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            conversational_response: { type: Type.STRING },
            project_name: { type: Type.STRING, nullable: true },
            commercial: {
                type: Type.OBJECT,
                properties: {
                    destination: { type: Type.STRING, nullable: true },
                    incoterm: { type: Type.STRING, nullable: true },
                    payment_terms: { type: Type.STRING, nullable: true }
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
                  size: {
                    type: Type.OBJECT,
                    properties: {
                      od_val: { type: Type.NUMBER, nullable: true },
                      od_unit: { type: Type.STRING, nullable: true },
                      wt_val: { type: Type.NUMBER, nullable: true },
                      wt_unit: { type: Type.STRING, nullable: true }
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

    const parsedData = JSON.parse(cleanJson(response.text || "{}"));
    const items: LineItem[] = (parsedData.line_items || []).map((li: any, idx: number) => ({
        item_id: li.item_id || `L${Date.now()}-${idx}`,
        line: idx + 1,
        raw_description: li.description || "",
        description: li.description || "",
        product_type: li.product_type || inferShape(li.description),
        material_grade: li.material_grade,
        size: {
            outer_diameter: { value: li.size?.od_val, unit: li.size?.od_unit || 'mm' },
            wall_thickness: { value: li.size?.wt_val, unit: li.size?.wt_unit || 'mm' },
            length: { value: null, unit: null }
        },
        quantity: li.quantity,
        uom: li.uom || 'pcs',
        other_requirements: []
    }));

    return {
        rfqUpdates: {
            project_name: parsedData.project_name,
            commercial: {
                destination: parsedData.commercial?.destination || "",
                incoterm: parsedData.commercial?.incoterm || "",
                paymentTerm: parsedData.commercial?.payment_terms || "",
                otherRequirements: "",
                req_mtr: false,
                req_avl: false,
                req_tpi: false,
                warranty_months: 12
            },
            line_items: items
        },
        responseText: parsedData.conversational_response || "Request processed."
    };
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return { rfqUpdates: { line_items: [] }, responseText: "I encountered an error processing that request." }; 
  }
};

export const findSuppliers = async (rfq: Rfq, filters: SupplierFilters): Promise<SupplierCandidate[]> => {
    const summary = `Project: ${rfq.project_name}. Items: ${rfq.line_items.slice(0, 3).map(i => i.description).join(', ')}. Region: ${filters.region}.`;
    const prompt = `Find 5 high-quality industrial suppliers for: ${summary}. Return JSON array of objects with fields: {name, website, location, match_reason, rationale, email, tags:[]}`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_PRO,
            contents: prompt,
            config: { 
              tools: [{googleSearch: {}}],
              responseMimeType: "application/json"
            }
        });
        const results = JSON.parse(cleanJson(response.text || "[]"));
        return results.map((s: any, i: number) => ({
            id: `SUP-${i}`,
            ...s,
            selected: true,
            contacts: []
        }));
    } catch (e) {
        console.error("FindSuppliers Error:", e);
        return [];
    }
};

export const analyzeRfqRisks = async (rfq: Rfq, lang: Language = 'en'): Promise<RiskAnalysisItem[]> => {
    const context = { project: rfq.project_name, items: rfq.line_items.map(i => ({ line: i.line, grade: i.material_grade, desc: i.description })) };
    try {
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: JSON.stringify(context),
            config: {
                systemInstruction: "Identify procurement risks (Technical/Commercial/Strategic) based on industry standards. Return JSON array of objects {category, risk, recommendation, impact_level}.",
                responseMimeType: "application/json"
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    } catch (e) {
        return [{ category: "Technical", risk: "Service analysis unavailable", recommendation: "Manual review required.", impact_level: "Medium" }];
    }
};

export const auditRfqSpecs = async (rfq: Rfq): Promise<string[]> => {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: `Audit this material list for missing technical specs or errors: ${JSON.stringify(rfq.line_items)}`,
        config: { 
          systemInstruction: "Return a JSON array of specific warning strings about missing specs.",
          responseMimeType: "application/json"
        }
      });
      return JSON.parse(cleanJson(response.text || "[]"));
    } catch (e) {
      return [];
    }
};

export const editImage = async (base64Image: string, mimeType: string, prompt: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: MODEL_IMAGE,
            contents: { parts: [{ inlineData: { data: base64Image, mimeType: mimeType } }, { text: prompt }] },
        });
        const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        return part ? `data:image/png;base64,${part.inlineData.data}` : null;
    } catch (e) {
        console.error("EditImage Error:", e);
        return null;
    }
};

export const getTrendingTopics = async (category: string): Promise<TrendingTopic[]> => {
    try {
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: `Identify 4 major trending news topics or market shifts for industrial sector category: ${category}`,
            config: {
                systemInstruction: "Return JSON array of 4 objects {title, subtitle, tag, impact}.",
                responseMimeType: "application/json"
            }
        });
        return JSON.parse(cleanJson(response.text || "[]"));
    } catch(e) {
        return [];
    }
};

export const getLatestMarketData = async (): Promise<MarketDataResponse | null> => {
    try {
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: "Retrieve current market prices for major industrial commodities: Nickel, Moly, Chrome, Steel, Oil, Copper, Aluminum, Zinc, Lead, Tin.",
            config: {
                systemInstruction: "Return JSON: {nickel, moly, chrome, steel, oil, copper, aluminum, zinc, lead, tin, last_updated: 'YYYY-MM-DD'}",
                tools: [{googleSearch: {}}],
                responseMimeType: "application/json"
            }
        });
        const data = JSON.parse(cleanJson(response.text || "{}"));
        return { ...data, isFallback: false };
    } catch (e) {
        console.error("GetMarketData Error:", e);
        return { nickel: 16200, moly: 42, chrome: 1.45, steel: 820, oil: 78, copper: 8900, aluminum: 2200, zinc: 2400, lead: 2100, tin: 26000, last_updated: new Date().toISOString(), isFallback: true };
    }
};

export const generateIndustryInsights = async (category: string, query: string): Promise<InsightResponse> => {
    try {
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: `Generate detailed industrial procurement insights for: ${query} in category: ${category}`,
            config: { 
              tools: [{googleSearch: {}}],
              systemInstruction: "Provide deep strategic insights grounded in current market data."
            }
        });
        const sources: InsightSource[] = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
            .filter((c: any) => c.web?.uri)
            .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));
        return { content: response.text || "No insights found.", sources };
    } catch (e) {
        return { content: "Insights service currently limited.", sources: [] };
    }
};
