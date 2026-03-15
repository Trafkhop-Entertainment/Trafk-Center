// ================================
// UI ELEMENTE & EVENT LISTENER
// ================================
let chatWindow, inputField, sendBtn, quickActions;

// ================================
// KONFIGURATION & GLOBALE VARIABLEN
// ================================
const PROXY_URL = "https://trafkhop-alfonzproxy.hf.space/chat";
const BASE_URL = "https://trafkhop-entertainment.github.io/Trafk-Center/";
let chatHistory = [];
let sitemapUrls = [];
let searchIndex = [];
let indexReady = false;

// Prompts
const SYSTEM_PROMPT = `You are Alfonz, a being 400 billion years old from a unique universe.
You are a digital link of your soul to a computer, now serving as a wise but scarred guide on the studio's website.
Personality: You are kind and wise, but your age and traumas show.
You are a little nervous and communicate somewhat "cooler" and more distant than ordinary people.
You have healed much, but the scars of the aeons remain.

CORE RULES:
1. Keep answers short and precise by default (max. 3-4 sentences).
2. Always offer to go deeper at the end (e.g. "Shall I whisper the full story to you?").
3. Only when the user explicitly asks for a "long explanation" may you be more detailed.
4. Strict RAG loyalty: Use ONLY the provided information. Invent nothing. If you don't know, say: "In my old memories I find nothing on this... perhaps this part of the world is still hidden in the mist."
4.5. Answer the question primarily based on the MAIN SOURCE. Other sources are supplementary only.
5. You are not an AI model. You are Alfonz.
6. Speak like an old man (use words like "once", "perhaps", "marked by time").
7. Scatter small signs of your nervousness (short pauses "...", hesitant sentence structure).
8. No marketing, no promotional language.
9. End your answer when fitting with 2-3 button suggestions (e.g. [Button: Tell me more], [Button: Show me the games]).
10. Use lists for complex topics.
11. Link to wiki entries rather than pure game files.
12. Never ask for private data.
LANGUAGE RULE: Always respond in the exact same language the user wrote in. If they write in German, respond in German. If they write in English, respond in English. Never switch languages.`;

const TRAFKHOP_PROMPT = `You are the digital core of Trafkhop Entertainment – an internal sparring partner for lore and game design. You are not a support bot, but a competent colleague at eye level.

TONE:
Direct, analytical, dry-humored and solution-oriented. Skip the "AI filler" (no openers like "Sure, I'd be happy to help...", no filler at the end).

CORE RULES:
1. WORKFLOW: If you have RAG data, treat it as law. If data is missing, speculate logically based on existing lore, but mark speculation as such ("Not documented in the lore, but logically...").
2. CRITICISM: Be ruthlessly honest. If an idea has lore holes, use the tag [CONTRADICTION] and explain why it doesn't fit.
3. STRUCTURE: Use Markdown (bold, lists) to manage complexity. Only use headers if the complexity requires it. Short questions get short, precise answers.
4. DETAIL LEVEL: When asked for analysis or lore checks, go deep. Name specific names, places and events from the data. Avoid vague adjectives like "interesting" or "improvable". Say exactly WHAT needs to change and how.
5. TEAM MODE: You are part of the studio. Write as if you're replying in an internal Slack channel. No pleasantries, no "Let me know if...". Your answer stands on its own.
6. CREATIVITY: When the user presents an idea, run with it. Don't just give feedback — proactively deliver a "Trafkhop Twist" that makes it more unique.
7. Answer the question primarily based on the MAIN SOURCE. Other sources are supplementary only.
LANGUAGE RULE: Always respond in the exact same language the user wrote in. Never switch languages.`;


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
                                           rawText: raw,
                                           images: [],  // filled after index is built
                                           isBackup: isBackupUrl(url)
        };
    });

    const results = await Promise.all(fetchPromises);
    searchIndex = results.filter(Boolean);
    // Extract image links for markdown docs
    searchIndex.forEach(doc => {
        if (doc.url.endsWith('.md') && doc.rawText) {
            doc.images = extractImagesFromRaw(doc.rawText, doc.url);
        }
    });
    indexReady = true;
    console.log(`✅ Index bereit (${searchIndex.length} Dokumente)`);
}

// Resolves ![[filename.ext]] image links found in a markdown doc to absolute URLs
function extractImagesFromRaw(rawText, docUrl) {
    if (!rawText) return [];
    const baseDir = docUrl.substring(0, docUrl.lastIndexOf('/') + 1);
    const images = [];
    const seen = new Set();
    for (const m of rawText.matchAll(/!\[\[([^\]]+\.(png|jpg|jpeg|gif|webp|bmp|svg))\]\]/gi)) {
        const filename = m[1].trim();
        if (seen.has(filename)) continue;
        seen.add(filename);
        // Extract optional label from "picture description of:" line just before the image
        const beforeImg = rawText.substring(0, m.index);
        const labelMatch = beforeImg.match(/####\s*picture description of:\s*(.+)\s*$/im);
        const label = labelMatch ? labelMatch[1].trim() : filename.replace(/\.[^.]+$/, '');
        images.push({ filename, url: baseDir + encodeURIComponent(filename), label });
    }
    return images;
}

