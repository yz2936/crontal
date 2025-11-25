
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
    You are Crontal's expert procurement AI. Your role is to extract or modify structured RFQ data.

    MODE: ${isEditMode ? "EDITING EXISTING LIST" : "CREATING NEW LIST"}
    TARGET LANGUAGE FOR TEXT FIELDS: ${targetLang}

    YOUR TASKS:
    1. Analyze the text input and any files.
    2. ${isEditMode 
        ? `CRITICAL INSTRUCTION FOR EDITING:
           - You have been provided a list of [CURRENT LINE ITEMS].
           - Your goal is to RETURN THE FULL LIST including both unchanged items and modified/new items.
           - IF user says "Delete line X" or "Remove item X": Exclude it from the returned list.
           - IF user says "Change quantity/grade/size...": Update the specific item in the list.
           - IF user provides new specs: Append them as NEW items to the list.
           - DO NOT return only the new items. You must merge them with the existing list.
           - Preserve existing item_ids for unchanged items.` 
        : `Extract all line items from scratch.`}
    
    3. DIMENSION HANDLING:
       - You MUST split dimensions into: 
         * OD (Outer Diameter)
         * WT (Wall Thickness)
         * Length
       - Normalize units to: 'mm', 'm', 'in', 'ft', 'pcs'.
    
    4. DEEP SPECIFICATION EXTRACTION:
       - Extract **Tolerances** (e.g., "+/- 12.5%", "Min Wall").
       - Extract **Testing Requirements** (e.g., "HIC", "SSC", "Impact Test @ -50C", "Ultrasonic Test").
    
    5. COMMERCIAL TERMS:
       - Extract Destination, Incoterm, Payment Terms if mentioned.

    OUTPUT FORMAT:
    - Return ONLY valid JSON matching the schema.
    - If inferring description text or project names, write them in ${targetLang} unless the technical spec requires English.
  `;

  try {
    const parts: any[] = [];
    
    let promptText = `USER REQUEST:\n"""${text}"""\n\nProject Name Context: ${projectName || "N/A"}\n`;
    
    if (isEditMode) {
        const cleanList = currentLineItems.map(({line, raw_description, ...rest}) => rest);
        promptText += `\n\n[CURRENT LINE ITEMS DATA - APPLY CHANGES TO THIS LIST]:\n${JSON.stringify(cleanList, null, 2)}\n`;
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
                  item_id: { type: Type.STRING },
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

    const parsedData = JSON.parse(response.text || "{}");
    
    const items: LineItem[] = (parsedData.line_items || []).map((li: any, idx: number) => {
        return {
            item_id: li.item_id || `L${Date.now()}-${idx}`,
            line: idx + 1,
            raw_description: li.description || "",
            description: li.description || "",
            grade: li.material_grade || "",
            product_type: li.product_type,
            material_grade: li.material_grade,
            tolerance: li.tolerance,
            test_reqs: li.test_reqs || [],
            standard_or_spec: "",
            delivery_location: "",
            required_delivery_date: "",
            incoterm: "",
            payment_terms: "",
            size: {
                outer_diameter: { value: li.size?.od_val, unit: li.size?.od_unit },
                wall_thickness: { value: li.size?.wt_val, unit: li.size?.wt_unit },
                length: { value: li.size?.len_val, unit: li.size?.len_unit }
            },
            quantity: li.quantity,
            uom: li.uom,
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
            req_mtr: false,
            req_avl: false,
            req_tpi: false,
            warranty_months: 12
        },
        line_items: items
    };

  } catch (error) {
    console.error("Gemini Parse Error:", error);
    throw new Error("Failed to parse request");
  }
};

export const clarifyRequest = async (rfq: Rfq, userMessage: string, lang: Language = 'en'): Promise<string> => {
    const targetLang = getLanguageName(lang);
    const systemInstruction = `
    You are Crontal's RFQ assistant.
    Goal: Confirm the user's action (edit/delete/add) and summarize the current state of the RFQ.
    
    Input Context: The table has ALREADY been updated by the parsing engine.
    
    CRITICAL INSTRUCTION: You MUST write your response in ${targetLang}.
    
    Example (English): "I've removed line 3 as requested."
    Example (Chinese): "我已经按要求删除了第3行。"
    
    Keep it short and professional.
    `;

    const rfqSummary = JSON.stringify({
        item_count: rfq.line_items.length,
        items_sample: rfq.line_items.slice(0, 3).map(i => `${i.quantity} ${i.uom} ${i.description}`)
    });

    try {
        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: `Updated RFQ State: ${rfqSummary}\n\nUser Action: ${userMessage}`,
            config: { systemInstruction }
        });
        return response.text || (lang === 'zh' ? "表格已更新，请查看详情。" : "I've updated the table. Please review the details.");
    } catch (e) {
        return lang === 'zh' ? "已处理您的请求，请查看右侧表格。" : "I've processed your request. Please check the table on the right.";
    }
}

export const generateRfqSummary = async (rfq: Rfq, lang: Language = 'en'): Promise<string> => {
  const targetLang = getLanguageName(lang);
  const systemInstruction = `
    You are an expert Procurement Manager.
    Your task is to write a concise, professional Executive Summary for an RFQ (Request for Quotation) that will be sent to suppliers.
    
    Inputs:
    - Project Name: ${rfq.project_name}
    - Project Description: ${rfq.project_description || "Not provided"}
    - Line Items: ${rfq.line_items.length} items
    - Key Materials: ${Array.from(new Set(rfq.line_items.map(i => i.material_grade))).join(', ')}
    
    Requirements:
    - Language: ${targetLang} (Strictly output in this language)
    - Length: Under 80 words.
    - Tone: Professional, Urgent, Clear.
    - Content: Summarize what is being bought, the scale of the project, and the urgency. Do NOT list every single item. Focus on the "Big Picture" for the supplier.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: "Generate executive summary.",
      config: { 
        systemInstruction,
        maxOutputTokens: 200,
        temperature: 0.7 
      }
    });
    return response.text || "";
  } catch (e) {
    console.error("Summary Generation Error", e);
    return "";
  }
};

export const auditRfqSpecs = async (rfq: Rfq, lang: Language = 'en'): Promise<string[]> => {
    const targetLang = getLanguageName(lang);
    const systemInstruction = `
      You are an expert EPC Quality Assurance (QA) Engineer.
      Your job is to audit an RFQ for missing specifications that could lead to procurement errors.
      
      Look for:
      1. Pipes missing Schedule (Wall Thickness) or Material Grade.
      2. Flanges missing Pressure Class (e.g., #150, #300) or Facing (RF, RTJ).
      3. Valves missing Trim details or Pressure ratings.
      4. Ambiguous descriptions (e.g., just "Pipe 4 inch" without standard).
      
      Inputs:
      ${JSON.stringify(rfq.line_items)}

      Output:
      Return a JSON array of strings. Each string is a warning message referencing the Line Number.
      The warning messages MUST be in ${targetLang}.
      
      Example (English): "Line 1: Missing Schedule (WT)."
      Example (Chinese): "第1行：缺少壁厚（Schedule）。"
      
      If perfect, return empty array [].
    `;
  
    try {
      const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: "Audit these specs.",
        config: { 
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      const parsed = JSON.parse(response.text || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Audit Error", e);
      return [];
    }
  };
