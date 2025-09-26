from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
import uvicorn

# Load environment variables
load_dotenv()

# Database connection will be added in Phase 1.2
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting Enterprise Portfolio Management API...")
    yield
    # Shutdown
    print("📴 Shutting down API...")

# Create FastAPI app
app = FastAPI(
    title="Enterprise Portfolio Management API",
    description="A comprehensive SaaS platform for portfolio and project management",
    version="1.0.0",
    lifespan=lifespan
)

# Security
security = HTTPBearer()

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Enterprise Portfolio Management API",
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/api/")
async def root():
    return {
        "message": "Welcome to Enterprise Portfolio Management API",
        "documentation": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )