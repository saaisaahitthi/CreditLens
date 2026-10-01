import pandas as pd
import numpy as np
import joblib
import shap
import matplotlib.pyplot as plt
import sys
import os

# Add backend to path so we can import our explainer module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from app.ml.explainer import CreditRiskExplainer

def main():
    print("--- Phase 3: SHAP Explainability ---")
    
    # 1. Load Data
    print("Loading data...")
    df = pd.read_csv('../data/cs-training.csv')
    
    # Repeat the same feature engineering as Phase 2
    df['MonthlyDebt'] = df['DebtRatio'] * df['MonthlyIncome']
    df['IncomePerDependent'] = df['MonthlyIncome'] / (df['NumberOfDependents'].fillna(0) + 1)
    df['CombinedPastDue'] = (df['NumberOfTime30-59DaysPastDueNotWorse'] + 
                             df['NumberOfTime60-89DaysPastDueNotWorse'] + 
                             df['NumberOfTimes90DaysLate'])
    df['HasDependents'] = (df['NumberOfDependents'] > 0).astype(int)
    
    target_col = 'SeriousDlqin2yrs'
    X = df.drop(columns=[target_col])
    
    # 2. Load Model & Explainer
    print("Loading LightGBM model and initializing Explainer...")
    model_path = '../models/lightgbm.pkl'
    explainer = CreditRiskExplainer(model_path)
    
    # 3. Global SHAP Analysis
    # We take a random sample of 5,000 for global explanation to keep it fast
    print("Calculating Global SHAP values (sampled)...")
    X_sample = X.sample(n=5000, random_state=42)
    X_sample_transformed = explainer.preprocessor.transform(X_sample)
    
    shap_values = explainer.explainer(X_sample_transformed)
    
    # If binary classification returns (N, F, 2), slice it
    if len(shap_values.values.shape) > 2:
        shap_values.values = shap_values.values[:, :, 1]
        shap_values.base_values = shap_values.base_values[:, 1]
    
    shap_values.feature_names = X.columns.tolist()
    
    # Calculate mean absolute SHAP values for global feature importance
    mean_abs_shap = np.abs(shap_values.values).mean(axis=0)
    global_importance = pd.DataFrame({
        'Feature': X.columns,
        'Mean_Abs_SHAP': mean_abs_shap
    }).sort_values(by='Mean_Abs_SHAP', ascending=False)
    
    print("\n--- Global Feature Importance (Mean |SHAP|) ---")
    print(global_importance.to_string(index=False))
    
    # Generate Beeswarm plot
    plt.figure()
    shap.summary_plot(shap_values, X_sample, plot_type="dot", show=False)
    plt.tight_layout()
    plt.savefig('shap_summary_plot.png')
    print("Saved SHAP summary plot to shap_summary_plot.png")
    
    # 4. Local Explanations (Test on a few customers)
    print("\n--- Local Explanations ---")
    
    # Let's pick one high-risk customer and one low-risk customer
    # Predict on the whole sample to find them quickly
    probas = explainer.pipeline.predict_proba(X_sample)[:, 1]
    
    high_risk_idx = X_sample.index[np.argmax(probas)]
    low_risk_idx = X_sample.index[np.argmin(probas)]
    
    print("\n[ High Risk Customer Analysis ]")
    high_risk_customer = X.loc[[high_risk_idx]]
    high_risk_explanation = explainer.explain_customer(high_risk_customer)
    print(high_risk_explanation['human_readable'])
    print(f"Validation: Additivity Error = {high_risk_explanation['additivity_error']:.2e}")
    
    print("\n[ Low Risk Customer Analysis ]")
    low_risk_customer = X.loc[[low_risk_idx]]
    low_risk_explanation = explainer.explain_customer(low_risk_customer)
    print(low_risk_explanation['human_readable'])
    print(f"Validation: Additivity Error = {low_risk_explanation['additivity_error']:.2e}")
    
    print("\nPhase 3 complete.")

if __name__ == "__main__":
    main()
