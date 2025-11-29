

import { GoogleGenAI, Type } from "@google/genai";
import { Rfq, LineItem, FileAttachment, Language } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FAST = "gemini-2.5-flash";
const MODEL_IMAGE = "gemini-2.5-flash-image";

// Export the Risk Interface here so it can be used in views
export interface RiskAnalysisItem {
    category: 'Technical' | 'Commercial' | 'Strategic';
    risk: string;
    recommendation: string;
    impact_level: 'High' | 'Medium' | 'Low';
}

const getLanguageName = (lang: Language): string => {
    switch (lang) {
        case 'zh': return "Simplified Chinese (简体中文)";
        case 'es': return "Spanish (Español)";
        default: return "English";
    }
};

// Helper to strip markdown code blocks if present
const cleanJson = (text: string): string => {
    if (!text) return "{}";
    let cleaned = text.trim();
    if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return cleaned;
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

    // Construct a concise context payload
    const rfqContext = {
        project: rfq.project_name,
        description: rfq.project_description,
        commercial: rfq.commercial,
        // Send a summary of items to save tokens, highlighting potential missing data points
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
        // Return a fallback error as a risk item if AI fails
        return [{
            category: "Technical",
            risk: "AI Analysis Failed",
            recommendation: "Please review specs manually. The AI service encountered an error.",
            impact_level: "Low"
        }];
    }
};

export const clarifyRequest = async (rfq: Rfq, userMessage: string, lang: Language = 'en'): Promise<string> => {
    // Legacy function, might not be needed if parseRequest handles conversation
    const targetLang = getLanguageName(lang);
    const systemInstruction = `
    You are Crontal's RFQ assistant.
    Goal: Confirm the user's action and summarize the current state.
    CRITICAL: Output MUST be in ${targetLang}.
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: `User said: "${userMessage}". RFQ now has ${rfq.line_items.length} items.`,
            config: { systemInstruction }
        });
        return cleanJson(response.text || "");
    } catch (e) {
        return lang === 'zh' ? "表格已更新。" : "Table updated.";
    }
}

export const generateRfqSummary = async (rfq: Rfq, lang: Language = 'en'): Promise<string> => {
  const targetLang = getLanguageName(lang);
  const systemInstruction = `
    Role: Procurement Manager.
    Task: Write an Executive Summary for Suppliers.
    Language: ${targetLang}.
    Length: <80 words.
    Focus: Project scale, key materials, urgency.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: `RFP Name: ${rfq.project_name}. Items: ${rfq.line_items.length}. Descs: ${rfq.line_items.slice(0,5).map(i=>i.description).join('; ')}`,
      config: { systemInstruction }
    });
    return cleanJson(response.text || "");
  } catch (e) {
    return "";
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
        
        // Find image part
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
