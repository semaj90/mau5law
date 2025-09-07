from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

app = FastAPI(title="LegalAI FastAPI Workers")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class EmbedRequest(BaseModel):
    text: str
    model: Optional[str] = "nomic-embed-text"
    tags: Optional[List[str]] = []

@app.post('/ocr')
async def ocr_endpoint(image: UploadFile = File(...), lang: str = Form('eng')):
    # Placeholder OCR: real impl would call tesseract/onnxruntime
    data = await image.read()
    # Return dummy text length to prove flow
    return {"text": f"[OCR {lang}] bytes={len(data)}", "confidence": 0.8}

@app.post('/embed')
async def embed_endpoint(req: EmbedRequest):
    # Placeholder embedding: return small deterministic vector
    import hashlib
    h = hashlib.sha256(req.text.encode('utf-8')).digest()
    # Create 32-dim pseudo embedding
    embedding = [b / 255.0 for b in h[:32]]
    return {"embedding": embedding}

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8094)
