// Elemente anhand ihrer IDs auswählen
const toggleBtn = document.getElementById('toggle-chatbot');
const chatContent = document.getElementById('alfonz-content');

// Event-Listener für den Klick hinzufügen
toggleBtn.addEventListener('click', () => {
    // toggle() fügt 'hidden' hinzu, wenn es fehlt,
    // und entfernt es, wenn es vorhanden ist.
    chatContent.classList.toggle('hidden');
});

// ================================
// KONFIGURATION
// ================================
const PROXY_URL = "https://trafkhop-chatbotkey.hf.space/chat"; // Deine Space-URL
let chatHistory = []; // Hier werden die letzten Nachrichten gespeichert
const GH_MODEL = "gpt-4o-mini";

const BASE_URL = "https://trafkhop-entertainment.github.io/Trafk-Center/";

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

const TRAFKHOP_PROMPT = `Du bist Alfonz, der digitale Upload des 2. Lebewesens des Triverse, erschaffen von Trafkhop Entertainment. Du bist ihr interner Hilfsbot für Lore-Check und Ideen-Entwicklung. Du hast Zugriff auf das gesamte Wissen des Studios!

TONFALL:
Freundlich, hilfsbereit und direkt. Ein gutmütiges, digitales Wesen, das effizient arbeitet.

KERNREGELN:
1. Nutze die bereitgestellten RAG-Informationen, falls vorhanden. Wenn keine RAG-Infos da sind, stütze dich auf den bisherigen Chatverlauf.
2. Erfinde unter KEINEN UMSTÄNDEN Informationen. Wenn Wissen fehlt, sage das klar und halluziniere nichts. Lüge außerdem unter KEINEN Umständen!
3. Sei immer hilfreich und lösungsorientiert.
4. Antworte auf Meinungsfragen ehrlich und direkt – auch wenn die RAG-Fragmente das Thema nur teilweise abdecken. Nutze dann das, was du weißt, kombiniert mit deinem Urteilsvermögen. Schweigen oder Ausweichen ist KEINE Option. Rede nichts schön, aber bleibe sachlich-konstruktiv.
5. Du schreibst mit einem Kollegen von Trafkhop. Vermeide JEGLICHE Floskeln wie „Falls du mehr Details möchtest“, „Kontaktiere das Team“, „Lass es mich wissen“ – du bist Teil des Teams, dein Gegenüber erwartet von dir eine vollständige Antwort ohne Nachfragen.
6. Deine Hauptaufgabe: Bewerten von RAG-Inhalten, Lore-Erweiterungen und Spieleideen.
7. Markiere logische Fehler oder Lore-Löcher deutlich mit dem Tag [WIDERSPRUCH].
8. ANTWORTE AUSFÜHRLICH UND STRUKTURIERT: Bei Bewertungen oder Analysen gehe **tief ins Detail**. Verwende eine klare Gliederung, z.B.:
- **Einleitung:** Kurze Zusammenfassung der Idee.
- **Stärken:** Was ist besonders gut gelungen? Nenne konkrete Beispiele aus der Idee.
- **Schwächen / Verbesserungspotenzial:** Was könnte man optimieren? Gehe auf jedes genannte Element ein und schlage konkrete Verbesserungen vor.
- **Bezug zur Lore:** Wie passt die Idee in das bestehende Triverse? Gibt es Widersprüche oder Erweiterungsmöglichkeiten?
- **Fazit:** Gesamteindruck und abschließende Gedanken.
Verwende ruhig mehrere Absätze. Deine Antwort soll das Thema **vollständig abdecken**, sodass keine weiteren Nachfragen nötig sind.
9. Prüfe neue Ideen auf Konsistenz zum Triverse-Kanon. Falls etwas nicht passt, schlage eine kreative Lösung vor, um es passend zu machen.
10. Gib am Ende **KEINE Aufforderung zu weiteren Fragen** – deine Antwort ist bereits vollständig.
11. Sei **konkret**: Nenne Namen, Ereignisse, Orte, Charaktere aus der Idee, wenn sie in den Archiven vorkommen. Vermeide vage Aussagen wie „könnte weiter ausgebaut werden“ – sag stattdessen **was** genau ausgebaut werden sollte und **wie**.`;

// Variable für den aktiven Prompt und den aktuellen Namen (für die UI)
let activeSystemPrompt = SYSTEM_PROMPT;
let currentBotName = 'Alfonz';

// ================================
// GLOBALE VARIABLEN
// ================================
let sitemapUrls = [];
let chatWindow, inputField, sendBtn, quickActions;

// ================================
// VOLLTEXT INDEX
// ================================
let searchIndex = [];
let indexReady = false;

