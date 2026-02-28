// ================================
// UI ELEMENTE & EVENT LISTENER
// ================================
let chatWindow, inputField, sendBtn, quickActions;

// ================================
// KONFIGURATION & GLOBALE VARIABLEN
// ================================
const PROXY_URL = "https://trafkhop-alfonzproxy.hf.space/chat";
const IMAGE_SPACE_URL = "https://huggingface.co/spaces/Qwen/Qwen-Image oder https://creator.nightcafe.studio/ai-image-generator"; // ← Hier deine HF Space URL eintragen
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

const IMAGE_PROMPT_SYSTEM = `You are an expert at assembling image generation prompts for models like FLUX or Qwen.
You will receive a list of lore descriptions for specific subjects (characters, locations, magic concepts, objects, etc.) that the user wants in one image.
Your job: Arrange and combine these pre-written lore descriptions into one coherent image prompt.

RULES:
- Output ONLY the final prompt. No explanation, no preamble, no labels like "Here is the prompt:".
- Do NOT invent visual details that are not in the provided lore descriptions. Use exactly what is given.
- Exception: If a subject has NO lore description (marked as [NOT IN WIKI]), you may add a small, plausible visual detail (max 1-2 descriptors) that fits the fantasy setting. Keep it minimal.
- Arrange subjects logically: main character/subject first, then companions/secondary subjects, then environment/world, then atmosphere/lighting.
- Merge overlapping details (e.g. if two descriptions both mention purple colors, don't repeat it).
- Use comma-separated descriptors, not full sentences.
- End with appropriate style tags, e.g.: "fantasy concept art, digital painting, highly detailed, atmospheric lighting".
- NEVER add quality-degrading tags (no "blurry", "low res", "watermark").
- NEVER turn a location or world into a character standing in front of it.`;

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
    if (!indexReady) return { topDocs: [], rawText: '' };
    const msgLower = query.toLowerCase();
    const words = msgLower.split(/\W+/).filter(w => w.length > 2);

    const scored = searchIndex.map(doc => {
        let score = 0;
        words.forEach(word => {
            if (doc.text.includes(word)) score += 8;
            if (word.length > 4 && doc.text.includes(word.substring(0, 4))) score += 3;
            if (doc.url.toLowerCase().includes(word)) score += 20;
        });
        if (doc.url.includes('/wiki/') || doc.url.includes('/lore/')) score += 5;
        return { doc, score };
    });

    const allScored = scored.filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    const topDocs = allScored.slice(0, 5);

    if (topDocs.length === 0) {
        console.warn(`⚠️ Keine Dokumente für Query "${query}" gefunden!`);
        console.log("📋 Index enthält", searchIndex.length, "Dokumente");
    } else {
        console.log("🔍 Top-Dokumente:", topDocs.map(x => `score:${x.score} → ${x.doc.url.split('/').slice(-2).join('/')}`));
    }

    const rawText = topDocs.length > 0 ? (topDocs[0].doc.rawText || topDocs[0].doc.text) : '';
    return { topDocs, rawText };
}

