from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import base64
import httpx
import uvicorn

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
        encoded = base64.b64encode(contents).decode("utf-8")
        url = "https://detect.roboflow.com/asl-ixq1x/3"
        params = {"api_key": "EJl82I43SEjMuRZjnl89"}
        headers = {"Content-Type": "application/x-www-form-urlencoded"}
        async with httpx.AsyncClient() as client:
            response = await client.post(url, params=params, content=encoded, headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Upstream error {response.status_code}")
        result = response.json()
        letter = extract_letter(result)
        return {"letter": letter, "raw": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
