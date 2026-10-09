import { readFile, readdir } from "node:fs/promises";

const logPath = process.argv[2] || new URL("../logs/server.log", import.meta.url);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const log = await readFile(logPath, "utf8");
if (log.split("\n").filter(Boolean).length < 5) {
    console.log("Log is nearly empty. Run reviews and chats against the server first, or this audit proves nothing.");
    process.exit(1);
}
const logNorm = norm(log);

const dir = new URL("../samples/", import.meta.url);
const hits = [];
for (const f of await readdir(dir)) {
    const words = norm(await readFile(new URL(f, dir), "utf8")).split(" ");
    for (let i = 0; i + 5 <= words.length; i++) {
        const window = words.slice(i, i + 5).join(" ");
        if (logNorm.includes(window)) hits.push(`${f}: "${window}"`);
    }
}

if (hits.length) {
    console.log(`FAIL: ${hits.length} document phrase(s) found in the log`);
    hits.slice(0, 10).forEach((h) => console.log("  " + h));
    process.exit(1);
}
console.log("PASS: no sample document text found in the server log");