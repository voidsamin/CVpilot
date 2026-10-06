import { useState, useRef, useEffect } from "react";
import { Copy, Check, Send, AlertCircle, FileSearch } from "lucide-react";
import { requestReview, sendChat } from "./api.js";

function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch { }
  }
  return (
    <button className="btn ghost small" onClick={copy} aria-label="Copy text">
      {done ? <Check size={14} /> : <Copy size={14} />}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function Skeleton() {
  return (
    <div className="stack" aria-label="Loading review">
      {[120, 160, 220].map((h, i) => (
        <div key={i} className="card skeleton" style={{ height: h }} />
      ))}
    </div>
  );
}

function ReviewView({ review }) {
  let i = 0;
  const enter = () => ({ "--i": i++ });
  return (
    <div className="stack">
      <section className="card enter" style={enter()}>
        <h2>Summary</h2>
        <p>{review.summary}</p>
      </section>

      <section className="card enter" style={enter()}>
        <h2>Strengths</h2>
        <ul>{review.strengths.map((s, k) => <li key={k}>{s}</li>)}</ul>
      </section>

      <section className="card enter" style={enter()}>
        <h2>3 biggest gaps</h2>
        {review.gaps.map((g, k) => (
          <div className="gap" key={k}>
            <h3>{g.topic}</h3>
            <p>{g.why}</p>
            {g.jobPostEvidence && <blockquote>{g.jobPostEvidence}</blockquote>}
          </div>
        ))}
      </section>

      {review.missingKeywords.length > 0 && (
        <section className="card enter" style={enter()}>
          <h2>Missing keywords</h2>
          <div className="chips">
            {review.missingKeywords.map((k) => <span className="chip" key={k}>{k}</span>)}
          </div>
        </section>
      )}

      <section className="card enter" style={enter()}>
        <h2>Rewrites</h2>
        {review.rewrites.map((r, k) => (
          <div className="rewrite" key={k}>
            <p className="label">Original</p>
            <p className="mono muted">{r.original}</p>
            <div className="versionhead">
              <p className="label">Conservative</p>
              <CopyButton text={r.conservative} />
            </div>
            <p className="mono">{r.conservative}</p>
            <div className="versionhead">
              <p className="label">Stronger</p>
              <CopyButton text={r.stronger} />
            </div>
            <p className="mono">{r.stronger}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function Chat({ sessionId, onExpired }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setError("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setBusy(true);
    try {
      const { reply } = await sendChat({ sessionId, message });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      if (e.kind === "expired") onExpired();
      setError(e.kind === "expired" ? "Session expired. Run a new review to keep chatting." : e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2>Ask about your edits</h2>
      <div className="thread">
        {messages.length === 0 && (
          <p className="muted">Try: "Rewrite my project bullet" or "What should I cut?"</p>
        )}
        {messages.map((m, k) => (
          <div key={k} className={`msg ${m.role}`}>
            <p>{m.content}</p>
            {m.role === "assistant" && <CopyButton text={m.content} />}
          </div>
        ))}
        {busy && <div className="card skeleton" style={{ height: 56 }} />}
        <div ref={endRef} />
      </div>
      {error && <p className="error"><AlertCircle size={16} /> {error}</p>}
      <div className="chatinput">
        <input
          value={input}
          maxLength={2000}
          placeholder="Ask a follow-up question"
          aria-label="Follow-up question"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn primary" onClick={send} disabled={busy || !input.trim()}>
          <Send size={16} /> Send
        </button>
      </div>
    </section>
  );
}

export default function App() {
  const [docType, setDocType] = useState("resume");
  const [docTexts, setDocTexts] = useState({ resume: "", cover_letter: "" });
  const docText = docTexts[docType];
  const setDocText = (value) => setDocTexts((t) => ({ ...t, [docType]: value }));
  const [jobText, setJobText] = useState("");
  const [results, setResults] = useState({
    resume: { review: null, sessionId: null, loading: false, error: "", chatKey: 0 },
    cover_letter: { review: null, sessionId: null, loading: false, error: "", chatKey: 0 },
  });
  const { review, sessionId, loading, error, chatKey } = results[docType];
  const patch = (type, changes) =>
    setResults((r) => ({ ...r, [type]: { ...r[type], ...changes } }));

  async function runReview() {
    const type = docType; // lock in the tab this review belongs to
    patch(type, { loading: true, error: "", review: null, sessionId: null });
    try {
      const data = await requestReview({
        docType: type,
        docText: docTexts[type],
        jobText: jobText.trim() ? jobText : undefined,
      });
      setResults((r) => ({
        ...r,
        [type]: {
          ...r[type],
          review: data.review,
          sessionId: data.sessionId,
          chatKey: r[type].chatKey + 1, // fresh chat thread for the new session
          loading: false,
        },
      }));
    } catch (e) {
      patch(type, { error: e.message, loading: false });
    }
  }

  const tabs = [
    ["resume", "Resume"],
    ["cover_letter", "Cover letter"],
  ];

  return (
    <>
      <header className="wrap">
        <h1>CVpilot</h1>
        <p className="muted">Paste your resume or cover letter. Get a review and edit it in chat.</p>
      </header>

      <main className="wrap">
        <div className="inputs">
          <div>
            <div className="tabs" role="tablist">
              {tabs.map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={docType === id}
                  className={docType === id ? "tab active" : "tab"}
                  onClick={() => setDocType(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label htmlFor="doc">{docType === "resume" ? "Your resume" : "Your cover letter"}</label>
            <textarea
              id="doc"
              value={docText}
              maxLength={20000}
              placeholder="Paste the text here"
              onChange={(e) => setDocText(e.target.value)}
            />
          </div>
          <div>
            <div className="tabs spacer" />
            <label htmlFor="job">Job post (optional)</label>
            <textarea
              id="job"
              value={jobText}
              maxLength={20000}
              placeholder="Paste the job post to get keyword gaps"
              onChange={(e) => setJobText(e.target.value)}
            />
          </div>
        </div>

        <button className="btn primary big" onClick={runReview} disabled={loading || !docText.trim()}>
          {loading ? "Reviewing" : "Review"}
        </button>

        {error && <p className="error"><AlertCircle size={16} /> {error}</p>}

        <div className="results">
          {loading && <Skeleton />}
          {!loading && !review && !error && (
            <p className="empty muted"><FileSearch size={20} /> Your review will appear here.</p>
          )}
          {review && (
            <>
              <ReviewView review={review} />
              <Chat key={`${docType}-${chatKey}`} sessionId={sessionId} onExpired={() => patch(docType, { sessionId: null })} />
            </>
          )}
        </div>
      </main>
    </>
  );
}