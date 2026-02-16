// ================================
// KONFIGURATION (ergänzt)
// ================================
const HF_TOKEN = "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";
const PRIMARY_MODEL = "mistralai/Mixtral-8x7B-Instruct-v0.1";
const FALLBACK_MODEL = "mistralai/Mistral-7B-Instruct-v0.2"; // bleibt
let currentModel = PRIMARY_MODEL;

// Öffentlicher CORS-Proxy (nur für Tests!)
const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";

// ... (den Rest unverändert lassen bis zur Funktion queryHuggingFace)

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
// SITEMAP LADEN (per Regex, tolerant)
// ================================
async function loadSitemap() {
    // Mögliche Pfade testen (Reihenfolge = Priorität)
    const pathsToTest = [
        '/Trafk-Center/sitemap.xml',   // absolut ab Server-Root
        './sitemap.xml',                // relativ zum aktuellen Verzeichnis
        'sitemap.xml'                    // direkt im gleichen Ordner
    ];

    for (const path of pathsToTest) {
        try {
            console.log(`Versuche Sitemap unter: ${path}`);
            const response = await fetch(path);
            if (!response.ok) {
                console.warn(`-> Status ${response.status}`);
                continue;
            }
            const xmlText = await response.text();
            console.log('Sitemap geladen (Auszug):', xmlText.substring(0, 200));

            // Extrahiere alle <loc>…</loc> Inhalte per Regex – funktioniert auch bei XML-Fehlern
            const locMatches = xmlText.matchAll(/<loc>(.*?)<\/loc>/gi);
            const urls = [];
            for (const match of locMatches) {
                let url = match[1].trim();
                // Submodul ausschließen
                if (!url.includes('/games/released/Raufbold3bsScratchArchive/Repo/')) {
                    urls.push(url);
                }
            }

            if (urls.length > 0) {
                sitemapUrls = urls;
                console.log(`✅ Sitemap erfolgreich geladen: ${sitemapUrls.length} URLs (via ${path})`);
                return; // Erfolg – fertig
            } else {
                console.warn('Keine <loc>-Tags in der Sitemap gefunden.');
            }
        } catch (e) {
            console.warn(`Fehler beim Laden von ${path}:`, e.message);
        }
    }

    console.error('❌ Sitemap konnte mit keinem Pfad geladen werden.');
}

// ================================
// HILFSFUNKTION: Relativen Pfad extrahieren
// ================================
function getRelativePath(url) {
    if (url.startsWith(BASE_URL)) {
        return url.substring(BASE_URL.length);
    }
    try {
        const urlObj = new URL(url);
        return urlObj.pathname.replace('/Trafk-Center/', '');
    } catch {
        return url;
    }
}

// ================================
// DATEI INHALT HOLEN
// ================================
async function fetchFileContent(url) {
    const relativePath = getRelativePath(url);
    const fetchUrl = `/Trafk-Center/${relativePath}`;

    try {
        const response = await fetch(fetchUrl);
        if (!response.ok) return '';

        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();

        if (contentType.includes('text/html') || relativePath.endsWith('.html')) {
            const doc = new DOMParser().parseFromString(text, 'text/html');
            const bodyText = doc.body ? doc.body.textContent || '' : '';
            return bodyText.replace(/\s+/g, ' ').trim();
        } else {
            return text.replace(/\s+/g, ' ').trim();
        }
    } catch (e) {
        console.warn(`Fehler beim Abrufen von ${fetchUrl}:`, e);
        return '';
    }
}

// ================================
// RELEVANTE DOKUMENTE FINDEN
// ================================
async function fetchContext(userMessage) {
    const keywords = userMessage.toLowerCase()
        .split(' ')
        .filter(w => w.length > 3)
        .map(w => w.replace(/[^\w]/g, ''));

    if (keywords.length === 0) return '';

    const urlScores = sitemapUrls.map(url => {
        const urlLower = url.toLowerCase();
        const score = keywords.filter(k => urlLower.includes(k)).length;
        return { url, score };
    });

    const topUrls = urlScores
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(item => item.url);

    if (topUrls.length === 0) return '';

    const contents = await Promise.all(topUrls.map(url => fetchFileContent(url)));
    const contextParts = [];

    for (let i = 0; i < topUrls.length; i++) {
        if (contents[i]) {
            const trimmed = contents[i].length > 2000 ? contents[i].substring(0, 2000) + '…' : contents[i];
            contextParts.push(`Aus den Archiven (${topUrls[i]}):\n${trimmed}`);
        }
    }

    return contextParts.join('\n\n---\n\n');
}

// ================================
// UI: NACHRICHT HINZUFÜGEN
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
// HUGGING FACE API AUFRUF
// ================================
async function queryHuggingFace(prompt) {
    const body = {
        model: currentModel,
        inputs: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n${SYSTEM_PROMPT}<|eot_id|><|start_header_id|>user<|end_header_id|>\n${prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`,
        parameters: {
            max_new_tokens: 400,
            temperature: 0.6,
            return_full_text: false
        }
    };

    // ⚠️ Hier deine Vercel-Proxy-URL eintragen!
    const PROXY_URL = "https://chatbot-proxy-ochre.vercel.app/api/proxy";

    const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Unbekannter API-Fehler');
    }

    const result = await response.json();
    // Das Format der Antwort kann variieren; normalerweise ist es ein Array mit generated_text
    return result[0]?.generated_text || '';
}

// ================================
// HAUPTFUNKTION: NACHRICHT SENDEN
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
        const context = await fetchContext(text);
        const finalPrompt = context
            ? `Hier sind Fragmente aus den Archiven:\n${context}\n\nAntworte basierend darauf auf die Frage: ${text}`
            : text;

        let reply = '';
        try {
            reply = await queryHuggingFace(finalPrompt);
        } catch (primaryError) {
            console.warn('Primärmodell fehlgeschlagen, versuche Fallback:', primaryError);
            currentModel = FALLBACK_MODEL;
            reply = await queryHuggingFace(finalPrompt);
        }

        document.getElementById(loadingId)?.remove();

        if (!reply) {
            addMessage('Alfonz', '*räuspert sich* ... Die Erinnerungen sind heute wirr. Versuche es später noch einmal.');
        } else {
            addMessage('Alfonz', reply);
        }
    } catch (e) {
        document.getElementById(loadingId)?.remove();
        addMessage('Alfonz', `*zittert leicht* ... Die Verbindung zu den Archiven ist abgerissen. (Fehler: ${e.message})`);
        console.error(e);
    }
}

// ================================
// INIT: WARTEN BIS DOM BEREIT IST
// ================================
document.addEventListener('DOMContentLoaded', function() {
    chatWindow = document.getElementById('chat-window');
    inputField = document.getElementById('chat-input');
    sendBtn = document.getElementById('send-btn');
    quickActions = document.getElementById('quick-actions');

    if (!chatWindow || !inputField || !sendBtn) {
        console.error('❌ Chat-Elemente nicht gefunden! Prüfe die IDs im HTML.');
        return;
    }

    sendBtn.addEventListener('click', sendMessage);
    inputField.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });

    // Sitemap laden
    loadSitemap();
});