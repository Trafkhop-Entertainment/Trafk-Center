import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const toggleBtn = document.getElementById("chatbotUmschalten");
const startBtn = document.getElementById("startChatbot");
const userInput = document.getElementById("chatbotEingabe");
const chatContent = document.querySelector("#chatbot .content");

let engine;
let wikiData = [];
let messagesDiv;

toggleBtn.onclick = () => { chatContent.classList.toggle("hidden"); };

function appendMessage(sender, text, color) {
    if (!messagesDiv) {
        messagesDiv = document.createElement("div");
        messagesDiv.id = "chatbotNachrichten";
        messagesDiv.style.cssText = "height:300px; overflow-y:auto; background:#160930; padding:15px; margin-top:10px; border-radius:8px; color: white; border: 2px solid #603ea3;";
        chatContent.insertBefore(messagesDiv, userInput);
    }
    const p = document.createElement("p");
    p.style.color = color;
    p.style.marginBottom = "10px";
    p.innerHTML = `<b>${sender}:</b> ${text}`;
    messagesDiv.appendChild(p);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Stoppwörter (kannst du erweitern)
const STOPWORDS = new Set(["der", "die", "das", "und", "ist", "wie", "was", "wann", "wer", "wo", "warum", "dann", "dort", "hier", "ein", "eine", "einer", "eines", "dem", "den", "des", "mit", "von", "für", "auf", "bei", "nach", "aus", "durch", "über", "unter", "zwischen"]);

// Absolute URL zu deiner Sitemap (GitHub Pages)
const SITEMAP_URL = "https://trafkhop-entertainment.github.io/Trafk-Center/sitemap.xml";

async function loadFullWiki() {
    startBtn.innerText = "📡 Lade Sitemap...";
    try {
        // 1. Sitemap abrufen
        const response = await fetch(SITEMAP_URL);
        if (!response.ok) {
            throw new Error(`HTTP-Fehler ${response.status}: ${response.statusText}`);
        }
        const xmlText = await response.text();

        // 2. XML parsen
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        // Prüfen auf Parse-Fehler
        const parseError = xmlDoc.querySelector("parsererror");
        if (parseError) {
            throw new Error("XML-Parsing-Fehler: " + parseError.textContent);
        }

        // 3. Alle <loc>-Elemente extrahieren
        const locs = xmlDoc.getElementsByTagName("loc");
        if (locs.length === 0) {
            throw new Error("Keine <loc>-Elemente in der Sitemap gefunden.");
        }

        const urls = Array.from(locs)
            .map(n => n.textContent)
            .filter(u => u.match(/\.(md|txt|html)$/i));

        if (urls.length === 0) {
            throw new Error("Keine URLs mit .md/.txt/.html-Endung gefunden.");
        }

        // 4. Alle Dateien laden (mit Fortschritt)
        let loaded = 0;
        const results = await Promise.all(urls.map(async (url) => {
            try {
                const r = await fetch(url);
                if (!r.ok) return null;
                const raw = await r.text();
                const clean = raw.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
                loaded++;
                startBtn.innerText = `📥 Lade Wiki ... ${loaded}/${urls.length}`;
                return { url, content: clean };
            } catch (e) {
                console.warn(`Fehler beim Laden von ${url}:`, e);
                return null;
            }
        }));

        wikiData = results.filter(d => d !== null);
        console.log(`Alfonz hat ${wikiData.length} Dateien geladen.`);

        if (wikiData.length === 0) {
            throw new Error("Es konnten keine Dateien geladen werden.");
        }
    } catch (error) {
        console.error("Sitemap-Fehler:", error);
        appendMessage("Alfonz", `❌ Fehler beim Laden des Wikis: ${error.message}`, "red");
        throw error; // Damit der Startvorgang abgebrochen wird
    }
}

function extractKeywords(query) {
    return query.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 2 && !STOPWORDS.has(word));
}

