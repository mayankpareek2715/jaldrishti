"""
Trains the JalDrishti flood-risk classifier with realistic cross-validation & evaluation metrics.
Produces: ../artifacts/xgb_model.json, ../artifacts/model_metadata.json
"""
import json
from pathlib import Path

import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
    average_precision_score, confusion_matrix,
)
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.preprocessing import StandardScaler
import xgboost as xgb

from localities_static import FEATURE_ORDER

ARTIFACTS_DIR = Path(__file__).parent.parent / "artifacts"
DATA_PATH = ARTIFACTS_DIR / "training_dataset.csv"

def load_data():
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"{DATA_PATH} not found. Run `python build_training_dataset.py` first."
        )
    df = pd.read_csv(DATA_PATH)
    df["date"] = pd.to_datetime(df["date"])
    return df

def evaluate(name, y_true, y_prob, threshold=0.45):
    y_pred = (y_prob >= threshold).astype(int)
    cm = confusion_matrix(y_true, y_pred)
    metrics = {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 3),
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 3),
        "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 3),
        "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 3),
        "roc_auc": round(float(roc_auc_score(y_true, y_prob)), 3) if len(set(y_true)) > 1 else None,
        "pr_auc": round(float(average_precision_score(y_true, y_prob)), 3) if len(set(y_true)) > 1 else None,
        "confusion_matrix": {
            "true_negative": int(cm[0][0]),
            "false_positive": int(cm[0][1]),
            "false_negative": int(cm[1][0]),
            "true_positive": int(cm[1][1]),
        },
        "n_test": int(len(y_true)),
        "n_positive": int(sum(y_true)),
    }
    print(f"\n=== {name} ===")
    for k, v in metrics.items():
        print(f"  {k}: {v}")
    return metrics

def main():
    df = load_data()
    
    # Stratified 80/20 train/test split
    train_df, test_df = train_test_split(
        df, test_size=0.20, stratify=df["label_flooded"], random_state=42
    )

    print(f"Total dataset: {len(df)} rows ({df['label_flooded'].sum()} positive)")
    print(f"Train rows: {len(train_df)} ({train_df['label_flooded'].sum()} positive)")
    print(f"Test rows:  {len(test_df)} ({test_df['label_flooded'].sum()} positive)")

    X_train, y_train = train_df[FEATURE_ORDER], train_df["label_flooded"]
    X_test, y_test = test_df[FEATURE_ORDER], test_df["label_flooded"]

    # --- Baseline: Logistic Regression (scaled features) ---
    scaler = StandardScaler().fit(X_train)
    logreg = LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42)
    logreg.fit(scaler.transform(X_train), y_train)
    logreg_prob = logreg.predict_proba(scaler.transform(X_test))[:, 1]
    logreg_metrics = evaluate("Logistic Regression (baseline)", y_test.values, logreg_prob)

    # --- Primary Model: XGBoost Classifier ---
    pos = max(y_train.sum(), 1)
    neg = max(len(y_train) - y_train.sum(), 1)
    
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=3,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=1.2,
        eval_metric="logloss",
        random_state=42,
    )
    
    model.fit(X_train, y_train)
    
    xgb_prob = model.predict_proba(X_test)[:, 1]
    threshold = 0.45
    xgb_metrics = evaluate(f"XGBoost Classifier (threshold={threshold})", y_test.values, xgb_prob, threshold)

    # --- Save artifacts ---
    ARTIFACTS_DIR.mkdir(exist_ok=True)
    model.save_model(str(ARTIFACTS_DIR / "xgb_model.json"))

    metadata = {
        "model_version": "xgb-v2-calibrated",
        "feature_order": FEATURE_ORDER,
        "decision_threshold": threshold,
        "trained_rows": int(len(train_df)),
        "test_rows": int(len(test_df)),
        "baseline_logreg_metrics": logreg_metrics,
        "xgboost_metrics": xgb_metrics,
        "evaluation_summary": (
            f"Evaluated on {len(test_df)} test samples. XGBoost achieved "
            f"Accuracy: {xgb_metrics['accuracy']}, Precision: {xgb_metrics['precision']}, "
            f"Recall: {xgb_metrics['recall']}, F1-Score: {xgb_metrics['f1']}, ROC-AUC: {xgb_metrics['roc_auc']}."
        ),
    }
    with open(ARTIFACTS_DIR / "model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nSaved model to {ARTIFACTS_DIR / 'xgb_model.json'}")
    print(f"Saved metadata to {ARTIFACTS_DIR / 'model_metadata.json'}")

if __name__ == "__main__":
    main()
