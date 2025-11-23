import { GoogleGenAI, Type } from "@google/genai";
import { Rfq, LineItem, FileAttachment, Language } from "../types";

// Initialize Gemini Client
// In a real deployment, this runs on a server or edge function to protect the API key.
// For this client-side demo, we access the key from the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FAST = "gemini-2.5-flash";

export const parseRequest = async (
  text: string, 
  projectName: string | null, 
  files?: FileAttachment[], 
  lang: Language = 'en', 
  currentLineItems: LineItem[] = []
): Promise<Partial<Rfq>> => {
  
  const isEditMode = currentLineItems.length > 0;

  const systemInstruction = `
    You are Crontal's expert procurement AI. Your role is to extract or modify structured RFQ data.

    MODE: ${isEditMode ? "EDITING EXISTING LIST" : "CREATING NEW LIST"}

    YOUR TASKS:
    1. Analyze the text input and any files.
    2. ${isEditMode 
        ? `The user wants to MODIFY the "Current Line Items" provided.
           - IF user says "Delete line X" or "Remove item X": Exclude it from the returned list.
           - IF user says "Change quantity/grade/size...": Update the specific item.
           - IF user provides new specs: Append them as new items.
           - ALWAYS return the COMPLETE, valid list of items after applying changes.
           - Preserve existing IDs for unchanged items.` 
        : `Extract all line items from scratch.`}
    
    3. DIMENSION HANDLING:
       - You MUST split dimensions into: 
         * OD (Outer Diameter)
         * WT (Wall Thickness)
         * Length
       - Normalize units to: 'mm', 'm', 'in', 'ft', 'pcs'.
    
    4. COMMERCIAL TERMS:
       - Extract Destination, Incoterm, Payment Terms if mentioned.

    OUTPUT FORMAT:
    - Return ONLY valid JSON matching the schema.
    - If inferring text, use language: "${lang}".
  `;

  try {
    const parts: any[] = [];
    
    let promptText = `USER REQUEST:\n"""${text}"""\n\nProject Name Context: ${projectName || "N/A"}\n`;
    
    if (isEditMode) {
        promptText += `\n\n[CURRENT LINE ITEMS DATA - APPLY CHANGES TO THIS LIST]:\n${JSON.stringify(currentLineItems, null, 2)}\n`;
    }

    // Add text prompt
    parts.push({ text: promptText });

    // Add file parts
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
            otherRequirements: parsedData.commercial?.other_requirements || ""
        },
        line_items: items
    };

  } catch (error) {
    console.error("Gemini Parse Error:", error);
    throw new Error("Failed to parse request");
  }
};

export const clarifyRequest = async (rfq: Rfq, userMessage: string, lang: Language = 'en'): Promise<string> => {
    const systemInstruction = `
    You are Crontal's RFQ assistant.
    Goal: Confirm the user's action (edit/delete/add) and summarize the current state of the RFQ.
    
    Input Context: The table has ALREADY been updated by the parsing engine.
    Your job is just to generate a polite confirmation message in "${lang}".
    
    Example: "I've removed line 3 as requested." or "I've added the new specs."
    Keep it short.
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
        return response.text || "I've updated the table. Please review the details.";
    } catch (e) {
        return "I've processed your request. Please check the table on the right.";
    }
}