from fastapi import FastAPI
from .api import endpoints

app = FastAPI(
    title="Gemini Agent API",
    version="1.0.0",
)

app.include_router(endpoints.router)

@app.get("/")
async def read_root():
    return {"message": "Gemini Agent API is running."}
