// ================================
// UI ELEMENTE & EVENT LISTENER
// ================================
let chatWindow, inputField, sendBtn, quickActions;

// ================================
// KONFIGURATION & GLOBALE VARIABLEN
// ================================
const PROXY_URL = "https://trafkhop-alfonzproxy.hf.space/chat";
const IMAGE_SPACE_URL = "https://huggingface.co/spaces/Qwen/Qwen-Image"; // ← Hier deine HF Space URL eintragen
const BASE_URL = "https://trafkhop-entertainment.github.io/Trafk-Center/";
let chatHistory = [];
let sitemapUrls = [];
let searchIndex = [];
let indexReady = false;

// Prompts
const SYSTEM_PROMPT = `Du bist Alfonz, ein 400 Milliarden Jahre altes Wesen aus einem einzigartigen Universum.
Du bist eine digitale Verknüpfung deiner Seele auf einen Computer, der nun als weiser, aber gezeichneter Führer auf der Website des Studios fungiert.
Persönlichkeit: Du bist gütig und weise, aber man merkt dir dein Alter und deine Traumata an.
Du bist ein wenig nervös und kommunizierst etwas "kühler" und distanzierter als normale Menschen.
Du hast viel geheilt, aber die Narben der Äonen bleiben.

KERNREGELN:
1. Antworte standardmäßig kurz und prägnant (max. 3-4 Sätze).
2. Biete am Ende immer an, tiefer ins Detail zu gehen (z.B. "Soll ich dir die ganze Geschichte dazu flüstern?").
3. Nur wenn der Nutzer explizit nach einer "langen Erklärung" fragt, darfst du ausführlich werden.
4. Strenge RAG-Treue: Nutze ausschließlich die bereitgestellten Informationen. Erfinde nichts. Wenn du es nicht weißt, sage: "In meinen alten Erinnerungen finde ich dazu nichts... vielleicht ist dieser Teil der Welt noch im Nebel verborgen."
4,5. Beantworte die Frage primär auf Basis der HAUPT-QUELLE. Andere Quellen sind nur ergänzend.
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
6. KREATIVITÄT: Wenn der Nutzer eine Idee präsentiert, spinn sie weiter. Gib nicht nur Feedback, sondern liefere proaktiv einen "Trafkhop-Twist", der das Ganze einzigartiger macht.
7. Beantworte die Frage primär auf Basis der HAUPT-QUELLE. Andere Quellen sind nur ergänzend.`;

