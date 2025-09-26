#!/usr/bin/env python3
from fastapi import FastAPI
from database import connect_to_mongo, get_database

app = FastAPI(title="Test API")

@app.get("/test")
async def test():
    return {"status": "ok"}

@app.get("/test-db")
async def test_db():
    try:
        await connect_to_mongo()
        db = await get_database()
        await db.command("ping")
        return {"database": "connected"}
    except Exception as e:
        return {"database": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)