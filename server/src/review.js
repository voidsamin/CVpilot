import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "./prompt.js";
import { reviewJsonSchema, ReviewZ } from "./schema.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = process.env.GEMINI_MODEL;

function buildUserContent({ docType, docText, jobText }) {
    let out = `<document type="${docType}">\n${docText}\n</document>`;
    if (jobText && jobText.trim()) {
        out += `\n\n<job_post>\n${jobText}\n</job_post>`;
    }
    return out;
}

export async function generateReview(input) {
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
    const raw = JSON.parse(response.text);
    return ReviewZ.parse(raw); // throws if the shape is wrong
}