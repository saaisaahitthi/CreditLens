"""
Dedicated endpoint for ML predictions only (no LLM needed).
Fast and deterministic — always returns within milliseconds.
"""
from fastapi import APIRouter, HTTPException
import pandas as pd
import numpy as np
import joblib
import os
from app.api.schemas import CustomerRequest
from app.services.financial_calc import compute_all_financial_metrics, classify_risk_probability
from app.ml.explainer import CreditRiskExplainer

router = APIRouter()

MODEL_PATH = os.path.join(os.path.dirname(__file__), "../../../models/lightgbm.pkl")
_explainer = None

def get_explainer():
    global _explainer
    if _explainer is None:
        _explainer = CreditRiskExplainer(MODEL_PATH)
    return _explainer

@router.post("/predict", summary="Run LightGBM prediction + SHAP + financial metrics deterministically (no LLM)")
def predict(req: CustomerRequest):
    try:
        df = pd.DataFrame([req.features])
        explainer = get_explainer()
        shap_result = explainer.explain_customer(df)
        financial = compute_all_financial_metrics(df.iloc[0].to_dict())
        return {
            "customer_id": req.customer_id,
            "risk_probability": round(shap_result["probability_of_default"], 4),
            "risk_category": classify_risk_probability(shap_result["probability_of_default"]),
            "top_risk_factors": shap_result["top_positive_contributors"],
            "risk_reducing_factors": shap_result["top_negative_contributors"],
            "financial_metrics": financial,
            "additivity_error": shap_result["additivity_error"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

import random
import json
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Dict, Any

FIRST_NAMES = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]

DB_PATH = os.path.join(os.path.dirname(__file__), "../../../data/queue_db.json")

def generate_initial_queue():
    data_path = os.path.join(os.path.dirname(__file__), "../../../data/cs-training.csv")
    df = pd.read_csv(data_path)
    samples = df.sample(n=50)
    
    queue = []
    for idx, row in samples.iterrows():
        monthly_income = row['MonthlyIncome'] if pd.notna(row['MonthlyIncome']) else 0
        deps = row['NumberOfDependents'] if pd.notna(row['NumberOfDependents']) else 0
        
        features = {
            'RevolvingUtilizationOfUnsecuredLines': row['RevolvingUtilizationOfUnsecuredLines'],
            'age': row['age'],
            'NumberOfTime30-59DaysPastDueNotWorse': row['NumberOfTime30-59DaysPastDueNotWorse'],
            'DebtRatio': row['DebtRatio'],
            'MonthlyIncome': row['MonthlyIncome'] if pd.notna(row['MonthlyIncome']) else None,
            'NumberOfOpenCreditLinesAndLoans': row['NumberOfOpenCreditLinesAndLoans'],
            'NumberOfTimes90DaysLate': row['NumberOfTimes90DaysLate'],
            'NumberRealEstateLoansOrLines': row['NumberRealEstateLoansOrLines'],
            'NumberOfTime60-89DaysPastDueNotWorse': row['NumberOfTime60-89DaysPastDueNotWorse'],
            'NumberOfDependents': row['NumberOfDependents'] if pd.notna(row['NumberOfDependents']) else None,
            'MonthlyDebt': row['DebtRatio'] * monthly_income if pd.notna(row['MonthlyIncome']) else 0,
            'IncomePerDependent': monthly_income / (deps + 1) if deps > 0 else monthly_income,
            'CombinedPastDue': row['NumberOfTime30-59DaysPastDueNotWorse'] + row['NumberOfTime60-89DaysPastDueNotWorse'] + row['NumberOfTimes90DaysLate'],
            'HasDependents': 1 if deps > 0 else 0
        }

        import math
        for k, v in features.items():
            if isinstance(v, float) and math.isnan(v):
                features[k] = None

        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        days_ago = random.randint(0, 5)
        date_applied = (datetime.now() - timedelta(days=days_ago, hours=random.randint(1, 20))).strftime("%Y-%m-%d %H:%M")
        loan_amount = random.choice([5000, 10000, 15000, 25000, 50000, 75000, 125000, 250000])

        queue.append({
            "customer_id": f"APP-{random.randint(10000, 99999)}-{idx}",
            "name": name,
            "date_applied": date_applied,
            "loan_amount": loan_amount,
            "status": "Pending Review",
            "features": features
        })
        
    queue.sort(key=lambda x: x["date_applied"], reverse=True)
    return queue

def load_db():
    if os.path.exists(DB_PATH):
        with open(DB_PATH, 'r') as f:
            return json.load(f)
    queue = generate_initial_queue()
    with open(DB_PATH, 'w') as f:
        json.dump(queue, f)
    return queue

def save_db(data):
    with open(DB_PATH, 'w') as f:
        json.dump(data, f, indent=2)

@router.get("/queue", summary="Fetch the queue of pending applications")
def get_customer_queue():
    try:
        return {"queue": load_db()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class StatusUpdate(BaseModel):
    status: str
    reason: str = ""
    analyst: str = "Analyst"

@router.patch("/queue/{customer_id}/status", summary="Update application status with audit log")
def update_status(customer_id: str, req: StatusUpdate):
    try:
        queue = load_db()
        for item in queue:
            if item["customer_id"] == customer_id:
                item["status"] = req.status
                # Append to audit log
                if "audit_log" not in item:
                    item["audit_log"] = []
                item["audit_log"].append({
                    "status": req.status,
                    "reason": req.reason,
                    "analyst": req.analyst,
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M")
                })
                save_db(queue)
                return {"message": "Status updated", "customer": item}
        raise HTTPException(status_code=404, detail="Customer not found")
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dataset/{row_index}", summary="Import a specific row from the 150K dataset into the queue")
def import_from_dataset(row_index: int):
    try:
        data_path = os.path.join(os.path.dirname(__file__), "../../../data/cs-training.csv")
        df = pd.read_csv(data_path)
        if row_index < 0 or row_index >= len(df):
            raise HTTPException(status_code=404, detail="Row index out of bounds (0 - 149999)")

        row = df.iloc[row_index]
        monthly_income = row['MonthlyIncome'] if pd.notna(row['MonthlyIncome']) else 0
        deps = row['NumberOfDependents'] if pd.notna(row['NumberOfDependents']) else 0
        
        features = {
            'RevolvingUtilizationOfUnsecuredLines': row['RevolvingUtilizationOfUnsecuredLines'],
            'age': row['age'],
            'NumberOfTime30-59DaysPastDueNotWorse': row['NumberOfTime30-59DaysPastDueNotWorse'],
            'DebtRatio': row['DebtRatio'],
            'MonthlyIncome': row['MonthlyIncome'] if pd.notna(row['MonthlyIncome']) else None,
            'NumberOfOpenCreditLinesAndLoans': row['NumberOfOpenCreditLinesAndLoans'],
            'NumberOfTimes90DaysLate': row['NumberOfTimes90DaysLate'],
            'NumberRealEstateLoansOrLines': row['NumberRealEstateLoansOrLines'],
            'NumberOfTime60-89DaysPastDueNotWorse': row['NumberOfTime60-89DaysPastDueNotWorse'],
            'NumberOfDependents': row['NumberOfDependents'] if pd.notna(row['NumberOfDependents']) else None,
            'MonthlyDebt': row['DebtRatio'] * monthly_income if pd.notna(row['MonthlyIncome']) else 0,
            'IncomePerDependent': monthly_income / (deps + 1) if deps > 0 else monthly_income,
            'CombinedPastDue': row['NumberOfTime30-59DaysPastDueNotWorse'] + row['NumberOfTime60-89DaysPastDueNotWorse'] + row['NumberOfTimes90DaysLate'],
            'HasDependents': 1 if deps > 0 else 0
        }

        import math
        for k, v in features.items():
            if isinstance(v, float) and math.isnan(v):
                features[k] = None

        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        
        new_app = {
            "customer_id": f"RAW-{row_index}",
            "name": name,
            "date_applied": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "loan_amount": random.choice([5000, 10000, 15000, 25000, 50000, 75000]),
            "status": "Pending Review",
            "features": features
        }
        
        queue = load_db()
        for q in queue:
            if q["customer_id"] == new_app["customer_id"]:
                return {"message": "Already in queue", "customer": q}

        queue.insert(0, new_app)
        save_db(queue)
        return {"message": "Imported", "customer": new_app}
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

class NewApplicant(BaseModel):
    name: str
    loan_amount: float
    features: Dict[str, Any]

@router.post("/queue", summary="Add a new applicant manually")
def add_applicant(req: NewApplicant):
    try:
        queue = load_db()
        new_app = {
            "customer_id": f"APP-{random.randint(10000, 99999)}-NEW",
            "name": req.name,
            "date_applied": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "loan_amount": req.loan_amount,
            "status": "Pending Review",
            "features": req.features
        }
        queue.insert(0, new_app) # prepend
        save_db(queue)
        return {"message": "Added successfully", "customer": new_app}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/random-customer", summary="Fetch a random customer from the real dataset")
def get_random_customer():
    try:
        data_path = os.path.join(os.path.dirname(__file__), "../../../data/cs-training.csv")
        df = pd.read_csv(data_path)
        sample = df.sample(n=1).iloc[0]

        monthly_income = sample['MonthlyIncome'] if pd.notna(sample['MonthlyIncome']) else 0
        monthly_debt = sample['DebtRatio'] * monthly_income if pd.notna(sample['MonthlyIncome']) else 0
        deps = sample['NumberOfDependents'] if pd.notna(sample['NumberOfDependents']) else 0

        features = {
            'RevolvingUtilizationOfUnsecuredLines': sample['RevolvingUtilizationOfUnsecuredLines'],
            'age': sample['age'],
            'NumberOfTime30-59DaysPastDueNotWorse': sample['NumberOfTime30-59DaysPastDueNotWorse'],
            'DebtRatio': sample['DebtRatio'],
            'MonthlyIncome': sample['MonthlyIncome'] if pd.notna(sample['MonthlyIncome']) else None,
            'NumberOfOpenCreditLinesAndLoans': sample['NumberOfOpenCreditLinesAndLoans'],
            'NumberOfTimes90DaysLate': sample['NumberOfTimes90DaysLate'],
            'NumberRealEstateLoansOrLines': sample['NumberRealEstateLoansOrLines'],
            'NumberOfTime60-89DaysPastDueNotWorse': sample['NumberOfTime60-89DaysPastDueNotWorse'],
            'NumberOfDependents': sample['NumberOfDependents'] if pd.notna(sample['NumberOfDependents']) else None,
            'MonthlyDebt': monthly_debt,
            'IncomePerDependent': monthly_income / (deps + 1),
            'CombinedPastDue': sample['NumberOfTime30-59DaysPastDueNotWorse'] + sample['NumberOfTime60-89DaysPastDueNotWorse'] + sample['NumberOfTimes90DaysLate'],
            'HasDependents': 1 if deps > 0 else 0
        }

        # Convert np.nan to None for JSON compliance
        import math
        for k, v in features.items():
            if isinstance(v, float) and math.isnan(v):
                features[k] = None

        idx = int(sample.name)
        return {
            "customer_id": f"CUST-{idx}",
            "features": features
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
