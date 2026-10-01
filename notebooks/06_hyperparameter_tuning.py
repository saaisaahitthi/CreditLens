"""
06_hyperparameter_tuning.py
Tunes the LightGBM model for optimal PR-AUC using Optuna.
To be run as a background task.
"""
import pandas as pd
import numpy as np
import optuna
from lightgbm import LGBMClassifier
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import average_precision_score
from imblearn.pipeline import Pipeline as ImbPipeline
from imblearn.over_sampling import SMOTE
from sklearn.impute import SimpleImputer
import joblib

# Load and prepare data
print("Loading data for hyperparameter tuning...")
df = pd.read_csv('../data/cs-training.csv')

# Feature Engineering
df['MonthlyDebt'] = df['DebtRatio'] * df['MonthlyIncome']
df['IncomePerDependent'] = df['MonthlyIncome'] / (df['NumberOfDependents'].fillna(0) + 1)
df['CombinedPastDue'] = (df['NumberOfTime30-59DaysPastDueNotWorse'] + 
                           df['NumberOfTime60-89DaysPastDueNotWorse'] + 
                           df['NumberOfTimes90DaysLate'])
df['HasDependents'] = (df['NumberOfDependents'] > 0).astype(int)

# Separate features and target
X = df.drop(columns=['SeriousDlqin2yrs'])
y = df['SeriousDlqin2yrs'].astype(int)

# Optuna Objective
def objective(trial):
    params = {
        'n_estimators': trial.suggest_int('n_estimators', 50, 300),
        'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.2, log=True),
        'max_depth': trial.suggest_int('max_depth', 3, 12),
        'num_leaves': trial.suggest_int('num_leaves', 20, 150),
        'min_child_samples': trial.suggest_int('min_child_samples', 10, 100),
        'subsample': trial.suggest_float('subsample', 0.6, 1.0),
        'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
        'scale_pos_weight': trial.suggest_float('scale_pos_weight', 1.0, 15.0),
        'random_state': 42,
        'n_jobs': -1
    }
    
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
    pr_aucs = []
    
    for train_idx, val_idx in cv.split(X, y):
        X_train, y_train = X.iloc[train_idx], y.iloc[train_idx]
        X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]
        
        # Pipeline with Imputation -> SMOTE -> LightGBM
        model = ImbPipeline([
            ('imputer', SimpleImputer(strategy='median')),
            ('smote', SMOTE(random_state=42, sampling_strategy=0.2)),
            ('lgbm', LGBMClassifier(**params))
        ])
        
        model.fit(X_train, y_train)
        y_prob = model.predict_proba(X_val)[:, 1]
        score = average_precision_score(y_val, y_prob)
        pr_aucs.append(score)
        
    return np.mean(pr_aucs)

print("Starting Optuna study...")
study = optuna.create_study(direction="maximize")
study.optimize(objective, n_trials=30)  # ~30 trials is a good start

print(f"Best PR-AUC: {study.best_value:.4f}")
print("Best hyperparameters:")
for k, v in study.best_params.items():
    print(f"  {k}: {v}")

# Train final model on full data with best params
print("Training final tuned model on full dataset...")
best_model = ImbPipeline([
    ('imputer', SimpleImputer(strategy='median')),
    ('smote', SMOTE(random_state=42, sampling_strategy=0.2)),
    ('lgbm', LGBMClassifier(**study.best_params, random_state=42, n_jobs=-1))
])
best_model.fit(X, y)

import os
os.makedirs('../models', exist_ok=True)
joblib.dump(best_model, '../models/lightgbm_tuned.pkl')
print("Tuned model saved to ../models/lightgbm_tuned.pkl")