function getRelevantFiles(query) {
    const keywords = extractKeywords(query);
    if (keywords.length === 0) {
        // Fallback: erste 10 Dateien (alphabetisch)
        return [...wikiData].sort((a, b) => a.url.localeCompare(b.url)).slice(0, 10);
    }

    const scored = wikiData.map(file => {
        let score = 0;
        const contentLower = file.content.toLowerCase();
        for (const kw of keywords) {
            const matches = (contentLower.match(new RegExp(kw, 'g')) || []).length;
            score += matches;
        }
        return { ...file, score };
    });

    const relevant = scored.filter(f => f.score > 0).sort((a, b) => b.score - a.score);
    return relevant.length > 0 ? relevant.slice(0, 10) : wikiData.slice(0, 10);
}

startBtn.onclick = async () => {
    startBtn.style.pointerEvents = "none";
    try {
        await loadFullWiki(); // Falls Fehler, wird Exception geworfen
    } catch (e) {
        startBtn.style.pointerEvents = "auto";
        startBtn.innerText = "❌ Wiki-Fehler";
        return;
    }

    // WebLLM-Engine starten
    engine = new webllm.MLCEngine();
    engine.setInitProgressCallback((report) => {
        startBtn.innerText = `🧠 Lade Hirn: ${Math.round(report.progress * 100)}%`;
    });

    try {
        // 7B Modell (ca. 4-5 GB VRAM) – falls zu groß, nimm 3B: "Qwen2.5-3B-Instruct-q4f16_1-MLC"
        await engine.reload("Qwen2.5-7B-Instruct-q4f16_1-MLC");
        startBtn.innerText = "🤖 Alfonz ist bereit!";
        userInput.disabled = false;
        appendMessage("Alfonz", "Ich habe das gesamte Wiki durchforstet. Stelle mir eine Frage!", "#ffa500");
    } catch (e) {
        console.error(e);
        startBtn.innerText = "❌ WebGPU / Modellfehler";
        appendMessage("Alfonz", "❌ Konnte das KI-Modell nicht laden. Ist WebGPU aktiviert? (Chrome/Edge mit Flags)", "red");
        startBtn.style.pointerEvents = "auto";
    }
};

async function handleChat() {
    const query = userInput.value.trim();
    if (!query || !engine) return;

    appendMessage("Du", query, "#fff49e");
    userInput.value = "";
    userInput.disabled = true;

    appendMessage("Alfonz", "🔍 Durchstöbere das Wiki und denke nach ...", "gray");

    const relevantFiles = getRelevantFiles(query);
    let context = relevantFiles.map(f => `[QUELLE: ${f.url}]\n${f.content}`).join("\n\n---\n\n");
    const MAX_CONTEXT_LENGTH = 100000;
    if (context.length > MAX_CONTEXT_LENGTH) {
        context = context.slice(0, MAX_CONTEXT_LENGTH) + "\n\n[... Weitere Inhalte gekürzt]";
    }

    const messages = [
        {
            role: "system",
            content: `Du bist Alfonz, der Guide für Trafkhop Entertainment. 
Beantworte die Frage des Users ausschließlich anhand der folgenden Auszüge aus dem Wiki. 
Wenn die Antwort nicht in den Auszügen enthalten ist, sage, dass du dazu nichts finden konntest.
Zitiere wenn möglich konkrete Namen und Details.

RELEVANTE WIKI-AUSSCHNITTE:
${context}`
        },
        { role: "user", content: query }
    ];

    try {
        const result = await engine.chat.completions.create({ messages });
        // Denk-Nachricht entfernen
        if (messagesDiv.lastChild && messagesDiv.lastChild.innerText.includes("🔍 Durchstöbere")) {
            messagesDiv.removeChild(messagesDiv.lastChild);
        }
        appendMessage("Alfonz", result.choices[0].message.content, "#ffa500");
    } catch (e) {
        console.error(e);
        appendMessage("Alfonz", "😵 Ich habe mich verschluckt. Bitte versuche es noch einmal.", "red");
    } finally {
        userInput.disabled = false;
        userInput.focus();
    }
}

userInput.onkeypress = (e) => { if (e.key === "Enter") handleChat(); };