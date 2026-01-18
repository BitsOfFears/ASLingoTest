from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from inference_sdk import InferenceHTTPClient
import tempfile
import os
import uvicorn

client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key="EJl82I43SEjMuRZjnl89",
)

app = FastAPI(title="ASL Practice API")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def extract_letter(result):
    predictions = result.get("predictions") or result.get("top") or []
    if isinstance(predictions, list) and predictions:
        first = predictions[0]
        if isinstance(first, dict):
            return (
                first.get("class")
                or first.get("class_name")
                or first.get("label")
                or first.get("letter")
            )
    return None


@app.post("/api/asl-infer")
async def asl_infer(image: UploadFile = File(...)):
    try:
        contents = await image.read()
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(contents)
            tmp_path = tmp.name
        try:
            result = client.infer(tmp_path, model_id="asl-ixq1x/3")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        letter = extract_letter(result)
        return {"letter": letter, "raw": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

