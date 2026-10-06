const API = "http://localhost:3001";

async function post(path, body) {
    let res;
    try {
        res = await fetch(API + path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    } catch {
        throw { kind: "network", message: "Can't reach the server. Is it running on port 3001?" };
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const kind = res.status === 404 ? "expired" : res.status === 429 ? "quota" : "error";
        throw { kind, message: data.error || "Something went wrong. Please try again." };
    }
    return data;
}

export const requestReview = (body) => post("/review", body);
export const sendChat = (body) => post("/chat", body);