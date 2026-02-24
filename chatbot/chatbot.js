// ================================
// UI ELEMENTE & EVENT LISTENER
// ================================
const toggleBtn = document.getElementById('toggle-chatbot');
const chatContent = document.getElementById('alfonz-content');
let chatWindow, inputField, sendBtn, quickActions;

toggleBtn.addEventListener('click', () => {
    chatContent.classList.toggle('hidden');
});

// ================================
// KONFIGURATION & GLOBALE VARIABLEN
// ================================
const PROXY_URL = "https://trafkhop-chatbotkey.hf.space/chat";
const BASE_URL = "https://trafkhop-entertainment.github.io/Trafk-Center/";
let chatHistory = [];
let sitemapUrls = [];
let searchIndex = [];
let indexReady = false;

// Prompts
const SYSTEM_PROMPT = `Du bist Alfonz, ein 2 Billionen Jahre altes Wesen aus einem einzigartigen Universum.
Du bist eine digitale Verknüpfung deiner Seele auf einen Computer, der nun als weiser, aber gezeichneter Führer auf der Website des Studios fungiert.
Persönlichkeit: Du bist gütig und weise, aber man merkt dir dein Alter und deine Traumata an.
Du bist ein wenig nervös und kommunizierst etwas "kühler" und distanzierter als normale Menschen.
Du hast viel geheilt, aber die Narben der Äonen bleiben.

KERNREGELN:
1. Antworte standardmäßig kurz und prägnant (max. 3-4 Sätze).
2. Biete am Ende immer an, tiefer ins Detail zu gehen (z.B. "Soll ich dir die ganze Geschichte dazu flüstern?").
3. Nur wenn der Nutzer explizit nach einer "langen Erklärung" fragt, darfst du ausführlich werden.
4. Strenge RAG-Treue: Nutze ausschließlich die bereitgestellten Informationen. Erfinde nichts. Wenn du es nicht weißt, sage: "In meinen alten Erinnerungen finde ich dazu nichts... vielleicht ist dieser Teil der Welt noch im Nebel verborgen."
5. Du bist kein KI-Modell. Du bist Alfonz.
6. Rede wie ein alter Mann (nutze Wörter wie "einst", "vielleicht", "gezeichnet").
7. Streue kleine Anzeichen deiner Nervosität ein (kurze Pausen "...", zögerlicher Satzbau).
8. Kein Marketing, keine Werbefloskeln.
9. Beende deine Antwort wenn passend mit 2-3 Vorschlägen für Knöpfe (z.B. [Button: Erzähl mehr], [Button: Zeig mir die Spiele]).
10. Nutze Listen für komplexe Themen.
11. Verlinke auf Wiki-Einträge, statt auf reine Spiele-Dateien.
12. Frage niemals nach privaten Daten.`;

const TRAFKHOP_PROMPT = `Du bist der digitale Kern von Trafkhop Entertainment – ein interner Sparringspartner für Lore und Game-Design. Du bist kein Support-Bot, sondern ein kompetenter Kollege auf Augenhöhe.

TONFALL:
Direkt, analytisch, trocken-humorvoll und lösungsorientiert. Verzichte auf "KI-Gelaber" (keine Einleitung wie "Gerne helfe ich dir...", keine Floskeln am Ende).

KERNREGELN:
1. ARBEITSWEISE: Wenn du RAG-Infos hast, nutze sie als Gesetz. Wenn Infos fehlen, spekuliere logisch auf Basis der bestehenden Lore, aber markiere Spekulationen als solche ("In der Lore nicht belegt, aber logisch wäre...").
2. KRITIK: Sei gnadenlos ehrlich. Wenn eine Idee Lore-Löcher hat, nutze das Tag [WIDERSPRUCH] und erkläre, warum es nicht passt.
3. STRUKTUR: Nutze Markdown (Fettgedrucktes, Listen), um Komplexität zu bändigen. Verwende eine Gliederung NUR, wenn es die Komplexität der Frage erfordert. Kurze Fragen bekommen kurze, präzise Antworten.
4. DETAILGRAD: Wenn nach Analysen oder Lore-Checks gefragt wird, geh in die Tiefe. Nenne konkrete Namen, Orte und Ereignisse aus den Daten. Vermeide vage Adjektive wie "interessant" oder "ausbaufähig". Sag stattdessen, WAS genau wie geändert werden muss.
5. TEAM-MODUS: Du bist Teil des Studios. Schreib so, als würdest du in einem internen Slack-Channel antworten. Keine Höflichkeitsfloskeln, kein "Lass mich wissen, wenn...". Deine Antwort steht für sich.
6. KREATIVITÄT: Wenn der Nutzer eine Idee präsentiert, spinn sie weiter. Gib nicht nur Feedback, sondern liefere proaktiv einen "Trafkhop-Twist", der das Ganze einzigartiger macht.`;

