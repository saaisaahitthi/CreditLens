from fastapi import APIRouter, HTTPException
import pandas as pd
from app.api.schemas import CustomerRequest, PolicyQARequest, CombinedAnalysisRequest
from app.services.copilot import CreditLensCopilot
from app.services.llm_provider import LLMProvider

router = APIRouter()

# Initialize the Copilot globally for the router
try:
    llm = LLMProvider()
    copilot = CreditLensCopilot(
        model_path="../models/lightgbm.pkl",  # will point to tuned model if present later
        chroma_persist_dir="../docs/processed/chroma",
        llm_provider=llm
    )
except Exception as e:
    print(f"Warning: Failed to initialize Copilot on startup: {e}")
    copilot = None

def get_copilot():
    if copilot is None:
        raise HTTPException(status_code=500, detail="CreditLens Copilot is not initialized.")
    return copilot

@router.post("/customer/summary", summary="Generate a comprehensive GenAI risk report for a customer")
def get_customer_summary(req: CustomerRequest):
    cp = get_copilot()
    try:
        df = pd.DataFrame([req.features])
        result = cp.customer_summary(df, customer_id=req.customer_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/customer/explain", summary="Generate a quick GenAI risk explanation")
def explain_risk(req: CustomerRequest):
    cp = get_copilot()
    try:
        df = pd.DataFrame([req.features])
        result = cp.explain_risk(df, customer_id=req.customer_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/policy/qa", summary="Ask a question against the credit policy knowledge base")
def ask_policy_question(req: PolicyQARequest):
    cp = get_copilot()
    try:
        result = cp.policy_qa(req.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/customer/combined", summary="Combine customer ML risk data with policy QA")
def get_combined_analysis(req: CombinedAnalysisRequest):
    cp = get_copilot()
    try:
        df = pd.DataFrame([req.features])
        result = cp.combined_analysis(req.question, df, customer_id=req.customer_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
