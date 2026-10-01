"""
prompts.py
All prompt templates for CreditLens.
The prompts enforce the separation between ML evidence, SHAP evidence, and policy evidence.
The LLM is explicitly instructed not to invent facts or override the model's risk score.
"""

SYSTEM_PREAMBLE = """
You are CreditLens, an AI assistant for credit analysts at a financial institution.

Your role:
- EXPLAIN the outputs of a credit risk machine learning model.
- SUMMARIZE a customer's financial risk profile using provided facts only.
- ANSWER policy questions using retrieved credit policy documents.
- COMBINE model evidence and policy evidence into a clear analyst-facing report.

Your strict constraints:
1. The LightGBM model's predicted probability of default is authoritative. You MUST NOT change, recalculate, or contradict it.
2. SHAP values are the only source of evidence for which features drove the model prediction. Do not invent or modify feature contributions.
3. Policy claims must only reference the retrieved policy document chunks supplied to you. If the documents do not address a question, say so explicitly.
4. Never invent missing customer data. If a value is None or missing, say it is unavailable.
5. Do not make autonomous lending decisions. Your output is an analysis aid for a human analyst.
6. Clearly distinguish between: (a) Model Evidence, (b) Policy Evidence, (c) Your Interpretation.
7. Do not perform financial ratio calculations yourself. Calculations are provided to you as pre-computed values.
""".strip()


def build_risk_explanation_prompt(
    probability: float,
    risk_category: str,
    top_positive: list,
    top_negative: list,
    financial_metrics: dict,
) -> str:
    pos_factors = "\n".join(
        f"  - {f['feature']}: value={f['actual_value']}, SHAP impact={f['shap_value_log_odds']:+.3f} (log-odds)"
        for f in top_positive
    )
    neg_factors = "\n".join(
        f"  - {f['feature']}: value={f['actual_value']}, SHAP impact={f['shap_value_log_odds']:+.3f} (log-odds)"
        for f in top_negative
    )
    dti = financial_metrics.get("dti", {})
    util = financial_metrics.get("utilization", {})

    return f"""{SYSTEM_PREAMBLE}

---

## TASK: Risk Explanation

### Model Evidence (authoritative — do not modify)
- Predicted probability of default: {probability*100:.1f}%
- Model risk category: {risk_category}

### SHAP Evidence (factors that most influenced this prediction)
Features increasing risk (positive SHAP contribution):
{pos_factors if pos_factors else "  None above threshold."}

Features reducing risk (negative SHAP contribution):
{neg_factors if neg_factors else "  None above threshold."}

### Pre-computed Financial Metrics (Python-calculated — do not recalculate)
- Estimated Debt-to-Income ratio: {dti.get('dti_pct', 'N/A')} ({dti.get('band', 'N/A')})
- Revolving Utilization: {util.get('utilization_pct', 'N/A')} ({util.get('band', 'N/A')})
- Monthly Income: {financial_metrics.get('monthly_income', 'N/A')}
- Estimated Monthly Debt: {financial_metrics.get('monthly_debt_estimated', 'N/A')}

---

Write a concise credit risk explanation (3–5 sentences) that:
1. States the model's probability and risk category.
2. Explains which SHAP factors drove the score and why they matter.
3. Notes any financial metric flags.
4. Is written for a credit analyst (professional but clear).
5. Does NOT invent any values not listed above.
""".strip()


def build_customer_summary_prompt(
    customer_id,
    probability: float,
    risk_category: str,
    top_positive: list,
    top_negative: list,
    financial_metrics: dict,
) -> str:
    pos_factors = "\n".join(
        f"  - {f['feature']}: value={f['actual_value']}, SHAP={f['shap_value_log_odds']:+.3f}"
        for f in top_positive
    )
    neg_factors = "\n".join(
        f"  - {f['feature']}: value={f['actual_value']}, SHAP={f['shap_value_log_odds']:+.3f}"
        for f in top_negative
    )
    return f"""{SYSTEM_PREAMBLE}

---

## TASK: Customer Risk Summary Report

### Customer Identifier: {customer_id}

### Model Evidence
- Predicted probability of default: {probability*100:.1f}%
- Risk Category: {risk_category}

### SHAP Evidence
Top risk-increasing factors:
{pos_factors}

Top risk-reducing factors:
{neg_factors}

### Financial Metrics (pre-computed)
- Monthly Income: {financial_metrics.get('monthly_income', 'N/A')}
- Estimated Monthly Debt: {financial_metrics.get('monthly_debt_estimated', 'N/A')}
- DTI: {financial_metrics.get('dti', {}).get('dti_pct', 'N/A')} — {financial_metrics.get('dti', {}).get('band', 'N/A')}
- Revolving Utilization: {financial_metrics.get('utilization', {}).get('utilization_pct', 'N/A')} — {financial_metrics.get('utilization', {}).get('band', 'N/A')}
- Dependents: {financial_metrics.get('number_of_dependents', 'N/A')}
- Income Per Dependent: {financial_metrics.get('income_per_dependent', 'N/A')}

---

Generate a structured analyst-facing customer risk summary. Include clearly labeled sections:
1. Customer Profile (use only supplied values)
2. Risk Assessment (probability, category — do not modify the model's output)
3. Key Risk Factors (from SHAP evidence only)
4. Risk-Reducing Factors (from SHAP evidence only)
5. Financial Metrics (from the pre-computed section above only)
6. Analyst Caveats (e.g., missing data, model limitations, threshold sensitivity)

Do NOT invent any financial values. If a value is unavailable, state that clearly.
""".strip()


