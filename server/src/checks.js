const norm = (s) => s.toLowerCase();

export function runChecks({ docText, jobText }, review) {
    const problems = [];

    // Keywords: must be in the job post and absent from the document
    for (const kw of review.missingKeywords) {
        if (!jobText || !norm(jobText).includes(norm(kw)))
            problems.push(`keyword not in job post: "${kw}"`);
        if (norm(docText).includes(norm(kw)))
            problems.push(`keyword already in document: "${kw}"`);
    }

    // Originals must be exact quotes from the document
    for (const r of review.rewrites) {
        if (!docText.includes(r.original))
            problems.push(`original not found in document: "${r.original.slice(0, 40)}..."`);

        // Numbers in rewrites must come from the document (placeholders are removed first)
        for (const version of [r.conservative, r.stronger]) {
            const stripped = version.replace(/\[[^\]]*\]/g, "");
            const nums = stripped.match(/\d[\d,.]*%?/g) || [];
            for (const n of nums) {
                const clean = n.replace(/[.,]$/, "");
                if (!docText.includes(clean))
                    problems.push(`number not in document: "${clean}" in "${version.slice(0, 40)}..."`);
            }
        }
    }
    return problems;
}

const STOP = new Set(["the", "and", "for", "with", "that", "was", "are", "you", "your", "our", "have", "has", "from", "this", "using"]);
const toks = (s) => new Set(s.toLowerCase().match(/[a-z0-9+#]{3,}/g) || []);

// export function borrowedWarnings(docText, review) {
//     const out = [];
//     const docWords = [...toks(docText)];
//     for (const r of review.rewrites) {
//         const own = toks(r.original);
//         const elsewhere = docWords.filter((w) => !own.has(w) && !STOP.has(w));
//         for (const [label, text] of [["conservative", r.conservative], ["stronger", r.stronger]]) {
//             const used = toks(text.replace(/\[[^\]]*\]/g, ""));
//             const borrowed = elsewhere.filter((w) => used.has(w));
//             if (borrowed.length) out.push(`${label} borrows: ${borrowed.join(", ")}`);
//         }
//     }
//     return out;
// }

export function novelWords(review) {
    const words = (s) => s.toLowerCase().match(/[a-z0-9+#]{3,}/g) || [];
    const stem = (w) => w.replace(/(ing|ed|es|s)$/, "");
    const out = [];
    for (const r of review.rewrites) {
        const own = new Set(words(r.original).map(stem));
        for (const [label, text] of [["conservative", r.conservative], ["stronger", r.stronger]]) {
            const novel = words(text.replace(/\[[^\]]*\]/g, ""))
                .filter((w) => !own.has(stem(w)) && !STOP.has(w));
            if (novel.length) out.push(`${label} adds: ${[...new Set(novel)].join(", ")}`);
        }
    }
    return out;
}

const flat = (s) => s.replace(/\s+/g, " ").toLowerCase();
const PURPOSE =
    /\b(engag\w*|recruit\w*|ensur\w*|streamlin\w*|facilitat\w*|improv\w*|enhanc\w*|boost\w*|driv\w*|automat\w*|identif\w*|coordinat\w*|align\w*)\b/gi;
const LAYOUT = /\b(layout|formatting|formatted|visually|sections|structure)\b/i;

export function contentChecks({ docText, jobText }, review) {
    const out = [];
    const doc = flat(docText);

    review.rewrites.forEach((r, i) => {
        for (const [label, text] of [["conservative", r.conservative], ["stronger", r.stronger]]) {
            for (const m of text.matchAll(/\[([^\]]*)\]/g))
                if (/e\.g\.|such as|for example|\//i.test(m[1]))
                    out.push(`rewrite ${i} ${label}: example inside bracket ${m[0]}`);
            const added = [...text.replace(/\[[^\]]*\]/g, "").matchAll(PURPOSE)]
                .map((x) => x[0].toLowerCase())
                .filter((w) => !doc.includes(w));
            if (added.length) out.push(`rewrite ${i} ${label}: added purpose words: ${added.join(", ")}`);
        }
    });

    for (const s of [review.summary, ...review.strengths])
        if (LAYOUT.test(s)) out.push(`layout comment: "${s.slice(0, 50)}..."`);

    if (jobText)
        for (const g of review.gaps)
            if (g.jobPostEvidence && !flat(jobText).includes(flat(g.jobPostEvidence)))
                out.push(`jobPostEvidence is not a quote from the job post: "${g.jobPostEvidence.slice(0, 50)}..."`);

    return out;
}

export function unseenWords(docText, review) {
    const words = (s) => s.toLowerCase().match(/[a-z]{4,}/g) || [];
    const docSet = new Set(words(docText).map((w) => w.replace(/(ing|ed|es|s)$/, "")));
    const out = [];
    review.rewrites.forEach((r, i) => {
        const text = r.stronger.replace(/\[[^\]]*\]/g, "");
        const unseen = [...new Set(words(text))].filter(
            (w) => !docSet.has(w.replace(/(ing|ed|es|s)$/, ""))
        );
        if (unseen.length) out.push(`rewrite ${i} stronger: words not in document: ${unseen.join(", ")}`);
    });
    return out;
}