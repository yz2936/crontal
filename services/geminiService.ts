
import { GoogleGenAI, Type } from "@google/genai";
import { Rfq, LineItem, FileAttachment, Language } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FAST = "gemini-2.5-flash";

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
    // Remove ```json ... ``` or just ``` ... ``` or leading/trailing whitespace
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
): Promise<Partial<Rfq>> => {
  
  const isEditMode = currentLineItems.length > 0;
  const targetLang = getLanguageName(lang);

  const systemInstruction = `
    You are Crontal's expert procurement AI. Your role is to extract or modify structured RFQ data from natural language or engineering documents.

    MODE: ${isEditMode ? "EDITING EXISTING LIST" : "CREATING NEW LIST"}
    TARGET LANGUAGE FOR TEXT FIELDS: ${targetLang} (Strictly enforce this language for Description and Material Grade)

    YOUR TASKS:
    1. Analyze the text input and any attached engineering drawings/MTOs.
    
    2. ${isEditMode 
        ? `CRITICAL EDITING LOGIC:
           - You are provided a [CURRENT LINE ITEMS] list.
           - User Input determines the change:
             * "Add 5 pipes...": APPEND new items to the list.
             * "Change line 2 to...": MODIFY item with "line": 2.
             * "Delete line 3": REMOVE item with "line": 3.
             * "Set project name to X": Update project_name, keep items unchanged.
           - RETURN THE FULL, MERGED LIST. Do not return just the changes.
           - Preserve existing item_ids for unchanged items.` 
        : `Extract all line items from scratch.`}
    
    3. DIMENSION & SHAPE PARSING:
       - Split dimensions into: **OD** (Outer Diameter), **WT** (Wall Thickness/Schedule), **Length**.
       - Detect **Shape/Product Type** (e.g., Pipe, Flange, Elbow, Tee, Valve, Gasket).
       - Normalize units to: 'mm', 'm', 'in', 'ft', 'pcs'.
    
    4. DEEP SPECIFICATION EXTRACTION (Crucial):
       - **Tolerance**: Look for "+/-", "Min Wall", "Tol.".
       - **Tests**: Look for "HIC", "SSC", "Impact", "Ultrasonic", "Radiography", "MTR".
       - **Grade**: Extract full material grade (e.g., "API 5L Gr.B PSL2").
    
    5. COMMERCIAL TERMS:
       - Extract Destination, Incoterm, Payment Terms if mentioned.

    OUTPUT FORMAT:
    - Return ONLY valid JSON matching the schema.
    - No Markdown formatting.
  `;

  try {
    const parts: any[] = [];
    
    let promptText = `USER REQUEST:\n"""${text}"""\n\nProject Name Context: ${projectName || "N/A"}\n`;
    
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
    
    // Map response back to strict LineItem type
    const items: LineItem[] = (parsedData.line_items || []).map((li: any, idx: number) => {
        // Try to preserve ID if returned, else generate new
        const id = li.item_id || `L${Date.now()}-${idx}`;
        
        return {
            item_id: id,
            line: idx + 1, // Re-index lines sequentially
            raw_description: li.description || "",
            description: li.description || "",
            product_category: null,
            product_type: li.product_type || inferShape(li.description), // Fallback shape inference
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
        project_name: parsedData.project_name,
        commercial: {
            destination: parsedData.commercial?.destination || "",
            incoterm: parsedData.commercial?.incoterm || "",
            paymentTerm: parsedData.commercial?.payment_terms || "",
            otherRequirements: parsedData.commercial?.other_requirements || "",
            req_mtr: false, // Defaults
            req_avl: false,
            req_tpi: false,
            warranty_months: 12
        },
        line_items: items
    };

  } catch (error) {
    console.error("Gemini Parse Error:", error);
    // Return empty structure on error to prevent app crash
    return { line_items: [] }; 
  }
};

export const clarifyRequest = async (rfq: Rfq, userMessage: string, lang: Language = 'en'): Promise<string> => {
    const targetLang = getLanguageName(lang);
    const systemInstruction = `
    You are Crontal's RFQ assistant.
    Goal: Confirm the user's action (edit/delete/add) and summarize the current state.
    
    CRITICAL: Output MUST be in ${targetLang}.
    
    Input Context: The table has ALREADY been updated. Just confirm the result.
    Example: "I've added 3 items and updated the material to SS316."
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
      contents: `Project: ${rfq.project_name}. Items: ${rfq.line_items.length}. Descs: ${rfq.line_items.slice(0,5).map(i=>i.description).join('; ')}`,
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