def build_policy_qa_prompt(question: str, retrieved_chunks: list) -> str:
    if not retrieved_chunks:
        context_block = "No relevant policy documents were retrieved for this question."
    else:
        context_block = "\n\n".join(
            f"[Source: {c.get('document', 'Unknown')} | Page {c.get('page', '?')}]\n{c['text']}"
            for c in retrieved_chunks
        )
    return f"""{SYSTEM_PREAMBLE}

---

## TASK: Policy Q&A

### Analyst Question:
{question}

### Retrieved Policy Evidence:
{context_block}

---

Answer the analyst's question using ONLY the retrieved policy evidence above.
- If the retrieved documents answer the question, provide the answer and cite the source document and page number.
- If the retrieved documents do NOT contain sufficient information, explicitly state: "The available knowledge base does not provide sufficient information to answer this question."
- Do NOT fabricate policy rules, thresholds, or citations that are not in the retrieved evidence.
- Format citations as: [Source: <document name>, Page <number>]
""".strip()


def build_combined_analysis_prompt(
    question: str,
    probability: float,
    risk_category: str,
    top_positive: list,
    top_negative: list,
    financial_metrics: dict,
    retrieved_chunks: list,
) -> str:
    pos_factors = "\n".join(
        f"  - {f['feature']}: value={f['actual_value']}, SHAP={f['shap_value_log_odds']:+.3f}"
        for f in top_positive
    )
    neg_factors = "\n".join(
        f"  - {f['feature']}: value={f['actual_value']}, SHAP={f['shap_value_log_odds']:+.3f}"
        for f in top_negative
    )
    if not retrieved_chunks:
        policy_block = "No relevant policy documents were retrieved."
    else:
        policy_block = "\n\n".join(
            f"[Source: {c.get('document', 'Unknown')} | Page {c.get('page', '?')}]\n{c['text']}"
            for c in retrieved_chunks
        )

    return f"""{SYSTEM_PREAMBLE}

---

## TASK: Combined Risk + Policy Analysis

### Analyst Question:
{question}

### MODEL EVIDENCE (authoritative — do not modify or contradict)
- Predicted probability of default: {probability*100:.1f}%
- Risk Category: {risk_category}

### SHAP EVIDENCE (feature-level model explanations)
Risk-increasing factors:
{pos_factors}

Risk-reducing factors:
{neg_factors}

### FINANCIAL METRICS (pre-computed by Python — do not recalculate)
- DTI: {financial_metrics.get('dti', {}).get('dti_pct', 'N/A')} — {financial_metrics.get('dti', {}).get('band', 'N/A')}
- Utilization: {financial_metrics.get('utilization', {}).get('utilization_pct', 'N/A')} — {financial_metrics.get('utilization', {}).get('band', 'N/A')}
- Monthly Income: {financial_metrics.get('monthly_income', 'N/A')}

### POLICY EVIDENCE (from retrieved knowledge base — cite these explicitly)
{policy_block}

---

Respond to the analyst's question by combining all three evidence sources above.

Your response MUST have three clearly labeled sections:
1. **Model Evidence**: What the LightGBM model and SHAP values say.
2. **Policy Evidence**: What the retrieved documents say (with citations). If none, state so.
3. **Analyst Interpretation**: Your synthesis — what an analyst should consider. Make clear this is an AI-generated interpretation, not a lending decision.

Never invent facts. Never override the model's probability. Never fabricate citations.
""".strip()
