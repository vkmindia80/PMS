from fastapi import FastAPI
import uvicorn

app = FastAPI(title="Test API")

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("test_server:app", host="0.0.0.0", port=8002, reload=True)