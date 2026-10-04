import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "./prompt.js";
import { reviewJsonSchema, ReviewZ } from "./schema.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELS = [process.env.GEMINI_MODEL, process.env.GEMINI_FALLBACK_MODEL].filter(Boolean);
const RETRYABLE = [429, 500, 503, 504];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildUserContent({ docType, docText, jobText }) {
    let out = `<document type="${docType}">\n${docText}\n</document>`;
    if (jobText && jobText.trim()) {
        out += `\n\n<job_post>\n${jobText}\n</job_post>`;
    }
    return out;
}

function statusOf(err) {
    if (err?.status) return err.status;
    const m = /"code":(\d+)/.exec(err?.message || "");
    return m ? Number(m[1]) : undefined;
}

export { ai };

export async function withFallback(run) {
    let lastErr;
    for (const model of MODELS) {
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const result = await run(model);
                console.log(`[llm] answered by ${model}, attempt ${attempt + 1}`);
                return result;
            } catch (err) {
                lastErr = err;
                if (!RETRYABLE.includes(statusOf(err))) throw err;
                await sleep(1000 * 2 ** attempt);
            }
        }
    }
    throw lastErr;
}

async function callReview(model, input) {
    const response = await ai.models.generateContent({
        model,
        contents: buildUserContent(input),
        config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseJsonSchema: reviewJsonSchema,
            temperature: 0.3,
        },
    });
    return ReviewZ.parse(JSON.parse(response.text));
}

export function generateReview(input) {
    return withFallback((model) => callReview(model, input));
}