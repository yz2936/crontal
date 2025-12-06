// services/geminiService.ts
// NOTE: this file is now DeepSeek-based. We keep the filename so the rest of your app doesn't break.

import { Rfq, LineItem, FileAttachment, Language } from "../types";

/**
 * DeepSeek Chat API config
 * Docs: https://api-docs.deepseek.com
 */
const DEEPSEEK_API_KEY =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_DEEPSEEK_API_KEY) ||
  (typeof process !== "undefined" && (process as any).env?.DEEPSEEK_API_KEY) ||
  "";

const DEEPSEEK_MODEL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_DEEPSEEK_MODEL) ||
  "deepseek-chat";

const DEEPSEEK_BASE_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_DEEPSEEK_BASE_URL) ||
  "https://api.deepseek.com";

/* ---------------- Types you already export ---------------- */

export interface RiskAnalysisItem {
  category: "Technical" | "Commercial" | "Strategic";
  risk: string;
  recommendation: string;
  impact_level: "High" | "Medium" | "Low";
}

export interface InsightSource {
  title: string;
  uri: string;
}

export interface InsightResponse {
  content: string;
  sources: InsightSource[];
}

export interface TrendingTopic {
  title: string;
  subtitle: string;
  tag: string;
  impact: "High" | "Medium" | "Low";
}

export interface MarketDataResponse {
  nickel: number;
  moly: number;
  chrome: number;
  steel: number;
  oil: number;
  copper: number;
  aluminum: number;
  zinc: number;
  lead: number;
  tin: number;
  last_updated: string;
  isFallback?: boolean;
}

/* ---------------- Small helpers ---------------- */

const getLanguageName = (lang: Language): string => {
  switch (lang) {
    case "zh":
      return "Simplified Chinese (简体中文)";
    case "es":
      return "Spanish (Español)";
    default:
      return "English";
  }
};

// Extract JSON from a possibly chatty response
const cleanJson = (text: string): string => {
  if (!text) return "";

  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    text = codeBlockMatch[1];
  }

  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  let start = -1;

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    start = firstBracket;
  } else if (firstBrace !== -1) {
    start = firstBrace;
  }

  if (start === -1) return text.trim();

  let end = -1;
  if (text[start] === "[") {
    end = text.lastIndexOf("]");
  } else {
    end = text.lastIndexOf("}");
  }

  if (end !== -1 && end >= start) {
    return text.substring(start, end + 1);
  }

  return text.trim();
};

// Very rough shape inference
const inferShape = (desc: string): string => {
  if (!desc) return "";
  const d = desc.toLowerCase();
  if (d.includes("pipe") || d.includes("tube")) return "Pipe";
  if (d.includes("flange") || d.includes("wn") || d.includes("blind") || d.includes("slip-on"))
    return "Flange";
  if (d.includes("elbow") || d.includes("tee") || d.includes("reducer") || d.includes("cap"))
    return "Fitting";
  if (d.includes("valve") || d.includes("ball") || d.includes("gate") || d.includes("check"))
    return "Valve";
  if (d.includes("gasket")) return "Gasket";
  if (d.includes("bolt") || d.includes("stud")) return "Bolt";
  if (d.includes("plate") || d.includes("sheet")) return "Plate";
  return "Other";
};

/* ---------------- Core DeepSeek call helper ---------------- */

interface DeepSeekChatOptions {
  system: string;
  user: string;
  responseFormat?: "json_object" | "text";
}

