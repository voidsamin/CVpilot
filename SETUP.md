# CVpilot setup guide

Commands are for Windows PowerShell. On macOS or Linux, use `cp` instead of `copy`.

## 1. Requirements

- Node.js 20 or newer (`node -v`)
- Git
- A Gemini API key from https://aistudio.google.com (the free tier is enough)

## 2. Get the code

```powershell
git clone https://github.com/voidsamin/CVpilot.git
cd CVpilot
```

## 3. Configure the server

```powershell
cd server
npm install
copy .env.example .env
```

Open `server/.env` and fill it in. No quotes, no spaces around `=`:

```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.5-flash
GEMINI_FALLBACK_MODEL=gemini-3.6-flash
```

Notes:

- Model names get retired. If you see a 404 about a model, run `node scripts/list-models.js`, pick a current Flash model and update `.env`.
- Use two **different** models. The fallback is only tried when the first fails.
- Save the file before starting the server. An unsaved `.env` is the most common setup problem.
- Never commit `.env`. It is already in `.gitignore`.

## 4. Run the server

```powershell
cd server
npm start
```

Expected output: `CVpilot server on http://localhost:3001`.

## 5. Run the client

In a second terminal:

```powershell
cd client
npm install
npm run dev
```

Open http://localhost:5173.

## 6. Use it

1. Pick the **Resume** or **Cover letter** tab and paste your text.
2. Optionally paste a job post on the right.
3. Click **Review**, then ask follow-up questions in the chat below.

Each tab keeps its own text and review. A server restart ends all sessions, and the chat will say "Session expired".

## 7. Run the tests

Stop the server first. The test runner calls Gemini directly and shares the same quota.

```powershell
cd server
node scripts/run-review.js                  # all 10 cases
node scripts/run-review.js cover2 resume5   # selected cases
node scripts/run-review.js --warn           # also print added-word warnings
node scripts/run-review.js --pause=15000    # longer pause between calls (ms)
```

Results are saved to `server/outputs/` (ignored by Git).

### Log audit

Checks that no document text reaches the server log.

```powershell
cd server
mkdir logs
npm start 2>&1 | Tee-Object -FilePath logs\server.log
```

Use the app for a review and a few chat turns, stop the server, then:

```powershell
node scripts/audit-logs.js
```

You want `PASS: no sample document text found in the server log`.

## 8. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `API key should be set` or `Could not load the default credentials` | `.env` is missing, unsaved, in the wrong folder, or misnamed. It must be `server/.env`. |
| `404 ... no longer available` | The model name was retired. Run `node scripts/list-models.js` and update `.env`. |
| `429` | Quota reached. Wait a minute, or until the daily reset (midnight Pacific time). |
| `503` | The model is overloaded on Google's side. Wait and retry. |
| `npm error ENOENT package.json` | You are in the wrong folder. Run `cd server` or `cd client` first. |
| Client shows "Can't reach the server" | The server is not running on port 3001. |
| Chat says "Session expired" | The server restarted. Run a new review. |
| `Missing script: start` | Add `"start": "node src/index.js"` to the `scripts` in `server/package.json`. |

## 9. Privacy notes

- Document text is sent to the Gemini API to produce reviews. Check Google's terms for how free-tier data is handled before pasting real personal documents.
- The server never logs document or chat text, and stores sessions only in memory.
- Test with the fake files in `server/samples/`.