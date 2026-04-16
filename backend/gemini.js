import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const schema = {
  type: Type.OBJECT,
  properties: {
    overallRiskScore: { type: Type.NUMBER },
    complianceStatus: { type: Type.STRING },
    issues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          clause: { type: Type.STRING },
          status: { type: Type.STRING },
          description: { type: Type.STRING },
          recommendation: { type: Type.STRING },
        },
      },
    },
  },
};

export const analyzeWithGemini = async (text) => {
  // if the API client wasn't initialized we treat it as a missing key
  if (!ai) {
    console.warn("Gemini client not configured - using fallback analysis.");
    return {
      overallRiskScore: 55,
      complianceStatus: "Review Needed",
      issues: [
        {
          clause: "Data Retention",
          status: "Risk",
          description: "Gemini API key is not configured in backend environment.",
          recommendation: "Set GEMINI_API_KEY and rerun analysis.",
        },
      ],
      meta: {
        source: "fallback",
        reason: "GEMINI_API_KEY missing",
      },
    };
  }

  // safeguard against obvious placeholder values
  if (apiKey.toLowerCase().includes("your_gemini_api_key")) {
    console.warn("Gemini API key appears to be a placeholder - using fallback analysis.");
    return {
      overallRiskScore: 55,
      complianceStatus: "Review Needed",
      issues: [
        {
          clause: "Data Retention",
          status: "Risk",
          description: "Gemini API key looks like a placeholder string.",
          recommendation: "Replace GEMINI_API_KEY with a real key or leave it empty to use fallback.",
        },
      ],
      meta: {
        source: "fallback",
        reason: "GEMINI_API_KEY placeholder",
      },
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze the following contract text for regulatory compliance (GDPR, HIPAA, SOC2). 
Identify missing clauses, risky clauses, and practical recommendations.
Return strict JSON.

Contract Text:
${String(text || "").slice(0, 12000)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return {
      overallRiskScore:
        typeof parsed.overallRiskScore === "number" ? parsed.overallRiskScore : null,
      complianceStatus: parsed.complianceStatus || "Unknown",
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      meta: {
        source: "gemini",
        model: "gemini-2.5-flash",
      },
    };
  } catch (err) {
    console.error("Gemini API call failed:", err);
    // fall back to a simple placeholder result rather than throwing
    return {
      overallRiskScore: 50,
      complianceStatus: "Review Needed",
      issues: [
        {
          clause: "API Error",
          status: "Risk",
          description: "Error calling Gemini API - see server logs for details.",
          recommendation: "Check your GEMINI_API_KEY or network connectivity.",
        },
      ],
      meta: {
        source: "fallback",
        reason: "gemini_call_error",
      },
    };
  }
};
