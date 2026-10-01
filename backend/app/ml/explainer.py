import numpy as np
import pandas as pd
import joblib
import shap
import json

class CreditRiskExplainer:
    def __init__(self, model_path):
        """
        Initializes the explainer with a trained LightGBM pipeline.
        The pipeline must have a 'preprocessor' and a 'classifier'.
        """
        self.pipeline = joblib.load(model_path)
        self.preprocessor = self.pipeline.named_steps['preprocessor']
        self.classifier = self.pipeline.named_steps['classifier']
        
        # LightGBM tree explainer
        # We use model_output='raw' (log-odds) which is standard and exactly additive
        self.explainer = shap.TreeExplainer(self.classifier)
        
    def _sigmoid(self, x):
        return 1 / (1 + np.exp(-x))

    def explain_customer(self, customer_df: pd.DataFrame, top_k: int = 4):
        """
        Provides a structured explanation for a single customer.
        Returns a dictionary containing risk score, base value, features, and text explanation.
        """
        if len(customer_df) != 1:
            raise ValueError("Explain requires exactly one customer record.")
            
        # 1. Transform features via preprocessor (handles NaNs, etc.)
        X_transformed = self.preprocessor.transform(customer_df)
        
        # 2. Get predictions
        proba = self.pipeline.predict_proba(customer_df)[0][1] # Probability of Default
        
        # 3. Get SHAP values (in log odds)
        shap_values_obj = self.explainer(X_transformed)
        
        # Note: Depending on shap version, LightGBM binary classification shap values 
        # might have shape (1, n_features) or (1, n_features, 2). 
        # Usually for LGBM it returns just the positive class log odds.
        vals = shap_values_obj.values[0]
        if len(vals.shape) > 1 and vals.shape[1] == 2:
            vals = vals[:, 1]
            
        base_value = self.explainer.expected_value
        if isinstance(base_value, (list, np.ndarray)):
            base_value = base_value[-1] # Usually positive class is index 1 or it returns a single scalar
            
        # Validate additivity: base_value + sum(shap_values) == log_odds prediction
        margin_pred = base_value + np.sum(vals)
        calculated_proba = self._sigmoid(margin_pred)
        
        # Small sanity check logging
        additivity_diff = abs(proba - calculated_proba)
        
        # 4. Map back to feature names
        # We need the column names from the dataframe. The preprocessor (SimpleImputer) 
        # preserves column order since we didn't use ColumnTransformer reordering.
        feature_names = customer_df.columns.tolist()
        
        # 5. Extract top positive (pushing risk UP) and negative (pushing risk DOWN) factors
        feature_impacts = []
        for i, f_name in enumerate(feature_names):
            feature_impacts.append({
                'feature': f_name,
                'actual_value': float(customer_df.iloc[0][f_name]) if not pd.isna(customer_df.iloc[0][f_name]) else None,
                'shap_value_log_odds': float(vals[i])
            })
            
        # Sort by SHAP value descending (highest risk contributors first)
        feature_impacts_sorted = sorted(feature_impacts, key=lambda x: x['shap_value_log_odds'], reverse=True)
        
        positive_contributors = [f for f in feature_impacts_sorted if f['shap_value_log_odds'] > 0][:top_k]
        # Sort negative contributors by most negative (lowest value first)
        negative_contributors = sorted([f for f in feature_impacts_sorted if f['shap_value_log_odds'] < 0], 
                                     key=lambda x: x['shap_value_log_odds'])[:top_k]
        
        # 6. Generate deterministic human-readable text
        explanation_text = f"Predicted default probability: {proba*100:.1f}%\n\nTop contributing factors increasing risk:\n"
        for idx, factor in enumerate(positive_contributors, 1):
            explanation_text += f"{idx}. (+) {factor['feature']} (value: {factor['actual_value']}, impact: +{factor['shap_value_log_odds']:.3f})\n"
            
        explanation_text += "\nTop contributing factors reducing risk:\n"
        for idx, factor in enumerate(negative_contributors, 1):
            explanation_text += f"{idx}. (-) {factor['feature']} (value: {factor['actual_value']}, impact: {factor['shap_value_log_odds']:.3f})\n"

            
        # Return structured format suitable for API / GenAI layer
        return {
            'probability_of_default': float(proba),
            'log_odds_margin': float(margin_pred),
            'base_value_log_odds': float(base_value),
            'additivity_error': float(additivity_diff),
            'top_positive_contributors': positive_contributors,
            'top_negative_contributors': negative_contributors,
            'human_readable': explanation_text,
            'all_feature_impacts': feature_impacts_sorted
        }