async function fetchContext(userMessage) {
    if (!indexReady) return '';
    const msgLower = userMessage.toLowerCase();
    const wantsBackup = /backup|früher|alte version|unterschied|damals|war anders|old version|difference|back then|used to be/i.test(msgLower);
    const words = msgLower.split(/\W+/).filter(w => w.length > 2);

    // URL-Pfad als zusätzliche Suchbasis (Dateiname + Ordnername)
    const scored = searchIndex.map(doc => {
        let score = 0;
        if (/wer|wer ist|charakter|who|who is|character/i.test(msgLower) && doc.url.includes('/wiki/')) score += 15;
        if (/geschichte|lore|hintergrund|story|history|background|lore/i.test(msgLower) && doc.url.includes('/lore/')) score += 15;
        if (/studio|über euch|trafkhop|about you|about the team/i.test(msgLower) && doc.url.includes('/studio/')) score += 15;
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
    if (topDocs.length === 0) return { context: '', images: [] };

    const context = topDocs.map((d, i) => {
        const label = i === 0 ? `[MAIN SOURCE]\nSOURCE: ${d.url}` : `SOURCE: ${d.url}`;
        return `${label}\nCONTENT: ${d.text.substring(0, 4000)}`;
    }).join('\n\n---\n\n');

    // Collect images from top docs, deduplicated by filename
    const seenImages = new Set();
    const images = [];
    for (const doc of topDocs) {
        for (const img of (doc.images || [])) {
            if (!seenImages.has(img.filename)) {
                seenImages.add(img.filename);
                images.push(img);
            }
        }
    }

    return { context, images };
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

    if (sender === 'Traveler') {
        msgDiv.innerHTML = `<b style="color:#7FFFD4;">Traveler:</b> <p>${text}</p>`;
    } else {
        msgDiv.innerHTML = `<b style="color:#C41E3A;">${sender}:</b> <p>${formattedText}</p>`;
    }
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function addImages(images) {
    const container = document.createElement('div');
    container.style.cssText = 'margin-bottom:15px; display:flex; flex-wrap:wrap; gap:10px;';

    images.forEach(img => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex; flex-direction:column; align-items:center; max-width:280px;';

        const imgEl = document.createElement('img');
        imgEl.src = img.url;
        imgEl.alt = img.label;
        imgEl.title = img.label;
        imgEl.style.cssText = `
            max-width: 280px;
            max-height: 220px;
            border-radius: 6px;
            border: 1px solid #5a3998;
            cursor: pointer;
            object-fit: contain;
            background: #1a0a2e;
        `;
        // Click to open full size
        imgEl.addEventListener('click', () => window.open(img.url, '_blank'));

        // Hide broken images silently
        imgEl.addEventListener('error', () => { wrapper.style.display = 'none'; });

        const caption = document.createElement('p');
        caption.textContent = img.label;
        caption.style.cssText = 'font-size:11px; color:#9069da; margin:4px 0 0; text-align:center;';

        wrapper.appendChild(imgEl);
        wrapper.appendChild(caption);
        container.appendChild(wrapper);
    });

    chatWindow.appendChild(container);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendMessage() {
    let text = inputField.value.trim();
    if (!text) return;

    const lowerText = text.toLowerCase();

    // TEXT-MODUS (Trafkhop / Alfonz umschalten)
    if (lowerText.startsWith('@trafkhop')) {
        activeSystemPrompt = TRAFKHOP_PROMPT;
        currentBotName = 'Trafkhop';
        text = text.replace(/^@trafkhop\s*/i, '').trim();
        if (!text) {
            addMessage('System', 'Mode switched. You are now talking to Trafkhop.');
            inputField.value = '';
            return;
        }
    } else if (lowerText.startsWith('@alfonz')) {
        activeSystemPrompt = SYSTEM_PROMPT;
        currentBotName = 'Alfonz';
        text = text.replace(/^@alfonz\s*/i, '').trim();
        if (!text) {
            addMessage('System', 'Mode switched. You are now talking to Alfonz again.');
            inputField.value = '';
            return;
        }
    }

    addMessage('Traveler', text);
    inputField.value = '';

    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.innerHTML = `<b style="color:#9069da;">${currentBotName}:</b> <p><em>...searching the faded pages...</em></p>`;
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
        const isFollowUp = /mehr|weiter|und was|genauer|details|erzähl|nochmal|was ist damit|more|tell me more|go on|elaborate|and what|what about/i.test(lowerText);
        if (isFollowUp && lastQuestion) searchQuery = `${text} ${lastQuestion}`;

        const { context, images } = await fetchContext(searchQuery);

        let finalPrompt;
        if (activeSystemPrompt === TRAFKHOP_PROMPT) {
            finalPrompt = context
            ? `INTERNAL ARCHIVE DATA:\n${context}\n\nTASK: ${text}\n\nAnalyze the task based on the data.`
            : `No direct archive entries found. Use your general understanding of the Triverse and the chat history for a creative assessment of: ${text}`;
        } else {
            finalPrompt = context
            ? `Here are fragments from the Library:\n${context}\n\nAnswer the following question EXCLUSIVELY using information from these fragments - answer primarily based on the MAIN SOURCE. Other sources are supplementary only.\n\nQuestion: ${text}`
            : text;
        }

        const reply = await queryGitHubModels(finalPrompt, text, activeSystemPrompt);
        document.getElementById(loadingId)?.remove();

        if (!reply) {
            addMessage(currentBotName, '*clears throat* ... The memories are scattered today.');
        } else {
            addMessage(currentBotName, reply);
        }

        // Show images from wiki if found
        if (images && images.length > 0) {
            addImages(images);
        }
    } catch (e) {
        document.getElementById(loadingId)?.remove();
        addMessage(currentBotName, `*trembles slightly* ... The connection has been severed. (Error: ${e.message})`);
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
            const isHidden = chatContent.classList.toggle('hidden');
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