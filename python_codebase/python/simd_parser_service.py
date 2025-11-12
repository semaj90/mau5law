from fastapi import FastAPI, Request
import orjson, numpy as np, torch, cupy as cp

app = FastAPI()

@app.post("/json")
async def parse_json(req: Request):
    data = await req.body()
    try:
        parsed = orjson.loads(data)
        arr = np.frombuffer(orjson.dumps(parsed), dtype=np.uint8)
        gpu_tensor = torch.as_tensor(cp.asarray(arr), device="cuda")
        return {
            "ok": True,
            "length": len(arr),
            "gpu_bytes": gpu_tensor.numel(),
            "summary": f"{len(parsed)} top-level entries" if isinstance(parsed, dict) else "array"
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}
