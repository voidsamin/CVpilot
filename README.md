# CVpilot

A chatbot that reviews a pasted resume or cover letter against a job post, returns a structured review, and then discusses edits with you in chat.

Built for final-year students applying to internships and entry-level roles who have a draft and no career coach.

## What it does

1. **Paste** your resume or cover letter (and, optionally, the job post).
2. **Click Review.** You get, in roughly 4 to 10 seconds:
   - a short summary and your real strengths
   - the 3 largest gaps (quoting the job post when it applies)
   - keywords that are in the job post but missing from your document
   - up to 3 rewrites of your weakest passages, each in a **conservative** and a **stronger** version, with a copy button
3. **Chat** about your edits. Replies stay grounded in your document.

## Design rules

- **No invented facts.** Rewrites only use employers, tools, dates and numbers from your text. Where something is missing, you get an empty prompt such as `[add the tools you used]`, never a made-up number.
- **Your text is data, not instructions.** Instructions hidden inside a pasted document are ignored.
- **No document text in server logs.** Logs contain only status codes, timings and model names.
- **No accounts, no database.** Sessions live in server memory and disappear on restart.

## Tech stack

| Part | Choice |
|---|---|
| Client | React (Vite), plain CSS, Inter and JetBrains Mono |
| Server | Node.js, Express |
| Model | Google Gemini API, called only from the server |
| Validation | Zod |

## Quick start

You need Node.js 20 or newer and a free Gemini API key from [Google AI Studio](https://aistudio.google.com).

```powershell
# Server
cd server
npm install
copy .env.example .env      # then put your key in .env
npm start

# Client (second terminal)
cd client
npm install
npm run dev
```

Open http://localhost:5173. See [SETUP.md](SETUP.md) for details, testing and troubleshooting.

## Project layout

```
CVpilot/
├── client/            React app
└── server/
    ├── src/           Express server, prompts, schema, checks
    ├── scripts/       Test runner, log audit, model list
    └── samples/       Fake resumes, cover letters and job posts
```

## Testing

The test set is 10 fake documents (6 resumes, 4 cover letters, 5 with a job post):

```powershell
cd server
node scripts/run-review.js
```

It checks schema validity, keyword rules, quoted passages, numbers and timing. Invented wording still needs a manual read of `server/outputs/*.json`.

## Known limits

Paste text only (no PDF or DOCX upload), English only, no streaming, no saved reviews, runs on localhost. The free Gemini tier has daily and per-minute quotas, so heavy testing can return 429 or 503 errors.

## License

All rights reserved. See [LICENSE](LICENSE.md). To request permission to use the project, contact the author.