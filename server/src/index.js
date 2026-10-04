import "dotenv/config";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { generateReview } from "./review.js";
import { generateChatReply } from "./chat.js";

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "200kb" }));

const sessions = new Map();
const MAX_DOC = 20000;
const MAX_MSG = 2000;
const MAX_MESSAGES = 40;

// Logs method, path, status, duration and session id. Never req.body.
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
});

const isText = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max;

app.post("/review", async (req, res) => {
    const { docType, docText, jobText } = req.body ?? {};
    if (!["resume", "cover_letter"].includes(docType))
        return res.status(400).json({ error: "docType must be resume or cover_letter" });
    if (!isText(docText, MAX_DOC))
        return res.status(400).json({ error: "Paste your document text (max 20,000 characters)." });
    if (jobText != null && (typeof jobText !== "string" || jobText.length > MAX_DOC))
        return res.status(400).json({ error: "Job post is too long." });

    try {
        const review = await generateReview({ docType, docText, jobText });
        const id = randomUUID();
        sessions.set(id, { id, docType, docText, jobText, review, messages: [] });
        console.log(`[session] created ${id}`);
        res.json({ sessionId: id, review });
    } catch (err) {
        console.log(`[review] failed: ${err?.name} status=${err?.status ?? "n/a"} ${err?.name === "ZodError" ? err.issues.map((i) => i.path.join(".") + ":" + i.code).join("; ") : err?.name === "ApiError" ? (err.message || "").slice(0, 200) : ""}`);
        res.status(502).json({ error: "The review failed. Please try again." });
    }
});

app.post("/chat", async (req, res) => {
    const { sessionId, message } = req.body ?? {};
    const session = sessions.get(sessionId);
    if (!session)
        return res.status(404).json({ error: "Session not found. Run a new review." });
    if (!isText(message, MAX_MSG))
        return res.status(400).json({ error: "Message must be 1 to 2,000 characters." });
    if (session.messages.length >= MAX_MESSAGES)
        return res.status(400).json({ error: "Chat limit reached. Start a new review." });

    session.messages.push({ role: "user", content: message });
    try {
        const reply = await generateChatReply(session);
        session.messages.push({ role: "assistant", content: reply });
        res.json({ reply });
    } catch (err) {
        session.messages.pop(); // keep history consistent so the user can retry
        console.log(`[chat] failed: ${err?.name} status=${err?.status ?? "n/a"} ${err?.name === "ApiError" ? (err.message || "").slice(0, 200) : ""}`);
        res.status(502).json({ error: "The reply failed. Please try again." });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`CVpilot server on http://localhost:${PORT}`));