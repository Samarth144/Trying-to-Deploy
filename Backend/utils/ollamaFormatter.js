const axios = require('axios');

/**
 * Formats a list of clinical evidence using a local Ollama-based Gemma service via the AI Engine.
 * @param {Array<Object>} evidenceList - An array of evidence objects, each with a 'source' and 'text'.
 * @returns {Promise<string>} A formatted string summarizing the evidence.
 */
async function formatEvidenceWithOllama(evidenceList) {
    if (!evidenceList || evidenceList.length === 0) {
        return "No evidence provided to format.";
    }

    const endpoint = process.env.OLLAMA_AI_ENGINE_ENDPOINT || 'http://127.0.0.1:5000/format';

    const payload = {
        prompt: `
            You are a clinical assistant AI. Your task is to synthesize and format medical evidence into a clear, concise summary for an oncologist.
            
            CRITICAL INSTRUCTIONS:
            - Provide ONLY the formatted clinical synthesis.
            - DO NOT include any greetings, introductions, or closing statements.
            - DO NOT include any generic supportive language.
            - Start directly with the evidence synthesis.

            The following is a list of evidence snippets from various sources (e.g., NCCN guidelines, clinical trial results).
            Please format this information into a structured summary. Use markdown for formatting, such as bolding for headers and bullet points for lists.

            Do not simply list the evidence. Synthesize it. Group related findings, highlight key takeaways, and present it in a logical order.

            Here is the evidence to format:
            ${evidenceList.map(e => `
--- ${e.source} ---
${e.text}`).join('')}
        `
    };

    const config = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    try {
        console.log(`[Ollama] Initiating evidence formatting via AI Engine at ${endpoint}...`);
        const response = await axios.post(endpoint, payload, config);
        console.log(`[Ollama] Evidence formatting complete.`);
        return response.data.formattedText || JSON.stringify(response.data, null, 2);
    } catch (error) {
        console.error("[Ollama] Error formatting evidence:", error.message);
        return `Error: Could not connect to the formatting service at ${endpoint}.`;
    }
}

async function formatSideEffectsWithOllama(sideEffects, patientData) {
    if (!sideEffects) {
        return "No side effects provided to format.";
    }

    const endpoint = process.env.OLLAMA_AI_ENGINE_ENDPOINT || 'http://127.0.0.1:5000/format';

    const payload = {
        prompt: `
            You are a clinical assistant AI specializing in oncology. Your task is to provide a strictly factual, patient-friendly summary of potential side effects for a given treatment plan.
            
            CRITICAL INSTRUCTIONS:
            - Provide ONLY the formatted side effects information.
            - DO NOT include any greetings (e.g., "Hi Robert").
            - DO NOT include any introductory sentences explaining your role.
            - DO NOT include any signatures or closing statements (e.g., "Take care", "Your Clinical Assistant").
            - DO NOT include generic supportive phrases like "Your care team is here to support you".
            - Start directly with the first category of side effects.

            PATIENT CONTEXT:
            - Cancer Type: ${patientData.cancer_type}
            - Key Biomarkers: ${JSON.stringify(patientData, null, 2)}

            POTENTIAL SIDE EFFECTS (from AI engine):
            ${JSON.stringify(sideEffects, null, 2)}

            Please format this information into a clear and easy-to-understand summary. Use markdown for formatting. Group the side effects by category (e.g., "Common & Manageable", "Less Common, More Serious"). For each side effect, provide a brief, simple explanation and what to watch for.
        `
    };

    const config = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    try {
        console.log(`[Ollama] Initiating side effects formatting via AI Engine at ${endpoint}...`);
        const response = await axios.post(endpoint, payload, config);
        console.log(`[Ollama] Side effects formatting complete.`);
        return response.data.formattedText || JSON.stringify(response.data, null, 2);
    } catch (error) {
        console.error("[Ollama] Error formatting side effects:", error.message);
        return `Error: Could not connect to the formatting service at ${endpoint}.`;
    }
}

async function generatePathwayWithOllama(plan) {
    const endpoint = process.env.OLLAMA_AI_ENGINE_ENDPOINT || 'http://127.0.0.1:5000/format';

    const prompt = `
        You are a clinical oncology coordinator. Generate a structured treatment pathway (timeline) based on this treatment plan:
        ${JSON.stringify(plan, null, 2)}

        CRITICAL INSTRUCTIONS:
        - Return ONLY a valid JSON array of objects.
        - DO NOT include any introductory or concluding text.
        - DO NOT include any conversational filler.

        Return a JSON array of objects. Each object must have:
        - "title": (Short phase name, e.g., "Induction")
        - "duration": (Timeframe, e.g., "Weeks 1-4")
        - "description": (One sentence summary)
        - "details": (Array of 2-3 specific clinical actions)
        - "marker": (A single emoji representing the phase)

        Return ONLY the JSON array.
    `;

    const payload = { prompt };

    const config = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    try {
        console.log(`[Ollama] Initiating pathway generation via AI Engine at ${endpoint}...`);
        const response = await axios.post(endpoint, payload, config);
        console.log(`[Ollama] Pathway generation complete.`);
        
        const text = response.data.formattedText;
        const jsonMatch = text.match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    } catch (error) {
        console.error("[Ollama] Error generating pathway:", error.message);
        return null;
    }
}

module.exports = { 
    formatEvidenceWithOllama, 
    formatSideEffectsWithOllama, 
    generatePathwayWithOllama 
};
