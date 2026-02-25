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
// Wir nutzen FLUX.1-schnell - deutlich besser als SDXL für präzise Beschreibungen.
// Fallback auf SDXL falls FLUX nicht antwortet.
app.post('/image', async (req, res) => {
    try {
        const { prompt } = req.body;

        // FLUX.1-schnell: besser bei ungewöhnlichen Konzepten (floating islands, voids, etc.)
        const MODEL_URL = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";

        const response = await axios({
            method: 'post',
            url: MODEL_URL,
            headers: {
                "Authorization": `Bearer ${HF_TOKEN}`,
                "Content-Type": "application/json",
                "Accept": "image/jpeg",
                "x-use-cache": "false"
            },
            data: { 
                inputs: prompt,
                parameters: {
                    num_inference_steps: 4,  // FLUX.1-schnell braucht nur 4 Steps
                    guidance_scale: 0        // FLUX schnell: kein CFG
                }
            },
            responseType: 'arraybuffer'
        });

        res.set('Content-Type', 'image/jpeg');
        res.send(response.data);

    } catch (fluxError) {
        console.warn("FLUX fehlgeschlagen, Fallback zu SDXL:", fluxError.response?.data?.toString() || fluxError.message);

        // Fallback: SDXL mit ordentlichen Parametern (OHNE absichtliche Qualitätsverschlechterung)
        try {
            const MODEL_URL_FALLBACK = "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0";

            const response = await axios({
                method: 'post',
                url: MODEL_URL_FALLBACK,
                headers: {
                    "Authorization": `Bearer ${HF_TOKEN}`,
                    "Content-Type": "application/json",
                    "Accept": "image/jpeg",
                    "x-use-cache": "false"
                },
                data: { 
                    inputs: prompt,
                    parameters: {
                        // Qualitäts-Negative-Prompt (das Gegenteil von vorher!)
                        negative_prompt: "blurry, low quality, bad anatomy, distorted, ugly, watermark, text, cropped",
                        num_inference_steps: 30,  // Vorher: 15 – mehr Steps = bessere Qualität
                        guidance_scale: 7.5       // Standard-Wert für SDXL
                    }
                },
                responseType: 'arraybuffer'
            });

            res.set('Content-Type', 'image/jpeg');
            res.send(response.data);

        } catch (sdxlError) {
            const errorData = sdxlError.response?.data?.toString() || sdxlError.message;
            console.error("Beide Modelle fehlgeschlagen:", errorData);
            res.status(500).json({ 
                error: "Die Vision ist im Äther steckengeblieben.",
                details: errorData 
            });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Trafkhop Proxy läuft auf Port ${PORT}`);
});