const callDeepSeek = async ({ system, user, responseFormat = "text" }: DeepSeekChatOptions) => {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("Missing DeepSeek API key. Set VITE_DEEPSEEK_API_KEY or DEEPSEEK_API_KEY");
  }

  const body: any = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    stream: false,
  };

  if (responseFormat === "json_object") {
    // OpenAI-compatible JSON mode
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`DeepSeek error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const message = data?.choices?.[0]?.message?.content ?? "";
  return typeof message === "string" ? message : JSON.stringify(message);
};

/* ---------------- parseRequest (main RFQ parser) ---------------- */

export const parseRequest = async (
  text: string,
  projectName: string | null,
  files?: FileAttachment[],
  lang: Language = "en",
  currentLineItems: LineItem[] = []
): Promise<{ rfqUpdates: Partial<Rfq>; responseText: string }> => {
  const isEditMode = currentLineItems.length > 0;
  const targetLang = getLanguageName(lang);

  const systemInstruction = `
You are Crontal's expert procurement AI. Your role is to interact naturally with the buyer AND extract/modify structured RFQ data.

MODE: ${isEditMode ? "EDITING EXISTING LIST" : "CREATING NEW LIST"}
TARGET LANGUAGE FOR TEXT FIELDS & RESPONSE: ${targetLang}

You MUST output a single valid JSON object matching this TypeScript-like schema, no extra keys, no explanations:

{
  "conversational_response": string,
  "project_name": string | null,
  "commercial": {
    "destination": string | null,
    "incoterm": string | null,
    "payment_terms": string | null,
    "other_requirements": string | null
  },
  "line_items": Array<{
    "item_id": string | null,
    "description": string,
    "product_type": string | null,
    "material_grade": string | null,
    "tolerance": string | null,
    "test_reqs": string[] | null,
    "size": {
      "od_val": number | null,
      "od_unit": string | null,
      "wt_val": number | null,
      "wt_unit": string | null,
      "len_val": number | null,
      "len_unit": string | null
    },
    "quantity": number | null,
    "uom": string | null
  }>
}

RULES:
- "conversational_response" must be in ${targetLang}.
- If you are editing an existing list, always return the FULL updated list of line_items (adds/changes/deletes applied), not just deltas.
- If information is missing, leave fields null but ask the user for the missing data in "conversational_response".
`;

  // NOTE: DeepSeek's public chat API is text-first. We're ignoring binary file contents here.
  // If you depend on heavy PDF/image parsing, this really belongs in a backend with a multimodal model.
  let promptText = `USER REQUEST:\n"""${text}"""\n\nRFP Name Context: ${
    projectName || "N/A"
  }\n`;

  if (isEditMode) {
    const cleanList = currentLineItems.map((item) => ({
      line: item.line,
      item_id: item.item_id,
      description: item.description,
      qty: item.quantity,
      grade: item.material_grade,
    }));
    promptText += `\n[CURRENT LINE ITEMS DATA]:\n${JSON.stringify(cleanList, null, 2)}\n`;
  }

  if (files && files.length > 0) {
    promptText += `\nNOTE: The user also uploaded ${files.length} attachment(s) with technical details. 
You do NOT see the raw file content here, but assume they are standard RFQ/supporting documents (spec sheets, MTOs, etc.). 
Infer what you can from the text; if something is only in the files, explicitly ask the user to paste that section.\n`;
  }

  try {
    const raw = await callDeepSeek({
      system: systemInstruction,
      user: promptText,
      responseFormat: "json_object",
    });

    const cleanText = cleanJson(raw || "{}");
    let parsedData: any;
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
          length: { value: li.size?.len_val, unit: li.size?.len_unit },
        },
        quantity: li.quantity,
        uom: li.uom,
        delivery_location: null,
        required_delivery_date: null,
        incoterm: null,
        payment_terms: null,
        other_requirements: [],
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
          warranty_months: 12,
        },
        line_items: items,
      },
      responseText:
        parsedData.conversational_response ||
        (lang === "zh" ? "已处理您的请求。" : "Request processed."),
    };
  } catch (error) {
    console.error("DeepSeek Parse Error:", error);
    return {
      rfqUpdates: { line_items: [] },
      responseText:
        lang === "zh"
          ? "处理您的请求时出现错误，请稍后重试。"
          : "I encountered an error processing that request.",
    };
  }
};

/* ---------------- Other functions, now via DeepSeek ---------------- */

export const analyzeRfqRisks = async (rfq: Rfq, lang: Language = "en"): Promise<RiskAnalysisItem[]> => {
  const targetLang = getLanguageName(lang);
  const systemInstruction = `
You are a Senior Procurement Risk Officer. Audit this RFQ for weaknesses that could cause ambiguity, wrong quotes, manufacturing errors, or commercial disputes.

Return ONLY a JSON array of objects:
[{ "category": "Technical" | "Commercial" | "Strategic", "risk": string, "recommendation": string, "impact_level": "High" | "Medium" | "Low" }]

Language of "risk" and "recommendation": ${targetLang}.
`;

  const rfqContext = {
    project: rfq.project_name,
    description: rfq.project_description,
    commercial: rfq.commercial,
    items: rfq.line_items.map((i) => ({
      line: i.line,
      desc: i.description,
      grade: i.material_grade || "MISSING",
      qty: i.quantity,
      type: i.product_type,
    })),
  };

  try {
    const raw = await callDeepSeek({
      system: systemInstruction,
      user: JSON.stringify(rfqContext),
      responseFormat: "json_object",
    });

    const clean = cleanJson(raw || "[]");
    const parsed: RiskAnalysisItem[] = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Risk Analysis Error", e);
    return [
      {
        category: "Technical",
        risk: "AI Analysis Failed",
        recommendation: "Please review specs manually. The AI service encountered an error.",
        impact_level: "Low",
      },
    ];
  }
};

export const clarifyRequest = async (
  rfq: Rfq,
  userMessage: string,
  lang: Language = "en"
): Promise<string> => {
  const targetLang = getLanguageName(lang);
  const systemInstruction = `
You are Crontal's RFQ assistant.
Goal: Confirm the user's action and summarize the current RFQ state in ${targetLang}.
Keep it under 60 words.
`;

  try {
    const raw = await callDeepSeek({
      system: systemInstruction,
      user: `User said: "${userMessage}". RFQ now has ${rfq.line_items.length} items.`,
      responseFormat: "text",
    });
    return raw.trim();
  } catch {
    return lang === "zh" ? "表格已更新。" : "Table updated.";
  }
};

export const generateRfqSummary = async (rfq: Rfq, lang: Language = "en"): Promise<string> => {
  const targetLang = getLanguageName(lang);
  const systemInstruction = `
Role: Procurement Manager.
Task: Write an Executive Summary for Suppliers.
Language: ${targetLang}.
Length: <80 words.
Focus: Project scale, key materials, urgency.
`;

  try {
    const user = `RFP Name: ${rfq.project_name}. Items: ${
      rfq.line_items.length
    }. Descs: ${rfq.line_items.slice(0, 5).map((i) => i.description).join("; ")}`;
    const raw = await callDeepSeek({ system: systemInstruction, user, responseFormat: "text" });
    return raw.trim();
  } catch {
    return "";
  }
};

export const auditRfqSpecs = async (rfq: Rfq, lang: Language = "en"): Promise<string[]> => {
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
    const raw = await callDeepSeek({
      system: systemInstruction,
      user: JSON.stringify(rfq.line_items),
      responseFormat: "json_object",
    });
    const clean = cleanJson(raw || "[]");
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Image editing: DeepSeek's main chat API doesn't give you Gemini-style image editing.
 * This is now a NO-OP placeholder. If you truly need this, you should integrate DeepSeek Image
 * (separate product) or another image model on the backend.
 */
export const editImage = async (
  _base64Image: string,
  _mimeType: string,
  _prompt: string
): Promise<string | null> => {
  console.warn("editImage is not implemented for DeepSeek in this frontend-only setup.");
  return null;
};

export const getTrendingTopics = async (category: string): Promise<TrendingTopic[]> => {
  const systemInstruction = `
You are an industrial news curator for the Stainless Steel, Piping, and EPC sectors.

TASK:
Generate 4 realistic, up-to-date sounding topics for category "${category}".
They should look like actionable intelligence items for a procurement manager.

Return ONLY a JSON array:
[
  { "title": string, "subtitle": string, "tag": string, "impact": "High" | "Medium" | "Low" },
  ...
]
`;

  try {
    const raw = await callDeepSeek({
      system: systemInstruction,
      user: `Generate 4 trending topics for "${category}".`,
      responseFormat: "json_object",
    });
    const clean = cleanJson(raw || "[]");
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) throw new Error("Not array");
    return parsed;
  } catch (e) {
    console.error("News Fetch Error", e);
    return [
      {
        title: "Market Volatility Alert",
        subtitle: "Unable to fetch specific news. General caution advised.",
        tag: "System",
        impact: "Low",
      },
    ];
  }
};

export const getLatestMarketData = async (): Promise<MarketDataResponse | null> => {
  const systemInstruction = `
You are a financial data assistant.
Return APPROXIMATE current market prices for the following commodities.
If you don't know the exact latest prices, give reasonable recent estimates and say so in "last_updated".

Output a single JSON object with this exact structure:
{
  "nickel": number,
  "moly": number,
  "chrome": number,
  "steel": number,
  "oil": number,
  "copper": number,
  "aluminum": number,
  "zinc": number,
  "lead": number,
  "tin": number,
  "last_updated": "YYYY-MM-DD"
}
`;

  try {
    const raw = await callDeepSeek({
      system: systemInstruction,
      user:
        "Get approximate recent prices for: LME Nickel USD/Ton, Molybdenum USD/lb, Ferrochrome USD/lb, US HRC Steel USD/ST, Brent Crude USD/bbl, LME Copper, LME Aluminum, LME Zinc, LME Lead, LME Tin.",
      responseFormat: "json_object",
    });
    const clean = cleanJson(raw || "{}");
    const data = JSON.parse(clean);
    data.isFallback = false;
    return data;
  } catch (e) {
    console.error("Market Data Fetch Error", e);
    return {
      nickel: 16200,
      moly: 42,
      chrome: 1.45,
      steel: 820,
      oil: 78,
      copper: 8900,
      aluminum: 2200,
      zinc: 2400,
      lead: 2100,
      tin: 26000,
      last_updated: new Date().toISOString().slice(0, 10),
      isFallback: true,
    };
  }
};

export const generateIndustryInsights = async (
  category: string,
  query: string
): Promise<InsightResponse> => {
  const systemInstruction = `
You are a Senior Industrial Analyst for stainless steel, heavy piping, and EPC.

OUTPUT FORMAT (Markdown string, NOT JSON):
## 1. Executive Summary
...

## 2. Key Developments
- ...
- ...

## 3. Market Impact
- **Pricing:** ...
- **Lead Times:** ...

## 4. Strategic Advice for Procurement Managers
- ...
`;

  try {
    const raw = await callDeepSeek({
      system: systemInstruction,
      user: `Generate insights for category "${category}" with specific focus "${query || "General Market Overview"}".`,
      responseFormat: "text",
    });

    // We no longer have grounded web sources like Gemini+GoogleSearch.
    // For now, just return empty sources and the narrative.
    return {
      content: raw || "Unable to generate insights at this time.",
      sources: [],
    };
  } catch (e) {
    console.error("Industry Insights Error", e);
    return { content: "Service unavailable. Please try again later.", sources: [] };
  }
};