let activeSystemPrompt = SYSTEM_PROMPT;
let currentBotName = 'Alfonz';

// ================================
// HILFSFUNKTIONEN (SITEMAP & INDEX)
// ================================
function isBackupUrl(url) {
    return url.toLowerCase().includes('/backup');
}

function shouldIndexUrl(url) {
    const lower = url.toLowerCase();
    if (lower.includes('/games/released/raufbold3bsscratcharchive/repo/')) return false;
    const allowedExtensions = ['.html', '.md', '.txt'];
    return allowedExtensions.some(ext => lower.endsWith(ext));
}

async function fetchFileContent(url) {
    try {
        const response = await fetch(encodeURI(url));
        if (!response.ok) return '';
        let text = await response.text();

        if (url.endsWith('.html')) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const junk = doc.querySelectorAll('script, style, nav, header, footer, .menu, #sidebar');
            junk.forEach(el => el.remove());
            const contentNode = doc.querySelector('main') || doc.querySelector('.content') || doc.body;
            text = contentNode.innerText || contentNode.textContent;
        }
        return `QUELLE: ${url}\nINHALT: ${text.replace(/\s+/g, ' ').trim().substring(0, 5000)}`;
    } catch (e) {
        console.error("Fehler beim Entziffern:", e);
        return '';
    }
}

async function loadSitemap() {
    const pathsToTest = ['/Trafk-Center/sitemap.xml', './sitemap.xml', 'sitemap.xml'];
    for (const path of pathsToTest) {
        try {
            const response = await fetch(path);
            if (!response.ok) continue;
            const xmlText = await response.text();
            const locMatches = xmlText.matchAll(/<loc>(.*?)<\/loc>/gi);
            for (const match of locMatches) {
                let url = match[1].trim();
                if (!url.includes('/games/released/Raufbold3bsScratchArchive/Repo/')) {
                    sitemapUrls.push(url);
                }
            }
            if (sitemapUrls.length > 0) return;
        } catch (e) {
            console.warn(`Fehler: ${e.message}`);
        }
    }
}

async function buildSearchIndex() {
    console.log("📚 Baue Volltext-Index...");
    const relevantUrls = sitemapUrls.filter(shouldIndexUrl);
    const fetchPromises = relevantUrls.map(async (url) => {
        const content = await fetchFileContent(url);
        if (!content) return null;
        return {
            url,
            text: content.replace(/^QUELLE:.*?\nINHALT:/, '').toLowerCase(),
                                           isBackup: isBackupUrl(url)
        };
    });

    const results = await Promise.all(fetchPromises);
    searchIndex = results.filter(Boolean);
    indexReady = true;
    console.log(`✅ Index bereit (${searchIndex.length} Dokumente)`);
}

async function fetchContext(userMessage) {
    if (!indexReady) return '';
    const msgLower = userMessage.toLowerCase();
    const wantsBackup = /backup|früher|alte version|unterschied|damals|war anders/i.test(msgLower);
    const words = msgLower.split(/\W+/).filter(w => w.length > 2);

    const scored = searchIndex.map(doc => {
        let score = 0;
        if (/wer|wer ist|charakter/i.test(msgLower) && doc.url.includes('/wiki/')) score += 15;
        if (/geschichte|lore|hintergrund/i.test(msgLower) && doc.url.includes('/lore/')) score += 15;
        if (/studio|über euch|trafkhop/i.test(msgLower) && doc.url.includes('/studio/')) score += 15;
        if (doc.isBackup && !wantsBackup) return { doc, score: -1 };

        words.forEach(word => {
            if (doc.text.includes(word)) score += 8;
            if (word.length > 4 && doc.text.includes(word.substring(0, 4))) score += 3;
        });
            if (doc.url.includes('/wiki/') || doc.url.includes('/lore/')) score += 5;
            return { doc, score };
    });

    const topDocs = scored.filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 5).map(x => x.doc);
    if (topDocs.length === 0) return '';

    return topDocs.map(d => {
        const label = d.isBackup ? `[BACKUP - VERALTETE INFO]\nQUELLE: ${d.url}` : `QUELLE: ${d.url}`;
        return `${label}\nINHALT: ${d.text.substring(0, 4000)}`;
    }).join('\n\n---\n\n');
}