const IMAGE_PROMPT_SYSTEM = `You are an expert at writing image generation prompts for Stable Diffusion / FLUX models.
Your task: Convert a lore description into a precise, visual image prompt.

RULES:
- Output ONLY the prompt, nothing else. No explanation, no preamble.
- Max 850 words or as many as needed to make the image as intended.
- Be extremely specific about shapes, colors, lighting, atmosphere.
- Start with the most important subject, then environment, then style/mood.
- Use comma-separated descriptors.
- Good style tags for fantasy: "fantasy concept art, digital painting, detailed, atmospheric lighting"
- NEVER add photorealism tags unless the description asks for it.
- NEVER add tags that would degrade quality (no "blurry", "low res", etc).`;

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
        if (!response.ok) return { flat: '', raw: '' };
        let text = await response.text();

        if (url.endsWith('.html')) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const junk = doc.querySelectorAll('script, style, nav, header, footer, .menu, #sidebar');
            junk.forEach(el => el.remove());
            const contentNode = doc.querySelector('main') || doc.querySelector('.content') || doc.body;
            text = contentNode.innerText || contentNode.textContent;
            // HTML: collapse whitespace is fine, structure is gone anyway
            const flat = text.replace(/\s+/g, ' ').trim().substring(0, 5000);
            return { flat: `QUELLE: ${url}\nINHALT: ${flat}`, raw: flat };
        } else {
            // MD/TXT: preserve newlines for regex matching!
            const trimmed = text.trim().substring(0, 8000);
            const flat = trimmed.replace(/\s+/g, ' ').trim(); // only for search scoring
            return { flat: `QUELLE: ${url}\nINHALT: ${flat}`, raw: trimmed };
        }
    } catch (e) {
        console.error("Fehler beim Entziffern:", e);
        return { flat: '', raw: '' };
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
                if (!url.includes('/games/released/Raufbold3bs-Scratch-Archive/Raufbold3bs-Scratch-Archive/')) {
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
        const { flat, raw } = await fetchFileContent(url);
        if (!flat) return null;
        return {
            url,
            text: flat.replace(/^QUELLE:.*?\nINHALT:/, '').toLowerCase(), // für Suche: lowercase, flach
                                           rawText: raw, // für Bildextraktion: Original-Markdown mit Zeilenumbrüchen!
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

    // URL-Pfad als zusätzliche Suchbasis (Dateiname + Ordnername)
    const scored = searchIndex.map(doc => {
        let score = 0;
        if (/wer|wer ist|charakter/i.test(msgLower) && doc.url.includes('/wiki/')) score += 15;
        if (/geschichte|lore|hintergrund/i.test(msgLower) && doc.url.includes('/lore/')) score += 15;
        if (/studio|über euch|trafkhop/i.test(msgLower) && doc.url.includes('/studio/')) score += 15;
        if (doc.isBackup && !wantsBackup) return { doc, score: -1 };

        // URL-Segmente extrahieren (z.B. "Ursel" aus ".../Worlds/Ursel/Ursel.md")
        const urlLower = doc.url.toLowerCase();
        const urlSegments = urlLower.split(/[\/\.\-_]/).filter(s => s.length > 2);

        words.forEach(word => {
            // Textinhalt
            if (doc.text.includes(word)) score += 8;
            if (word.length > 4 && doc.text.includes(word.substring(0, 4))) score += 3;
            // URL-Pfad – exakter Treffer im Segment zählt stark (Dateiname = Thema)
            if (urlSegments.some(seg => seg === word)) score += 20;
            // URL-Pfad Teilmatch
            if (urlSegments.some(seg => seg.includes(word) || word.includes(seg))) score += 8;
        });
            if (doc.url.includes('/wiki/') || doc.url.includes('/lore/')) score += 5;
            return { doc, score };
    });

    const topDocs = scored.filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 5).map(x => x.doc);
    if (topDocs.length === 0) return '';

    return topDocs.map((d, i) => {
        const label = i === 0 ? `[HAUPT-QUELLE]\nQUELLE: ${d.url}` : `QUELLE: ${d.url}`;
        return `${label}\nINHALT: ${d.text.substring(0, 4000)}`;
    }).join('\n\n---\n\n');
}

// ================================
// BILDBESCHREIBUNG EXTRAKTION
// Sucht in Markdown-Dateien nach:
//   ### Bildbeschreibung: (oder ### <Name>Beschreibung:)
//   Direkt nach dem gesuchten Begriff (z.B. "# Ursel" → nächste Bildbeschreibung)
// ================================
function extractBildbeschreibung(query, rawContext) {
    if (!rawContext) return null;

    const queryLower = query.toLowerCase();

    // Strategie 1: Suche nach "Bildbeschreibung:" direkt nach einer passenden Überschrift
    // Unterstützt: ### Bildbeschreibung:, #### Bildbeschreibung:, **Bildbeschreibung:**
    // Findet auch: ### Ursel Beschreibung:, ### size: (überspringen), etc.
    const bildbeschreibungRegex = /(?:#{0,6}\s*picture description of:.*\n)([\s\S]*?)(?=\n#{0,6}\s|\n\*\*|\n---|\n\n\n|$)/gi;

    // Strategie 2: Suche explizit nach dem Query-Begriff und extrahiere nächste Beschreibung
    // z.B. wenn query = "ursel" → suche "# Ursel" oder "## Ursel" und hole Bildbeschreibung danach
    const sections = rawContext.split(/(?=#{1,6}\s)/);

    for (const section of sections) {
        // Prüfe ob dieser Abschnitt zum Query passt
        const firstLine = section.split('\n')[0].toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
        const sectionMatches = queryWords.some(word => firstLine.includes(word));

        if (sectionMatches || sections.length === 1) {
            // Suche in diesem Abschnitt nach einer Bildbeschreibung
            const match = section.match(/(?:#{0,6}\s*|\*\*)?picture description of:.*\n([\s\S]*?)(?=\n#{1,6}|\n---|\n\n\n|$)/i);
            if (match && match[1].trim().length > 20) {
                return match[1].trim();
            }
        }
    }

    // Strategie 3: Globale Suche nach irgendeiner Bildbeschreibung im Kontext
    const globalMatch = rawContext.match(/(?:#{0,6}\s*|\*\*)?picture description of:.*\n([\s\S]*?)(?=\n#{1,6}|\n---|\n\n\n|$)/i);
    if (globalMatch && globalMatch[1].trim().length > 20) {
        return globalMatch[1].trim();
    }

    return null;
}

// Holt den rawText der Top-Dokumente für Bildextraktion
async function fetchRawContextForImage(query) {
    if (!indexReady) return { context: '', rawText: '' };
    const msgLower = query.toLowerCase();
    const words = msgLower.split(/\W+/).filter(w => w.length > 2);

    const scored = searchIndex.map(doc => {
        let score = 0;
        words.forEach(word => {
            if (doc.text.includes(word)) score += 8;
            if (word.length > 4 && doc.text.includes(word.substring(0, 4))) score += 3;
        });
            // Bonus für URLs die den Suchbegriff direkt im Pfad haben
            words.forEach(word => {
                if (doc.url.toLowerCase().includes(word)) score += 20;
            });
                if (doc.url.includes('/wiki/') || doc.url.includes('/lore/')) score += 5;
                return { doc, score };
    });

    const allScored = scored.filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    const topDocs = allScored.slice(0, 3);

    if (topDocs.length === 0) {
        console.warn(`⚠️ Keine Dokumente für Query "${query}" gefunden! Scores alle 0.`);
        console.log("📋 Index enthält", searchIndex.length, "Dokumente");
        console.log("📋 URL-Probe:", searchIndex.slice(0,3).map(d => d.url));
    } else {
        console.log("🔍 Top-Dokumente:", topDocs.map(x => `score:${x.score} → ${x.doc.url.split('/').slice(-2).join('/')}`));
    }

    const contextText = topDocs.map(x => x.doc.text.substring(0, 3000)).join('\n\n---\n\n');
    const rawText = topDocs.length > 0 ? (topDocs[0].doc.rawText || topDocs[0].doc.text) : '';

    return { context: contextText, rawText };
}

// Nutzt das LLM um aus einer Lore-Beschreibung einen guten Bildprompt zu bauen
async function buildImagePromptWithLLM(query, beschreibung) {
    const userMsg = `Convert this lore description into a Stable Diffusion / FLUX image prompt.
    Subject/Query: "${query}"
    Lore description:
    ${beschreibung}`;

    try {
        const body = {
            messages: [
                { role: "system", content: IMAGE_PROMPT_SYSTEM },
                { role: "user", content: userMsg }
            ]
        };
        const response = await fetch(PROXY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error("LLM nicht erreichbar");
        const result = await response.json();
        return result?.choices?.[0]?.message?.content?.trim() || null;
    } catch (e) {
        console.warn("LLM Prompt-Bau fehlgeschlagen:", e);
        return null;
    }
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

// generateImage() entfernt – Bildgenerierung läuft jetzt über HF Space Link + Prompt

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
        loadingDiv.innerHTML = `<b style="color:#9069da;">System:</b> <p><em>...Ich forme einen Bildprompt aus den Archiven...</em></p>`;
        chatWindow.appendChild(loadingDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        try {
            // RAG: Kontext + Rohdaten holen
            const { context, rawText } = await fetchRawContextForImage(query);

            let imagePrompt = query; // Fallback: nur der Name

            // Schritt 1: Versuche eine Bildbeschreibung aus dem Markdown zu extrahieren
            const bildbeschreibung = extractBildbeschreibung(query, rawText);

            if (bildbeschreibung) {
                // Schritt 2: LLM baut daraus einen sauberen SDXL/FLUX Prompt
                console.log("✅ Bildbeschreibung gefunden:", bildbeschreibung.substring(0, 100));
                const llmPrompt = await buildImagePromptWithLLM(query, bildbeschreibung);
                imagePrompt = llmPrompt || bildbeschreibung.substring(0, 400);
            } else if (context) {
                // Kein Bildbeschreibung-Block → LLM aus allgemeinem Kontext
                console.log("⚠️ Keine Bildbeschreibung gefunden, nutze Kontext...");
                const llmPrompt = await buildImagePromptWithLLM(query, context.substring(0, 600));
                imagePrompt = llmPrompt || `${query}, fantasy concept art`;
            }

            console.log("🎨 Finaler Bildprompt:", imagePrompt);

            document.getElementById(loadingId)?.remove();

            const promptId = 'prompt-' + Date.now();
            const spaceLink = IMAGE_SPACE_URL;

            addMessage('System', `
            *Ein Bild formt sich in meinem Geist...*<br><br>
            <b style="color:#c9a0ff;">✦ Bildprompt für "${query}":</b><br>
            <div id="${promptId}" style="
            background: #1e0f3a;
            border: 1px solid #5a3998;
            border-radius: 8px;
            padding: 10px;
            margin: 8px 0;
            font-size: 13px;
            color: #e8d8ff;
            word-break: break-word;
            white-space: pre-wrap;
            ">${imagePrompt}</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
            <a class="do" style="display:inline-block; padding:6px 14px; border-radius:8px; background:#5a3998; cursor:pointer; font-size:13px; text-decoration:none;"
            onclick="navigator.clipboard.writeText(document.getElementById('${promptId}').innerText).then(()=>this.innerText='✓ Kopiert!'); return false;">
            📋 Prompt kopieren
            </a>
            <a class="do" href="${spaceLink}" target="_blank" style="display:inline-block; padding:6px 14px; border-radius:8px; background:#371c67; cursor:pointer; font-size:13px; text-decoration:none;">
            🎨 Bild auf HuggingFace generieren →
            </a>
            </div>
            <p style="font-size:12px; color:#9069da; margin-top:6px;"><em>Prompt kopieren → auf HuggingFace einfügen → Bild generieren lassen</em></p>
            `);
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
            ? `Hier sind Fragmente aus der Bibleothek:\n${context}\n\nBeantworte die folgende Frage AUSSCHLIESSLICH mit Informationen aus diesen Fragmenten - Beantworte die Frage primär auf Basis der HAUPT-QUELLE. Andere Quellen sind nur ergänzend.\n\nFrage: ${text}`
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
    const toggleBtn = document.getElementById('toggle-chatbot');
    const chatContent = document.getElementById('alfonz-content');

    if (toggleBtn && chatContent) {
        toggleBtn.addEventListener('click', () => {
            chatContent.classList.toggle('hidden');
        });
    }

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
