import requests, json

payload = {
    "customer_id": "TEST-HIGH-RISK",
    "features": {
        "RevolvingUtilizationOfUnsecuredLines": 0.92,
        "age": 42,
        "NumberOfTime30-59DaysPastDueNotWorse": 2,
        "DebtRatio": 0.60,
        "MonthlyIncome": 3800.0,
        "NumberOfOpenCreditLinesAndLoans": 8,
        "NumberOfTimes90DaysLate": 1,
        "NumberRealEstateLoansOrLines": 1,
        "NumberOfTime60-89DaysPastDueNotWorse": 1,
        "NumberOfDependents": 2.0,
        "MonthlyDebt": 2280.0,
        "IncomePerDependent": 1266.67,
        "CombinedPastDue": 4,
        "HasDependents": 1
    }
}

print("--- Health Check ---")
r = requests.get("http://localhost:8000/health")
print(r.json())

print("\n--- ML Predict ---")
r = requests.post("http://localhost:8000/api/ml/predict", json=payload)
result = r.json()
print("Status:", r.status_code)
print("Risk Probability:", result.get("risk_probability"))
print("Risk Category:", result.get("risk_category"))
factors = result.get("top_risk_factors", [])
if factors:
    print("Top Risk Factor:", factors[0]["feature"])
fm = result.get("financial_metrics", {})
if fm:
    print("DTI:", fm.get("dti", {}).get("dti_pct"), fm.get("dti", {}).get("band"))
    print("Utilization:", fm.get("utilization", {}).get("utilization_pct"), fm.get("utilization", {}).get("band"))
