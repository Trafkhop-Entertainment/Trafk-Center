// ================================
// KONFIGURATION
// ================================
const GH_TOKEN = "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";
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

// ================================
// GLOBALE VARIABLEN
// ================================
let sitemapUrls = [];
let chatWindow, inputField, sendBtn, quickActions;

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

// ================================
// KONTEXT FINDEN
// ================================
async function fetchContext(userMessage) {
    const msgLower = userMessage.toLowerCase();
    // Zerlegt die Nachricht in Wörter und filtert Füllwörter raus
    const words = msgLower.split(/\W+/).filter(w => w.length > 2);

    const urlScores = sitemapUrls.map(url => {
        const urlLower = url.toLowerCase();
        let score = 0;

        words.forEach(word => {
            // 1. Volltreffer im Dateinamen (sehr wichtig)
            if (urlLower.includes(word)) score += 15;

            // 2. "Sloppy" Match: Erkennt auch Teilwörter (z.B. "hop" findet "hoppitex")
            // Wir prüfen, ob das Wort zumindest zu 70% im Dateinamen vorkommt
            if (word.length > 3 && urlLower.includes(word.substring(0, 4))) score += 5;
        });

        // 3. Bonus für Wiki/Lore-Ordner
        if (score > 0 && (urlLower.includes('wiki') || urlLower.includes('lore'))) {
            score += 10;
        }

        return { url, score };
    });

    // Wir nehmen die Top 3 der am besten passenden Dateien
    const topUrls = urlScores
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.url);

    if (topUrls.length === 0) return '';

    console.log("Alfonz durchsucht die Archive für:", topUrls);

    const contents = await Promise.all(topUrls.map(url => fetchFileContent(url)));
    return contents.filter(c => c.length > 10).join('\n\n---\n\n');
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
        msgDiv.innerHTML = `<b style="color:#9069da;">Alfonz:</b> <p>${formattedText}</p>`;
    }
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// ================================
// ================================
async function queryGitHubModels(prompt) {
    const URL = "https://models.inference.ai.azure.com/chat/completions";

    // Wir nehmen die letzten 6 Nachrichten (3x User, 3x Alfonz),
    // damit das Gedächtnis nicht zu groß für die API wird.
    const historyWindow = chatHistory.slice(-6);

    const body = {
        model: GH_MODEL,
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...historyWindow, // Die bisherigen Nachrichten werden hier eingefügt
            { role: "user", content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 500
    };

    const response = await fetch(URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GH_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(`GitHub API Fehler: ${err.error?.message || response.statusText}`);
    }

    const result = await response.json();
    const reply = result.choices[0].message.content;

    // Speichere die aktuelle Unterhaltung im Gedächtnis
    chatHistory.push({ role: "user", content: prompt });
    chatHistory.push({ role: "assistant", content: reply });

    return reply;
}

// ================================
// HAUPTFUNKTION
// ================================
async function sendMessage() {
    const text = inputField.value.trim();
    if (!text) return;

    addMessage('Du', text);
    inputField.value = '';

    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.innerHTML = '<b style="color:#9069da;">Alfonz:</b> <p><em>...Ich durchsuche die verblichenen Seiten...</em></p>';
    chatWindow.appendChild(loadingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        // Wir nehmen die aktuelle Frage PLUS das Thema der letzten Frage für die Suche
        const lastQuestion = chatHistory.length > 0 ? chatHistory[chatHistory.length - 2].content : "";
        const searchQuery = `${text} ${lastQuestion}`;
        const context = await fetchContext(searchQuery); // <- Jetzt sucht er mit beiden Begriffen!
        const finalPrompt = context
        ? `Hier sind Fragmente aus den Archiven:\n${context}\n\nAntworte basierend darauf auf die Frage: ${text}`
        : text;

        const reply = await queryGitHubModels(finalPrompt);

        document.getElementById(loadingId)?.remove();

        if (!reply) {
            addMessage('Alfonz', '*räuspert sich* ... Die Erinnerungen sind heute wirr.');
        } else {
            addMessage('Alfonz', reply);
        }
    } catch (e) {
        document.getElementById(loadingId)?.remove();
        addMessage('Alfonz', `*zittert leicht* ... Die Verbindung ist abgerissen. (Fehler: ${e.message})`);
        console.error(e);
    }
}

// ================================
// INIT
// ================================
document.addEventListener('DOMContentLoaded', function() {
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

        loadSitemap();
});
