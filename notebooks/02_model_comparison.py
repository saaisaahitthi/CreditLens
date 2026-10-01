import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
import xgboost as xgb
import lightgbm as lgb
from sklearn.metrics import (
    roc_auc_score, 
    average_precision_score, 
    precision_score, 
    recall_score, 
    f1_score, 
    confusion_matrix
)
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.compose import ColumnTransformer

def evaluate_model(name, model, X_test, y_test):
    # Predict
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    # Metrics
    roc_auc = roc_auc_score(y_test, y_pred_proba)
    pr_auc = average_precision_score(y_test, y_pred_proba)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)
    
    print(f"\n--- {name} ---")
    print(f"ROC-AUC:   {roc_auc:.4f}")
    print(f"PR-AUC:    {pr_auc:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print("Confusion Matrix:")
    print(cm)
    
    return {
        'Model': name,
        'ROC-AUC': roc_auc,
        'PR-AUC': pr_auc,
        'Precision': precision,
        'Recall': recall,
        'F1 Score': f1,
        'CM': cm
    }

def main():
    print("--- Phase 2: Feature Engineering & Model Comparison ---")
    
    # 1. Load Data
    df = pd.read_csv('../data/cs-training.csv')
    
    # Convert target if needed
    target_col = 'SeriousDlqin2yrs'
    if df[target_col].dtype == 'object' or isinstance(df[target_col].dtype, pd.CategoricalDtype):
        df[target_col] = df[target_col].astype(int)
        
    # 2. Feature Engineering
    # Create new features. 
    # We do this before splitting as these are row-wise transformations (no leakage)
    # 2.1. MonthlyDebt: Approximate absolute debt from ratio and income. 
    # Since MonthlyIncome has NaNs, this will also have NaNs where income is missing.
    df['MonthlyDebt'] = df['DebtRatio'] * df['MonthlyIncome']
    
    # 2.2. IncomePerDependent: Income distributed across dependents + 1 (the borrower)
    df['IncomePerDependent'] = df['MonthlyIncome'] / (df['NumberOfDependents'].fillna(0) + 1)
    
    # 2.3. CombinedPastDue: Total instances of past due payments
    df['CombinedPastDue'] = (df['NumberOfTime30-59DaysPastDueNotWorse'] + 
                             df['NumberOfTime60-89DaysPastDueNotWorse'] + 
                             df['NumberOfTimes90DaysLate'])
                             
    # 2.4. HasDependents: Boolean flag
    df['HasDependents'] = (df['NumberOfDependents'] > 0).astype(int)

    # Note: Some records have DebtRatio > 1 but MonthlyIncome is NaNs. These are typically cases 
    # where absolute debt was recorded instead of a ratio. We leave them as is, the tree models handle it well.

    # 3. Train-Test Split (same as Phase 1)
    X = df.drop(columns=[target_col])
    y = df[target_col]
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Calculate pos weight for imbalanced datasets
    pos_weight = (len(y_train) - sum(y_train)) / sum(y_train)
    
    # 4. Pipelines
    # Logistic Regression needs imputation and scaling
    lr_preprocessor = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])
    
    lr_pipeline = Pipeline([
        ('preprocessor', lr_preprocessor),
        ('classifier', LogisticRegression(random_state=42, class_weight='balanced', max_iter=1000))
    ])
    
    # Tree models only need imputation (scikit-learn RF doesn't handle NaNs natively yet)
    tree_preprocessor = Pipeline([
        ('imputer', SimpleImputer(strategy='median'))
    ])
    
    rf_pipeline = Pipeline([
        ('preprocessor', tree_preprocessor),
        ('classifier', RandomForestClassifier(random_state=42, n_estimators=100, max_depth=10, class_weight='balanced', n_jobs=-1))
    ])
    
    xgb_pipeline = Pipeline([
        ('preprocessor', tree_preprocessor),
        ('classifier', xgb.XGBClassifier(random_state=42, scale_pos_weight=pos_weight, n_estimators=100, max_depth=6, n_jobs=-1, eval_metric='logloss'))
    ])
    
    lgb_pipeline = Pipeline([
        ('preprocessor', tree_preprocessor),
        ('classifier', lgb.LGBMClassifier(random_state=42, is_unbalance=True, n_estimators=100, max_depth=6, n_jobs=-1))
    ])
    
    # 5. Training and Evaluation
    pipelines = {
        'Logistic Regression (Baseline)': lr_pipeline,
        'Random Forest': rf_pipeline,
        'XGBoost': xgb_pipeline,
        'LightGBM': lgb_pipeline
    }
    
    results = []
    for name, pipeline in pipelines.items():
        print(f"\nTraining {name}...")
        pipeline.fit(X_train, y_train)
        res = evaluate_model(name, pipeline, X_test, y_test)
        results.append(res)
        
        # Save model
        filename = f"../models/{name.replace(' ', '_').replace('(', '').replace(')', '').lower()}.pkl"
        joblib.dump(pipeline, filename)
        print(f"Saved to {filename}")

    # 6. Comparison Table
    print("\n====================== MODEL COMPARISON ======================")
    print(f"{'Model':<30} | {'ROC-AUC':<7} | {'PR-AUC':<7} | {'Recall':<7} | {'Precision':<9} | {'F1 Score':<7}")
    print("-" * 75)
    for res in results:
        print(f"{res['Model']:<30} | {res['ROC-AUC']:.4f}  | {res['PR-AUC']:.4f}  | {res['Recall']:.4f}  | {res['Precision']:.4f}    | {res['F1 Score']:.4f}")

if __name__ == "__main__":
    main()
