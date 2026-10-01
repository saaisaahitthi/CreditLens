import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    roc_auc_score, 
    average_precision_score, 
    precision_score, 
    recall_score, 
    f1_score, 
    confusion_matrix,
    classification_report
)
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

def main():
    print("--- Phase 1: Dataset Inspection & Baseline Model ---")
    
    # 1. Load Data
    df = pd.read_csv('../data/cs-training.csv')
    print(f"\nDataset Shape: {df.shape}")
    
    # 2. Inspect Data
    print("\nMissing Values:")
    print(df.isnull().sum())
    
    target_col = 'SeriousDlqin2yrs'
    # In OpenML format, the target might be categorical (str/category). Let's check and map to int.
    if df[target_col].dtype == 'object' or pd.api.types.is_categorical_dtype(df[target_col]):
        df[target_col] = df[target_col].astype(int)
        
    print("\nClass Distribution:")
    print(df[target_col].value_counts(normalize=True))
    
    # 3. Preprocessing Setup
    X = df.drop(columns=[target_col])
    y = df[target_col]
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Baseline Model Pipeline: Impute missing values with median, scale, then LogReg
    # Note: Logistic Regression typically requires scaling and imputation
    pipeline = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler()),
        ('classifier', LogisticRegression(random_state=42, class_weight='balanced', max_iter=1000))
    ])
    
    print("\nTraining Baseline Logistic Regression Model...")
    pipeline.fit(X_train, y_train)
    
    # 4. Evaluation
    y_pred = pipeline.predict(X_test)
    y_pred_proba = pipeline.predict_proba(X_test)[:, 1]
    
    print("\n--- Evaluation Metrics ---")
    print(f"ROC-AUC:   {roc_auc_score(y_test, y_pred_proba):.4f}")
    print(f"PR-AUC:    {average_precision_score(y_test, y_pred_proba):.4f}")
    print(f"Precision: {precision_score(y_test, y_pred):.4f}")
    print(f"Recall:    {recall_score(y_test, y_pred):.4f}")
    print(f"F1 Score:  {f1_score(y_test, y_pred):.4f}")
    
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

if __name__ == "__main__":
    main()
