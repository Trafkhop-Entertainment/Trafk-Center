import gradio as gr
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
import torch
from diffusers import AutoPipelineForText2Image
import io
import base64
from PIL import Image
import time

print("🚀 Starte Bildgenerierungs-Space mit Kandinsky 2.2 ...")

# Modell-ID für Kandinsky 2.2 (Text-to-Image)
model_id = "kandinsky-community/kandinsky-2-2-decoder"

# AutoPipelineForText2Image lädt automatisch die richtige Pipeline
# (KandinskyV22Pipeline inkl. Prior und Decoder)
pipe = AutoPipelineForText2Image.from_pretrained(
    model_id,
    torch_dtype=torch.float32,
    safety_checker=None,
    requires_safety_checker=False
).to("cpu")
print("✅ Modell geladen")

def generate_image(prompt):
    print(f"🎨 Generiere Bild für: '{prompt[:100]}...' (Länge: {len(prompt)} Zeichen)")
    start = time.time()
    with torch.no_grad():
        image = pipe(
            prompt=prompt,
            num_inference_steps=50,        # mehr Steps = besser, aber langsamer
            guidance_scale=4.0,             # typischer Wert für Kandinsky
            height=512,
            width=512
        ).images[0]
    print(f"✅ Bild generiert in {time.time()-start:.2f} Sekunden")
    return image

# Gradio Interface (optional, bleibt für WebUI)
iface = gr.Interface(
    fn=generate_image,
    inputs=gr.Textbox(label="Prompt", lines=5),  # mehr Zeilen für lange Prompts
    outputs=gr.Image(label="Generiertes Bild", type="pil"),
    title="Trafkhop Bildgenerator (Kandinsky 2.2)",
    description="Lange Prompts möglich – Geduld, CPU braucht Zeit ⏳"
)

# FastAPI App
app = FastAPI()

class PromptRequest(BaseModel):
    prompt: str

@app.post("/api/generate")
async def api_generate(request: PromptRequest):
    image = generate_image(request.prompt)
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    img_base64 = base64.b64encode(buffered.getvalue()).decode()
    return {"image": img_base64}

# Gradio unter Root mounten
app = gr.mount_gradio_app(app, iface, path="/")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)