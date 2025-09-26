from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Minimal Test API")

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Minimal Test API",
        "version": "1.0.0",
    }

@app.get("/api/")
async def root():
    return {"message": "Minimal API is working"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("minimal_server:app", host="0.0.0.0", port=8003, reload=True)