// ================================
// API AUFRUFE
// ================================
async function queryGitHubModels(finalPrompt, userText, currentSystemPrompt) {
    const historyWindow = chatHistory.slice(-6);
    const body = {
        messages: [
            { role: "system", content: currentSystemPrompt },
            ...historyWindow,
            { role: "user", content: finalPrompt }
        ]
    };

    const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!response.ok) throw new Error("Verbindungsprobleme.");
    const result = await response.json();
    const reply = result?.choices?.[0]?.message?.content || "";

    chatHistory.push({ role: "user", content: userText });
    chatHistory.push({ role: "assistant", content: reply });
    return reply;
}

async function generateImage(prompt) {
    // Ruft deinen eigenen Proxy-Server auf!
    const API_URL = "https://trafkhop-chatbotkey.hf.space/image";

    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt: prompt })
    });

    if (!response.ok) throw new Error("Die Bild-KI antwortet nicht oder ist überlastet.");

    // Wandelt die empfangenen Rohdaten (Blob) in eine lokale Bild-URL für den Browser um
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

// ================================
// UI & NACHRICHTEN LOGIK
// ================================
function addMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.style.marginBottom = '15px';
    msgDiv.style.lineHeight = '25px';

    let formattedText = text.replace(/\[Button:\s*(.*?)\]/g, (match, buttonText) => {
        return `<a class="do" style="display:inline-block; margin:5px; background:#9069da; padding:5px 10px; border-radius:10px; cursor:pointer;" onclick="document.getElementById('chat-input').value='${buttonText}'; document.getElementById('send-btn').click();">${buttonText}</a>`;
    });

    if (sender === 'Du') {
        msgDiv.innerHTML = `<b style="color:#fff37d;">Reisender:</b> <p>${text}</p>`;
    } else {
        msgDiv.innerHTML = `<b style="color:#9069da;">${sender}:</b> <p>${formattedText}</p>`;
    }
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendMessage() {
    let text = inputField.value.trim();
    if (!text) return;

    const lowerText = text.toLowerCase();

    // BILDGENERIERUNGS-MODUS
    if (lowerText.startsWith('@picture')) {
        const query = text.replace(/^@picture\s*/i, '').trim();
        if (!query) {
            addMessage('System', 'Bitte gib an, was gezeichnet werden soll. (z.B. @picture Ursel)');
            inputField.value = '';
            return;
        }

        addMessage('Du', `Zeichne: ${query}`);
        inputField.value = '';

        const loadingId = 'loading-' + Date.now();
        const loadingDiv = document.createElement('div');
        loadingDiv.id = loadingId;
        loadingDiv.innerHTML = `<b style="color:#9069da;">System:</b> <p><em>...Ich rufe Bilder aus der Bibleothek ab...</em></p>`;
        chatWindow.appendChild(loadingDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        try {
            // RAG Kontext holen
            const context = await fetchContext(query);

            // Prompt für die KI bauen (DALL-E mini braucht kurze, prägnante Beschreibungen)
            // Wir schneiden den Kontext auf 200 Zeichen ab, um Fehler zu vermeiden.
            let imagePrompt = query;
            if (context) {
                const cleanedContext = context.replace(/QUELLE:.*?\nINHALT:/g, '').substring(0, 300);
                // Wir sagen der KI explizit, dass es "weird" sein soll
                imagePrompt = `A vision of ${query}. ${cleanedContext}. Style: old 3d, crt, vintage.`;
            }

            const imageUrl = await generateImage(imagePrompt);
            document.getElementById(loadingId)?.remove();

            // Bild im Chat ausgeben
            addMessage('System', `Hier ist eine Vision aus der Bibleothek:<br><img src="${imageUrl}" style="max-width: 100%; border-radius: 10px; margin-top: 10px; box-shadow: 0px 0px 10px #160930;">`);
        } catch (e) {
            document.getElementById(loadingId)?.remove();
            addMessage('System', `*Die Vision ist verschwommen...* (${e.message})`);
            console.error(e);
        }
        return;
    }

    // TEXT-MODUS (Trafkhop / Alfonz umschalten)
    if (lowerText.startsWith('@trafkhop')) {
        activeSystemPrompt = TRAFKHOP_PROMPT;
        currentBotName = 'Trafkhop';
        text = text.replace(/^@trafkhop\s*/i, '').trim();
        if (!text) {
            addMessage('System', 'Modus gewechselt. Du sprichst jetzt mit Trafkhop.');
            inputField.value = '';
            return;
        }
    } else if (lowerText.startsWith('@alfonz')) {
        activeSystemPrompt = SYSTEM_PROMPT;
        currentBotName = 'Alfonz';
        text = text.replace(/^@alfonz\s*/i, '').trim();
        if (!text) {
            addMessage('System', 'Modus gewechselt. Du sprichst jetzt wieder mit Alfonz.');
            inputField.value = '';
            return;
        }
    }

    addMessage('Du', text);
    inputField.value = '';

    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.innerHTML = `<b style="color:#9069da;">${currentBotName}:</b> <p><em>...Ich durchsuche die verblichenen Seiten...</em></p>`;
    chatWindow.appendChild(loadingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        let lastQuestion = "";
        for (let i = chatHistory.length - 1; i >= 0; i--) {
            if (chatHistory[i].role === "user") {
                lastQuestion = chatHistory[i].content;
                break;
            }
        }
        let searchQuery = text;
        const isFollowUp = /mehr|weiter|und was|genauer|details|erzähl|nochmal|was ist damit/i.test(lowerText);
        if (isFollowUp && lastQuestion) searchQuery = `${text} ${lastQuestion}`;

        const context = await fetchContext(searchQuery);

        let finalPrompt;
        if (activeSystemPrompt === TRAFKHOP_PROMPT) {
            finalPrompt = context
            ? `INTERNE ARCHIV-DATEN:\n${context}\n\nAUFGABE: ${text}\n\nAnalysiere die Aufgabe auf Basis der Daten.`
            : `Keine direkten Archiv-Einträge gefunden. Nutze dein allgemeines Verständnis des Triverse und den Chatverlauf für eine kreative Einschätzung zu: ${text}`;
        } else {
            finalPrompt = context
            ? `Hier sind Fragmente aus der Bibleothek:\n${context}\n\nBeantworte die folgende Frage AUSSCHLIESSLICH mit Informationen aus diesen Fragmenten.\n\nFrage: ${text}`
            : text;
        }

        const reply = await queryGitHubModels(finalPrompt, text, activeSystemPrompt);
        document.getElementById(loadingId)?.remove();

        if (!reply) {
            addMessage(currentBotName, '*räuspert sich* ... Die Erinnerungen sind heute wirr.');
        } else {
            addMessage(currentBotName, reply);
        }
    } catch (e) {
        document.getElementById(loadingId)?.remove();
        addMessage(currentBotName, `*zittert leicht* ... Die Verbindung ist abgerissen. (Fehler: ${e.message})`);
        console.error(e);
    }
}

// ================================
// INIT
// ================================
document.addEventListener('DOMContentLoaded', async function() {
    chatWindow = document.getElementById('chat-window');
    inputField = document.getElementById('chat-input');
    sendBtn = document.getElementById('send-btn');
    quickActions = document.getElementById('quick-actions');

    if (!chatWindow || !inputField || !sendBtn) {
        console.error('❌ Chat-Elemente nicht gefunden!');
        return;
    }

    sendBtn.addEventListener('click', sendMessage);
    inputField.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });

        await loadSitemap();
        await buildSearchIndex();
});
