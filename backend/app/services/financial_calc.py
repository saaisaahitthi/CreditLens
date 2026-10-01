"""
financial_calc.py
Deterministic Python calculations for credit-risk financial metrics.
The LLM is NEVER asked to compute these — it only explains the results.
"""

def calculate_debt_to_income(monthly_debt: float, monthly_income: float) -> dict:
    """Calculate DTI ratio. Returns value and a risk band label."""
    if monthly_income is None or monthly_income <= 0:
        return {"dti_ratio": None, "dti_pct": None, "band": "Unknown", "note": "Monthly income missing or zero; DTI cannot be calculated."}
    dti = monthly_debt / monthly_income
    if dti < 0.36:
        band = "Acceptable"
    elif dti < 0.43:
        band = "Moderate"
    elif dti < 0.50:
        band = "Elevated — secondary review required"
    else:
        band = "High — normally declines per policy unless compensating factors"
    return {
        "dti_ratio": round(dti, 4),
        "dti_pct": f"{dti*100:.1f}%",
        "band": band,
        "note": f"DTI calculated as ${monthly_debt:,.2f} monthly debt / ${monthly_income:,.2f} monthly income."
    }

def classify_utilization(utilization: float) -> dict:
    """Classify revolving utilization into policy bands."""
    if utilization is None:
        return {"utilization_pct": None, "band": "Unknown"}
    if utilization <= 0.30:
        band = "Low risk"
    elif utilization <= 0.60:
        band = "Moderate"
    elif utilization <= 0.80:
        band = "Elevated"
    elif utilization <= 1.0:
        band = "High — strong indicator of financial distress"
    else:
        band = "Critical — over-limit (>100%), policy violation"
    return {
        "utilization_raw": round(utilization, 4),
        "utilization_pct": f"{utilization*100:.1f}%",
        "band": band
    }

def classify_risk_probability(probability: float) -> str:
    """Convert a continuous default probability to a discrete risk category."""
    if probability < 0.10:
        return "Low"
    elif probability < 0.30:
        return "Medium"
    elif probability < 0.60:
        return "High"
    else:
        return "Very High"

def compute_all_financial_metrics(customer_features: dict) -> dict:
    """
    Takes a flat dict of customer feature values and returns all
    deterministic financial metrics. Input values may be None if missing.
    """
    monthly_income = customer_features.get("MonthlyIncome")
    debt_ratio = customer_features.get("DebtRatio")
    utilization = customer_features.get("RevolvingUtilizationOfUnsecuredLines")
    num_dependents = customer_features.get("NumberOfDependents", 0) or 0

    # Compute monthly debt from ratio * income where available
    monthly_debt = None
    if monthly_income and debt_ratio is not None:
        monthly_debt = debt_ratio * monthly_income

    dti_result = calculate_debt_to_income(monthly_debt, monthly_income)
    util_result = classify_utilization(utilization)

    income_per_dependent = None
    if monthly_income:
        income_per_dependent = round(monthly_income / (num_dependents + 1), 2)

    return {
        "monthly_income": monthly_income,
        "monthly_debt_estimated": round(monthly_debt, 2) if monthly_debt else None,
        "dti": dti_result,
        "utilization": util_result,
        "income_per_dependent": income_per_dependent,
        "number_of_dependents": int(num_dependents),
    }
