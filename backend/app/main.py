from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as copilot_router
from app.api.ml_routes import router as ml_router

app = FastAPI(
    title="CreditLens API",
    description="Explainable GenAI Credit Risk Copilot API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ml_router, prefix="/api/ml", tags=["ML — Deterministic"])
app.include_router(copilot_router, prefix="/api/copilot", tags=["Copilot — GenAI"])

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "CreditLens Backend"}