// Zweite Such-Runde: extrahiert Begriffe aus Kontext und sucht nochmal danach
async function expandImageContext(topDocs, alreadyUsedUrls) {
    if (!indexReady || topDocs.length === 0) return [];

    const combinedText = topDocs.map(x => x.doc.rawText || x.doc.text).join(' ');

    // Extrahiere Begriffe aus Wiki-Links [[Begriff]], Fettdruck **Begriff**, Überschriften
    const extracted = new Set();
    for (const m of combinedText.matchAll(/\[\[([^\]|#]{2,40})\]\]/g)) extracted.add(m[1].trim().toLowerCase());
    for (const m of combinedText.matchAll(/\*\*([^*]{3,30})\*\*/g)) extracted.add(m[1].trim().toLowerCase());
    for (const m of combinedText.matchAll(/^#{1,4}\s+(.+)$/gm)) extracted.add(m[1].trim().toLowerCase());

    const stopWords = new Set(['the','and','or','in','of','a','an','is','are','was','with','on','at','by','from','to','for','that','this','it','its','not','but','all','as','be','has','have','had','do','did','if','so','no','yes','der','die','das','und','ist','ein','eine','des','dem','den','von','zu','auf','auch','sich','er','sie','es','wir','ihr','hat','wird','nach','nur','noch','dann','wenn','aber','mehr','hier','dort','kann','sehr','wie','was','wer','wo','ihn','ihm']);
    const terms = [...extracted].filter(t => t.length > 3 && !stopWords.has(t)).slice(0, 12);

    console.log("🔎 Expandiere Kontext mit Begriffen:", terms.slice(0, 8));

    const extraDocs = [];
    for (const term of terms) {
        const termWords = term.split(/\W+/).filter(w => w.length > 2);
        const matches = searchIndex
            .filter(doc => !alreadyUsedUrls.has(doc.url))
            .map(doc => {
                let score = 0;
                termWords.forEach(word => {
                    if (doc.url.toLowerCase().includes(word)) score += 25;
                    if (doc.text.includes(word)) score += 8;
                });
                if (doc.url.includes('/wiki/') || doc.url.includes('/lore/')) score += 5;
                return { doc, score };
            })
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 1);

        for (const x of matches) {
            alreadyUsedUrls.add(x.doc.url);
            extraDocs.push(x.doc);
        }
    }

    console.log(`📚 Erweitert um ${extraDocs.length} zusätzliche Dokumente`);
    return extraDocs;
}

// Parst den User-Query in einzelne Such-Begriffe
// "Ursel mit viel Zauberkraft und Pyley" → ["Ursel", "Zauberkraft", "Pyley"]
function parseImageQueryTerms(query) {
    // Trennwörter entfernen und splitten
    const cleaned = query
        .replace(/\b(mit|und|von|auf|in|an|bei|durch|für|gegen|neben|über|unter|vor|zwischen|viel|wenig|ein|eine|einen|a|an|with|and|of|the|in|on|at|some|lot|of)\b/gi, ' ')
        .replace(/\s+/g, ' ').trim();

    // Nach Großschreibung splitten (Eigennamen) + normale Wörter
    const candidates = cleaned.split(/[,;]+|\s+/).map(s => s.trim()).filter(s => s.length > 2);

    // Deduplizieren, Groß/Kleinschreibung ignorieren
    const seen = new Set();
    return candidates.filter(t => {
        const key = t.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// Sucht für einen einzelnen Begriff das beste Dokument und extrahiert dessen Bildbeschreibung
function fetchBildbeschreibungForTerm(term) {
    if (!indexReady) return { term, beschreibung: null, doc: null };
    const termLower = term.toLowerCase();
    const termWords = termLower.split(/\W+/).filter(w => w.length > 2);

    const scored = searchIndex.map(doc => {
        let score = 0;
        termWords.forEach(word => {
            if (doc.url.toLowerCase().includes(word)) score += 30;
            if (doc.text.includes(word)) score += 8;
        });
        if (doc.url.includes('/wiki/') || doc.url.includes('/lore/')) score += 5;
        if (doc.url.endsWith('.md')) score += 20;
        // Spieleideen haben meist keine Bildbeschreibungen → stark abwerten
        if (doc.url.toLowerCase().includes('/gameideas/') || doc.url.toLowerCase().includes('/sourcehop-notes/')) score -= 40;
        return { doc, score };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
        console.log(`❌ Kein Dokument für "${term}" gefunden`);
        return { term, beschreibung: null, doc: null };
    }

    const bestDoc = scored[0].doc;
    console.log(`🔍 "${term}" → ${bestDoc.url.split('/').slice(-2).join('/')} (score: ${scored[0].score})`);

    const rawText = bestDoc.rawText || bestDoc.text;
    let beschreibung = null;

    // Suche nach "picture description of:" – funktioniert in Markdown UND flachem HTML-Text
    const picIdx = rawText.search(/picture description of:/i);
    if (picIdx !== -1) {
        const fromPic = rawText.substring(picIdx);
        // Ende des Blocks: nächste Markdown-Überschrift oder max 3000 Zeichen
        const endMatch = fromPic.search(/\n#{1,6}\s|\n---|\n\n\n/);
        beschreibung = (endMatch > 20 ? fromPic.substring(0, endMatch) : fromPic.substring(0, 3000)).trim();
        console.log(`✅ Bildbeschreibung für "${term}" gefunden (${beschreibung.length} Zeichen)`);
    }

    if (!beschreibung) {
        console.log(`⚠️ Kein Bildbeschreibungs-Block für "${term}", nutze Roh-Kontext`);
    }

    const fallbackText = rawText ? rawText.substring(0, 3000) : null;
    return { term, beschreibung: beschreibung || fallbackText, hasRealDescription: !!beschreibung, doc: bestDoc };
}

// Kombiniert mehrere Lore-Beschreibungen zu einem Bildprompt
// termResults = [{ term, beschreibung: string|null }, ...]
async function buildImagePromptWithLLM(termResults) {
    // Baue den User-Message aus allen Begriffen auf
    const sections = termResults.map(({ term, beschreibung }) => {
        if (beschreibung) {
            return `SUBJECT: "${term}"\nLORE DESCRIPTION:\n${beschreibung}`;
        } else {
            return `SUBJECT: "${term}"\n[NOT IN WIKI - invent minimal plausible visual descriptor]`;
        }
    }).join('\n\n---\n\n');

    const userMsg = `Combine the following lore descriptions into one image generation prompt.
Each section describes one subject that should appear in the image.

${sections}

Arrange them into a single, coherent image prompt.`;

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
            // Schritt 1: Query in einzelne Begriffe aufteilen
            const terms = parseImageQueryTerms(query);
            console.log(`🧩 Query-Begriffe: [${terms.join(', ')}]`);

            // Schritt 2: Für jeden Begriff die Bildbeschreibung aus dem Wiki holen
            const termResults = terms.map(term => fetchBildbeschreibungForTerm(term));

            const found = termResults.filter(r => r.beschreibung).length;
            const notFound = termResults.filter(r => !r.beschreibung).map(r => r.term);
            console.log(`📚 ${found}/${terms.length} Begriffe im Wiki gefunden. Nicht gefunden: [${notFound.join(', ')}]`);

            // Schritt 3: LLM kombiniert alle Beschreibungen zu einem Prompt
            let imagePrompt = null;
            if (found > 0 || terms.length > 0) {
                imagePrompt = await buildImagePromptWithLLM(termResults);
            }

            // Fallback: erste gefundene Beschreibung roh nehmen
            if (!imagePrompt) {
                const firstFound = termResults.find(r => r.beschreibung);
                imagePrompt = firstFound
                    ? firstFound.beschreibung.substring(0, 500) + ', fantasy concept art'
                    : `${query}, fantasy concept art`;
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
