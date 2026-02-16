import * as webllm from "https://esm.run/@mlc-ai/web-llm";

const toggleBtn = document.getElementById("chatbotUmschalten");
const startBtn = document.getElementById("startChatbot");
const userInput = document.getElementById("chatbotEingabe");
const chatContent = document.querySelector("#chatbot .content");

let engine;
let wikiData = []; // Hier speichern wir alle Dateien einzeln
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

// Lädt ALLES, aber speichert es strukturiert
async function loadFullWiki() {
    startBtn.innerText = "Sauge Wiki auf...";
    try {
        const res = await fetch('sitemap.xml');
        const xml = await res.text();
        const doc = new DOMParser().parseFromString(xml, "text/xml");
        const urls = Array.from(doc.getElementsByTagName("loc"))
            .map(n => n.textContent)
            .filter(u => u.match(/\.(md|txt|html)$/i));

        const results = await Promise.all(urls.map(async (url) => {
            try {
                const r = await fetch(url);
                if (!r.ok) return null;
                const rawText = await r.text();
                const cleanText = rawText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
                return { url, content: cleanText };
            } catch (e) { return null; }
        }));

        wikiData = results.filter(d => d !== null);
        console.log(`Alfonz hat ${wikiData.length} Dateien im Kurzzeitgedächtnis.`);
    } catch (e) { console.error("Sitemap-Fehler", e); }
}

startBtn.onclick = async () => {
    startBtn.style.pointerEvents = "none";
    await loadFullWiki();

    engine = new webllm.MLCEngine();
    engine.setInitProgressCallback((report) => {
        startBtn.innerText = `Lade Hirn: ${Math.round(report.progress * 100)}%`;
    });

    try {
        // Wir bleiben bei 0.5B für Speed, aber optimieren den Input
        await engine.reload("Qwen2.5-0.5B-Instruct-q4f16_1-MLC");
        startBtn.innerText = "Alfonz ist bereit!";
        userInput.disabled = false;
        appendMessage("Alfonz", "Ich habe das gesamte Backup und Wiki analysiert. Frag mich nach Details!", "#ffa500");
    } catch (e) { startBtn.innerText = "WebGPU fehlt!"; }
};

async function handleChat() {
    const query = userInput.value.trim();
    if (!query || !engine) return;

    appendMessage("Du", query, "#fff49e");
    userInput.value = "";
    userInput.disabled = true;

    // SEARCH LOGIC: Finde die 10 relevantesten Dateien basierend auf Schlagworten
    const keywords = query.toLowerCase().split(" ");
    const relevantFiles = wikiData
        .map(file => {
            let score = 0;
            keywords.forEach(kw => {
                if (file.url.toLowerCase().includes(kw)) score += 10;
                if (file.content.toLowerCase().includes(kw)) score += 1;
            });
            return { ...file, score };
        })
        .filter(f => f.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Nur die Top 10 Treffer an die KI schicken

    const context = relevantFiles.map(f => `[QUELLE: ${f.url}]\n${f.content}`).join("\n\n---\n\n");

    const messages = [
        {
            role: "system",
            content: `Du bist Alfonz, der Guide für Trafkhop Entertainment. 
            Nutze diesen AUSSCHNITT aus dem Wiki, um die Frage zu beantworten. 
            Nenne konkrete Namen und Details. Wenn du im Text 'Backup' findest, priorisiere das.
            
            RELEVANTE DATEN:\n${context.substring(0, 15000)}`
        },
        { role: "user", content: query }
    ];

    try {
        const result = await engine.chat.completions.create({ messages });
        appendMessage("Alfonz", result.choices[0].message.content, "#ffa500");
    } catch (e) {
        appendMessage("Alfonz", "Ich hab mich verschluckt. Nochmal bitte!", "red");
    } finally {
        userInput.disabled = false;
        userInput.focus();
    }
}

userInput.onkeypress = (e) => { if (e.key === "Enter") handleChat(); };