const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 7860;

const GH_TOKEN = process.env.GH_TOKEN; 
const HF_TOKEN = process.env.HF_TOKEN; 
const GH_MODEL = "gpt-4o-mini";

// ROUTE 1: Text-Chat
app.post('/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        const response = await axios.post("https://models.inference.ai.azure.com/chat/completions", {
            model: GH_MODEL,
            messages: messages,
            temperature: 0.6,
            max_tokens: 500
        }, {
            headers: {
                "Authorization": `Bearer ${GH_TOKEN}`,
                "Content-Type": "application/json"
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error("Fehler Chat:", error.response?.data || error.message);
        res.status(500).json({ error: "Interner Server-Fehler beim Text-Proxy" });
    }
});

// ROUTE 2: Bildgenerierung
// ================================
// Bildgenerierung über eigenen HF-Space
// ================================
app.post('/image', async (req, res) => {
    try {
        const { prompt } = req.body;
        const HF_SPACE_URL = "https://trafkhop-alfonzimagegen.hf.space/api/generate";

        console.log(`🎨 Sende Prompt an Space: ${prompt}`);

        const response = await axios.post(HF_SPACE_URL, {
            prompt: prompt   // <-- geändert von "data" zu "prompt"
        }, {
            headers: { "Content-Type": "application/json" },
            timeout: 1200000
        });

        const base64Image = response.data.image;  // <-- geändert von response.data.data[0]
        if (!base64Image) {
            throw new Error("Keine Bilddaten in der Antwort");
        }

        const imageBuffer = Buffer.from(base64Image, 'base64');
        res.set('Content-Type', 'image/png');
        res.send(imageBuffer);
    } catch (error) {
        console.error("Space Fehler:", error.response?.status, error.response?.data || error.message);
        res.status(500).json({ error: "Die Bildgenerierung ist fehlgeschlagen." });
    }
});

app.listen(PORT, () => {
    console.log(`Trafkhop Proxy läuft auf Port ${PORT}`);
});
