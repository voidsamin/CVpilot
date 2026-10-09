import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "./prompt.js";
import { reviewJsonSchema, ReviewZ } from "./schema.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODELS = [process.env.GEMINI_MODEL, process.env.GEMINI_FALLBACK_MODEL].filter(Boolean);
if (MODELS.length === 0) throw new Error("Set GEMINI_MODEL in server/.env");

const RETRYABLE = [429, 500, 503, 504];
const TIMEOUT_MS = 30000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Rejects with a 504 if one attempt takes longer than TIMEOUT_MS.
// 504 is in RETRYABLE, so a timeout triggers a retry, then the next model.
function withTimeout(p) {
    let timer;
    const timeout = new Promise((_, rej) => {
        timer = setTimeout(
            () => rej(Object.assign(new Error("timeout"), { status: 504 })),
            TIMEOUT_MS
        );
    });
    return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

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
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const result = await withTimeout(run(model));
                console.log(`[llm] answered by ${model}, attempt ${attempt + 1}`);
                return result;
            } catch (err) {
                lastErr = err;
                const s = statusOf(err);
                console.log(`[llm] ${model} attempt ${attempt + 1} failed: status=${s ?? "n/a"}`);
                if (!RETRYABLE.includes(s)) throw err;
                if (s === 429) break; // quota: retrying the same model won't help, try the next one
                await sleep(500 * 2 ** attempt);
            }
        }
    }
    throw lastErr;
}

// Removes example text ("e.g., ...", "such as ...") from inside brackets.
const stripExamples = (s) =>
    s.replace(
        /\[([^\]]*?)[,;]?\s*(?:e\.g\.|such as|for example)[^\]]*\]/gi,
        (_, a) => `[${a.trim() || "add details"}]`
    );

const LAYOUT_RE = /\b(layout|formatting|formatted|visually|structure|organized|organised|easy to read|easy to scan|concise|clean|clear and)\b/i;

function dropLayoutStrengths(strengths) {
    const kept = strengths.filter((s) => !LAYOUT_RE.test(s));
    return kept.length ? kept : strengths.slice(0, 1); // schema needs at least 1
}

function cleanReview(r) {
    return {
        ...r,
        strengths: dropLayoutStrengths(r.strengths),
        rewrites: r.rewrites.map((w) => ({
            ...w,
            conservative: stripExamples(w.conservative),
            stronger: stripExamples(w.stronger),
        })),
    };
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
            thinkingConfig: { thinkingLevel: "low" },
        },
    });
    const raw = response.text;
    try {
        return cleanReview(ReviewZ.parse(JSON.parse(raw)));
    } catch (err) {
        err.raw = raw; // for the test runner only. Never log this.
        throw err;
    }
}

const isInvalid = (err) => err?.name === "ZodError" || err?.name === "SyntaxError";

// export async function generateReview(input) {
//     try {
//         return await withFallback((model) => callReview(model, input));
//     } catch (err) {
//         if (!isInvalid(err)) throw err;
//         const where =
//             err.name === "ZodError"
//                 ? err.issues.map((i) => i.path.join(".") + ":" + i.code).join("; ")
//                 : "unparseable JSON";
//         console.log(`[review] invalid output, retrying once: ${where}`);
//         return withFallback((model) => callReview(model, input));
//     }
// }

export async function generateReview(input) {
    try {
        return await withFallback((model) => callReview(model, input));
    } catch (err) {
        if (!isInvalid(err)) throw err;
        console.log("[review] invalid output, retrying once");
        return await callReview(MODELS[0], input); // one direct call, no retry loop
    }
}