import { readFile, mkdir, writeFile } from "node:fs/promises";
import { generateReview } from "../src/review.js";
import { runChecks, novelWords } from "../src/checks.js";

const read = (f) => readFile(new URL(`../samples/${f}`, import.meta.url), "utf8");

const cases = [
    { name: "resume1", docType: "resume", doc: "resume1.txt" },
    { name: "resume2", docType: "resume", doc: "resume2.txt" },
    { name: "resume3", docType: "resume", doc: "resume3.txt" },
    { name: "cover1+job1", docType: "cover_letter", doc: "cover1.txt", job: "job1.txt" },
];

await mkdir(new URL("../outputs/", import.meta.url), { recursive: true });

for (const c of cases) {
    const docText = await read(c.doc);
    const jobText = c.job ? await read(c.job) : undefined;
    const start = Date.now();
    try {
        const review = await generateReview({ docType: c.docType, docText, jobText });
        const secs = ((Date.now() - start) / 1000).toFixed(1);
        const problems = runChecks({ docText, jobText }, review);
        console.log(`${c.name}: schema OK | ${secs}s | ${problems.length ? "CHECK FAILS" : "checks OK"}`);
        problems.forEach((p) => console.log("   - " + p));
        novelWords(review).forEach((w) => console.log("   WARN " + w));
        await writeFile(
            new URL(`../outputs/${c.name}.json`, import.meta.url),
            JSON.stringify(review, null, 2)
        );
    } catch (err) {
        const secs = ((Date.now() - start) / 1000).toFixed(1);
        console.log(`${c.name}: SCHEMA/API FAIL | ${secs}s | ${err.message.slice(0, 200)}`);
    }
}