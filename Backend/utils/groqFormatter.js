const { OpenAI } = require("openai");

// Initialize client only if key is present to prevent OpenAI library from throwing on startup
const getGroqClient = () => {
    const apiKey = process.env.GROQ_API_KEY || "placeholder_for_startup";
    return new OpenAI({
        apiKey: apiKey,
        baseURL: "https://api.groq.com/openai/v1"
    });
};

const groq = getGroqClient();

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/**
 * Formats an array of evidence objects into a patient-friendly summary using Groq.
 */
async function formatEvidenceWithGroq(evidence) {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY missing");
    }

    if (!Array.isArray(evidence) || evidence.length === 0) {
        return "No specific evidence provided for formatting.";
    }

    const allEvidenceText = evidence.map(e => e.text).join("\n\n---\n\n");

    const prompt = `
    You are an expert medical AI assistant. You will be provided with raw clinical evidence from various sources.
    Your task is to synthesize this evidence into a concise, patient-friendly summary.

    CRITICAL INSTRUCTION: Start directly with the summary content. Do NOT include any introductory or conversational phrases. Output ONLY the clinical facts formatted with Markdown.

    Focus on explaining the key findings and their implications in simple, clear language.
    Avoid quoting directly from the source material. Use bullet points and bold headers for clarity.

    Evidence:
    ${allEvidenceText}
    `;

    try {
        const response = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 4096
        });

        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error formatting evidence:", error);
        return "Clinical evidence is available in the detailed sources section below.";
    }
}

/**
 * Formats a dictionary of side effects into a human-readable summary using Groq.
 */
async function formatSideEffectsWithGroq(sideEffects, patientData) {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY missing");
    }

    const prompt = `
      Summarize these side effect risks for a patient:
      ${JSON.stringify(sideEffects)}
      Patient Info: ${JSON.stringify(patientData)}
      Output Markdown bullet points.
    `;

    try {
        const response = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.4
        });
        return response.choices[0].message.content.trim();
    } catch (error) {
        return "Standard side effect profiles apply based on the protocol.";
    }
}

/**
 * Generates a 12-week clinical pathway timeline.
 */
async function generatePathwayWithGroq(plan) {
    if (!process.env.GROQ_API_KEY) return [];

    const prompt = `
    Create a 12-week timeline for this treatment: ${plan.recommendedProtocol}.
    Return a JSON object with a "pathway" key containing an array of 12 objects.
    Each object: {"title": string, "duration": "Week X", "description": string, "details": string[], "marker": string (emoji)}.
    `;

    try {
        const response = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" }
        });

        const parsed = JSON.parse(response.choices[0].message.content);
        return parsed.pathway || [];
    } catch (error) {
        return [];
    }
}

/**
 * Generates a personalized awareness plan as a structured dictionary for the React tab.
 */
async function generateAwarenessWithGroq(patientData) {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY missing");
    }

    const clinicalSummary = `
      - Diagnosis: ${patientData.diagnosis}
      - Cancer Type: ${patientData.cancerType}
      - KPS: ${patientData.kps}
      - Symptoms: ${Array.isArray(patientData.symptoms) ? patientData.symptoms.join(', ') : 'None'}
      - Comorbidities: ${Array.isArray(patientData.comorbidities) ? patientData.comorbidities.join(', ') : 'None'}
    `;

    const prompt = `
    Generate a personalized oncology awareness plan for this patient.
    Return ONLY a strict JSON object with EXACTLY the following 6 keys:
    "nutrition", "physical_activity", "sleep_rest", "mental_health", "medication_compliance", "red_flags".

    Each of those 6 keys must contain an object with these exact properties:
    {
      "priority": String (Must be exactly one of: "CRITICAL", "IMPORTANT", "ROUTINE"),
      "personalisation_reason": String (Brief plain English explanation of why this matters for this specific patient. NO JARGON. E.g. "Because your treatments can cause fatigue...", not "Secondary to KPS 60 and IDH1..."),
      "recommendations": Array of Strings (3-4 specific, actionable daily tips in plain English)
    }

    Patient Clinical Profile:
    ${clinicalSummary}
    `;

    try {
        const response = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const parsed = JSON.parse(response.choices[0].message.content);
        return parsed;
        
    } catch (error) {
        console.error("Error generating awareness with Groq:", error);
        throw error;
    }
}

module.exports = { 
    formatEvidenceWithGroq, 
    formatSideEffectsWithGroq, 
    generatePathwayWithGroq,
    generateAwarenessWithGroq
};
