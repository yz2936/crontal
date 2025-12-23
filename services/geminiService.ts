import { GoogleGenAI, Type } from "@google/genai";
import { Rfq, LineItem, FileAttachment, Language, RiskAnalysisItem, InsightResponse, TrendingTopic, MarketDataResponse, SupplierCandidate, SupplierFilters } from "../types.ts";

// Constants for model names
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

/**
 * Parses user text and files into structured RFQ updates.
 */
export const parseRequest = async (
  text: string, 
  projectName: string | null, 
  files?: FileAttachment[], 
  lang: Language = 'en', 
  currentLineItems: LineItem[] = []
): Promise<{ rfqUpdates: Partial<Rfq>, responseText: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isEditMode = currentLineItems.length > 0;
  const targetLang = getLanguageName(lang);

  const systemInstruction = `
    You are Crontal's expert industrial procurement AI. 
    TASK: Extract technical data from drawings/text and return structured JSON.
    MODE: ${isEditMode ? "UPDATING EXISTING LIST" : "NEW RFQ"}
    TARGET LANGUAGE: ${targetLang}
    RULES: 
    1. Dimensions (OD, WT, Length) must be numerical. 
    2. Units should be normalized to standard industrial strings (mm, inch, m, pcs).
    3. Project name should be concise.
  `;

  let contextText = `User Request: "${text}"\nExisting Project: ${projectName || "None"}\n`;
  if (isEditMode) {
      contextText += `Current Items: ${JSON.stringify(currentLineItems.map(i => ({ line: i.line, desc: i.description, qty: i.quantity })))}`;
  }

  const parts: any[] = [{ text: contextText }];
  if (files) {
      files.forEach(f => parts.push({ inlineData: { mimeType: f.mimeType, data: f.data } }));
  }

  const response = await ai.models.generateContent({
    model: MODEL_FAST,
    contents: [{ parts }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          conversational_response: { type: Type.STRING },
          project_name: { type: Type.STRING },
          commercial: {
            type: Type.OBJECT,
            properties: {
              destination: { type: Type.STRING },
              incoterm: { type: Type.STRING },
              payment_terms: { type: Type.STRING }
            }
          },
          line_items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                line: { type: Type.INTEGER },
                description: { type: Type.STRING },
                material_grade: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                uom: { type: Type.STRING },
                od: { type: Type.NUMBER },
                od_unit: { type: Type.STRING },
                wt: { type: Type.NUMBER },
                wt_unit: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  const data = JSON.parse(response.text || "{}");
  
  const formattedItems: LineItem[] = (data.line_items || []).map((li: any) => ({
    item_id: `L-${Date.now()}-${li.line}`,
    line: li.line,
    raw_description: li.description,
    description: li.description,
    material_grade: li.material_grade,
    size: {
        outer_diameter: { value: li.od || null, unit: li.od_unit || 'mm' },
        wall_thickness: { value: li.wt || null, unit: li.wt_unit || 'mm' },
        length: { value: null, unit: null }
    },
    quantity: li.quantity || 0,
    uom: li.uom || 'pcs',
    other_requirements: []
  }));

  return {
    rfqUpdates: {
      project_name: data.project_name,
      commercial: data.commercial ? {
          destination: data.commercial.destination || "",
          incoterm: data.commercial.incoterm || "",
          paymentTerm: data.commercial.payment_terms || "",
          otherRequirements: "",
          req_mtr: false,
          req_avl: false,
          req_tpi: false,
          warranty_months: 12
      } : undefined,
      line_items: formattedItems
    },
    responseText: data.conversational_response || "Request processed."
  };
};

export const getLatestMarketData = async (): Promise<MarketDataResponse> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: MODEL_PRO,
        contents: "Get current market prices for Nickel, Molybdenum, Ferrochrome, HRC Steel, Brent Crude, Copper, Aluminum, Zinc, Lead, and Tin. Return JSON with numeric values in USD.",
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    nickel: { type: Type.NUMBER },
                    moly: { type: Type.NUMBER },
                    chrome: { type: Type.NUMBER },
                    steel: { type: Type.NUMBER },
                    oil: { type: Type.NUMBER },
                    copper: { type: Type.NUMBER },
                    aluminum: { type: Type.NUMBER },
                    zinc: { type: Type.NUMBER },
                    lead: { type: Type.NUMBER },
                    tin: { type: Type.NUMBER },
                    last_updated: { type: Type.STRING }
                }
            }
        }
    });
    const data = JSON.parse(response.text || "{}");
    return { ...data, isFallback: false };
};

export const getTrendingTopics = async (category: string): Promise<TrendingTopic[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: `What are 4 trending news topics for industrial ${category}? Return JSON list.`,
        config: {
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
    return JSON.parse(response.text || "[]");
};

export const generateIndustryInsights = async (category: string, query: string): Promise<InsightResponse> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: MODEL_PRO,
        contents: `Generate procurement intelligence for ${query} in ${category}. Ground findings in search data.`,
        config: { tools: [{ googleSearch: {} }] }
    });

    const sources: any[] = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
        .filter((c: any) => c.web)
        .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

    return { content: response.text || "No insights found.", sources };
};

export const editImage = async (data: string, mimeType: string, prompt: string): Promise<string | null> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: MODEL_IMAGE,
        contents: { parts: [{ inlineData: { data, mimeType } }, { text: prompt }] }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : null;
};

export const findSuppliers = async (rfq: Rfq, filters: SupplierFilters): Promise<SupplierCandidate[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: MODEL_PRO,
        contents: `Find 5 industrial suppliers for: ${rfq.project_name}. Requirements: ${rfq.line_items.map(i => i.description).join(', ')}. Filter: ${filters.region}.`,
        config: { 
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json"
        }
    });
    return JSON.parse(response.text || "[]");
};

export const analyzeRfqRisks = async (rfq: Rfq, lang: Language = 'en'): Promise<RiskAnalysisItem[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: `Analyze this RFQ for technical and commercial risks: ${JSON.stringify(rfq)}`,
        config: {
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
    return JSON.parse(response.text || "[]");
};