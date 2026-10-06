import { z } from "zod";

export const ReviewZ = z.object({
    summary: z.string().min(1),
    strengths: z.array(z.string()).min(1),
    gaps: z
        .array(
            z.object({
                topic: z.string().min(1),
                why: z.string().min(1),
                jobPostEvidence: z.string().optional(),
            })
        )
        .length(3),
    missingKeywords: z.array(z.string()),
    rewrites: z
        .array(
            z.object({
                original: z.string().min(1),
                conservative: z.string().min(1),
                stronger: z.string().min(1),
            })
        )
        .length(3),
});

export const reviewJsonSchema = {
    type: "object",
    properties: {
        summary: { type: "string" },
        strengths: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
        gaps: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
                type: "object",
                properties: {
                    topic: { type: "string" },
                    why: { type: "string" },
                    jobPostEvidence: { type: "string" },
                },
                required: ["topic", "why"],
            },
        },
        missingKeywords: { type: "array", items: { type: "string" } },
        rewrites: {
            type: "array",
            minItems: 3,
            maxItems: 3,
            items: {
                type: "object",
                properties: {
                    original: { type: "string", minLength: 1 },
                    conservative: { type: "string", minLength: 1 },
                    stronger: { type: "string", minLength: 1 },
                },
                required: ["original", "conservative", "stronger"],
            },
        },
    },
    required: ["summary", "strengths", "gaps", "missingKeywords", "rewrites"],
};