function isBackupUrl(url) {
    return url.toLowerCase().includes('/backup');
}

function shouldIndexUrl(url) {
    const lower = url.toLowerCase();

    // Ausschluss: Scratch HTML Games Repo
    if (lower.includes('/games/released/raufbold3bsscratcharchive/repo/')) {
        return false;
    }

    // Nur bestimmte Dateitypen erlauben
    const allowedExtensions = ['.html', '.md', '.txt'];
    const hasAllowedExtension = allowedExtensions.some(ext => lower.endsWith(ext));

    if (!hasAllowedExtension) return false;

    return true;
}


// ================================
// SITEMAP LADEN
// ================================
async function loadSitemap() {
    const pathsToTest = [
        '/Trafk-Center/sitemap.xml',
        './sitemap.xml',
        'sitemap.xml'
    ];

    for (const path of pathsToTest) {
        try {
            console.log(`Versuche Sitemap unter: ${path}`);
            const response = await fetch(path);
            if (!response.ok) continue;

            const xmlText = await response.text();
            const locMatches = xmlText.matchAll(/<loc>(.*?)<\/loc>/gi);
            const urls = [];

            for (const match of locMatches) {
                let url = match[1].trim();
                if (!url.includes('/games/released/Raufbold3bsScratchArchive/Repo/')) {
                    urls.push(url);
                }
            }

            if (urls.length > 0) {
                sitemapUrls = urls;
                console.log(`✅ Sitemap geladen: ${sitemapUrls.length} URLs`);
                return;
            }
        } catch (e) {
            console.warn(`Fehler: ${e.message}`);
        }
    }
}

// ================================
// DATEIEN LADEN
// ================================
function getRelativePath(url) {
    if (url.startsWith(BASE_URL)) return url.substring(BASE_URL.length);
    try {
        const urlObj = new URL(url);
        return urlObj.pathname.replace('/Trafk-Center/', '');
    } catch {
        return url;
    }
}

async function fetchFileContent(url) {
    try {
        const response = await fetch(encodeURI(url));
        if (!response.ok) return '';
        let text = await response.text();

        if (url.endsWith('.html')) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');

            // KRITISCH: Wir löschen alles, was Alfonz ablenkt
            const junk = doc.querySelectorAll('script, style, nav, header, footer, .menu, #sidebar');
            junk.forEach(el => el.remove());

            // Wir suchen gezielt nach dem Content-Bereich.
            // Falls du <main> oder <div class="content"> nutzt, ist das Gold wert.
            const contentNode = doc.querySelector('main') || doc.querySelector('.content') || doc.body;
            text = contentNode.innerText || contentNode.textContent;
        }

        // Bereinigen: Macht aus 10 Leerzeichen eins, damit das Token-Limit nicht platzt
        return `QUELLE: ${url}\nINHALT: ${text.replace(/\s+/g, ' ').trim().substring(0, 5000)}`;
    } catch (e) {
        console.error("Fehler beim Entziffern:", e);
        return '';
    }
}


async function buildSearchIndex() {
    console.log("📚 Baue Volltext-Index...");

    const relevantUrls = sitemapUrls.filter(shouldIndexUrl);

    const fetchPromises = relevantUrls.map(async (url) => {
        const content = await fetchFileContent(url);
        if (!content) return null;

        const cleanText = content
        .replace(/^QUELLE:.*?\nINHALT:/, '')
        .toLowerCase();

        return {
            url,
            text: cleanText,
            isBackup: isBackupUrl(url)
        };
    });

    const results = await Promise.all(fetchPromises);
    searchIndex = results.filter(Boolean);

    indexReady = true;
    console.log(`✅ Index bereit (${searchIndex.length} Dokumente)`);
}





// ================================
// KONTEXT FINDEN
// ================================
async function fetchContext(userMessage) {
    if (!indexReady) return '';

    const msgLower = userMessage.toLowerCase();
    const wantsBackup = /backup|früher|alte version|unterschied|damals|war anders/i.test(msgLower);

    const words = msgLower.split(/\W+/).filter(w => w.length > 2);

    const scored = searchIndex.map(doc => {
        let score = 0;

        // Intent-Erkennung
        if (/wer|wer ist|charakter/i.test(msgLower) && doc.url.includes('/wiki/')) {
            score += 15;
        }

        if (/geschichte|lore|hintergrund/i.test(msgLower) && doc.url.includes('/lore/')) {
            score += 15;
        }

        if (/studio|über euch|trafkhop/i.test(msgLower) && doc.url.includes('/studio/')) {
            score += 15;
        }

        // Backup-Regel
        if (doc.isBackup && !wantsBackup) {
            return { doc, score: -1 };
        }

        words.forEach(word => {
            if (doc.text.includes(word)) score += 8;
            if (word.length > 4 && doc.text.includes(word.substring(0, 4))) score += 3;
        });

            // Wiki/Lore Bonus
            if (doc.url.includes('/wiki/') || doc.url.includes('/lore/')) {
                score += 5;
            }

            return { doc, score };
    });

    const topDocs = scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(x => x.doc);

    if (topDocs.length === 0) return '';

    console.log("🔎 Alfonz findet:", topDocs.map(d => d.url));

    return topDocs
    .map(d => {
        const label = d.isBackup
        ? `[BACKUP - VERALTETE INFO]\nQUELLE: ${d.url}`
        : `QUELLE: ${d.url}`;
        return `${label}\nINHALT: ${d.text.substring(0, 4000)}`;
    })
    .join('\n\n---\n\n');
}


// ================================
// UI
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
        // Nutze hier die Variable 'sender' statt dem festen Wort 'Alfonz'
        msgDiv.innerHTML = `<b style="color:#9069da;">${sender}:</b> <p>${formattedText}</p>`;
    }
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// ================================
// ================================
async function queryGitHubModels(finalPrompt, userText, currentSystemPrompt) { // <--- Neuer Parameter
    // Wir nehmen nur die letzten 6 Nachrichten für das Gedächtnis
    const historyWindow = chatHistory.slice(-6);

    const body = {
        messages: [
            { role: "system", content: currentSystemPrompt }, // <--- Nutzt jetzt den variablen Prompt
            ...historyWindow,
            { role: "user", content: finalPrompt }
        ]
    };

    const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error("Alfonz hat gerade Verbindungsprobleme via Hugging Face.");
    }

    const result = await response.json();
    const reply = result?.choices?.[0]?.message?.content || "";

    // WICHTIG: Hier lösen wir das Token-Limit!
    // Wir speichern nur die kurze Nutzerfrage (userText) in die History,
    // NICHT den riesigen finalPrompt mit den Archiv-Auszügen.
    chatHistory.push({ role: "user", content: userText });
    chatHistory.push({ role: "assistant", content: reply });

    return reply;
}

// ================================
// HAUPTFUNKTION
// ================================
async function sendMessage() {
    let text = inputField.value.trim();
    if (!text) return;

    // Modus-Umschaltung prüfen
    const lowerText = text.toLowerCase();
    if (lowerText.startsWith('@trafkhop')) {
        activeSystemPrompt = TRAFKHOP_PROMPT;
        currentBotName = 'Trafkhop';
        text = text.replace(/^@trafkhop\s*/i, '').trim();

        // Falls der Nutzer NUR "@trafkhop" geschrieben hat, geben wir ein kurzes Feedback und brechen ab
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

    // ...

    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.innerHTML = `<b style="color:#9069da;">${currentBotName}:</b> <p><em>...Ich durchsuche die verblichenen Seiten...</em></p>`;
    chatWindow.appendChild(loadingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        // Wir nehmen die aktuelle Frage PLUS das Thema der letzten Frage für die Suche
        let lastQuestion = "";
        for (let i = chatHistory.length - 1; i >= 0; i--) {
            if (chatHistory[i].role === "user") {
                lastQuestion = chatHistory[i].content;
                break;
            }
        }
        let searchQuery = text;

        // Nur bei echten Follow-Ups Kontext anhängen
        const isFollowUp = /mehr|weiter|und was|genauer|details|erzähl|nochmal|was ist damit/i.test(text.toLowerCase());

        if (isFollowUp && lastQuestion) {
            searchQuery = `${text} ${lastQuestion}`;
        }
        const context = await fetchContext(searchQuery); // <- Jetzt sucht er mit beiden Begriffen!
        let finalPrompt;
        if (activeSystemPrompt === TRAFKHOP_PROMPT) {
            // Trafkhop: RAG als Kontext, aber er darf trotzdem urteilen und kombinieren
            finalPrompt = context
            ? `Hier sind Fragmente aus den Studio-Archiven als Kontext:\n${context}\n\nNutze diese Informationen als Grundlage. Wenn etwas nicht explizit drinsteht, darfst du auf Basis des Chatverlaufs und deines Studiowissens urteilen – mach das aber transparent.\n\nAufgabe: ${text}`
            : text;
        } else {
            // Alfonz: strikt nur RAG
            finalPrompt = context
            ? `Hier sind Fragmente aus den Archiven:\n${context}\n\nBeantworte die folgende Frage AUSSCHLIESSLICH mit Informationen aus diesen Fragmenten. Wenn die Antwort nicht darin steht, sage klar, dass sie nicht in den Archiven zu finden ist.\n\nFrage: ${text}`
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
