"""Simple Flask backend to accept an uploaded CSV, run LCCDE.py on it,
and return structured JSON results to the frontend.

This version directly imports and calls the run_experiment function from
the LCCDE module for better performance and error handling.
"""

from flask import Flask, make_response, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import tempfile
from concurrent.futures import ProcessPoolExecutor, TimeoutError as FuturesTimeoutError
import traceback
import warnings
warnings.filterwarnings("ignore")
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_score, recall_score, f1_score
import lightgbm as lgb
import catboost as cbt
import xgboost as xgb
import time
from river import stream
from statistics import mode
import uuid
import psycopg2
from datetime import datetime, timezone
import json

app = Flask(__name__)
import os
CORS(app)

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'uploads'))
os.makedirs(UPLOAD_DIR, exist_ok=True)

executor = ProcessPoolExecutor(max_workers=2)

@app.route('/testing', methods=['POST'])
def testing():
    test_result = {
        "results": {
            "base_models": {
                "catboost_f1_per_class": [
                    0.9974025974025974,
                    0.9922279792746114,
                    1,
                    0.9959183673469387,
                    0.7692307692307693,
                    0.9913793103448276,
                    0.9944629014396457
                ],
                "lightgbm_f1_per_class": [
                    0.9984962406015038,
                    0.9935316946959897,
                    1,
                    0.9983633387888707,
                    0.8571428571428571,
                    0.9935483870967742,
                    0.9988925802879292
                ],
                "xgboost_f1_per_class": [
                    0.997949979499795,
                    0.9909208819714657,
                    1,
                    0.9991836734693877,
                    0.8571428571428571,
                    0.9913793103448276,
                    0.9966703662597114
                ]
            },
            "lccde": {
                "accuracy": 0.9977611940298508,
                "average_f1": 0.9977357558566934,
                "f1_per_class": [
                    0.9984962406015038,
                    0.9935316946959897,
                    1,
                    0.9983633387888707,
                    0.8571428571428571,
                    0.9935483870967742,
                    0.9988925802879292
                ],
                "precision": 0.9977684737806599,
                "recall": 0.9977611940298508
            }
        }
    }
    return jsonify(test_result)

@app.route('/upload-dataset', methods=['POST'])
def upload_dataset():
    if 'file' not in request.files:
        return jsonify({"error": "no file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "no file selected"}), 400
    filename = file.filename
    file_bytes = file.read()
    save_path = os.path.join(UPLOAD_DIR, filename)
    with open(save_path, 'wb') as f:
        f.write(file_bytes)
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            dbname="idsml",
            user="ilanali",
            password="Zssb7861"
        )
        cur = conn.cursor()
        uploaded_at = datetime.now(timezone.utc)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS uploaded_datasets (
                dataset_id SERIAL PRIMARY KEY,
                uploaded_at TIMESTAMPTZ NOT NULL,
                original_name TEXT NOT NULL,
                stored_path TEXT NOT NULL,
                file_bytes BYTEA NOT NULL
            )
        """)
        cur.execute("""
            INSERT INTO uploaded_datasets (uploaded_at, original_name, stored_path, file_bytes)
            VALUES (%s, %s, %s, %s)
            RETURNING dataset_id
        """, (uploaded_at, filename, save_path, psycopg2.Binary(file_bytes)))
        dataset_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
    except Exception:
        return jsonify({"error": "database error"}), 500
    return jsonify({
        "dataset_id": dataset_id,
        "uploaded_at": uploaded_at.isoformat(),
        "original_name": filename,
        "stored_path": save_path
    }), 201

@app.route('/lccde', methods=['POST'])
def lccde():
    req = request.get_json(silent=True) or {}
    run_id = str(uuid.uuid4())
    dataset_id = req.get('dataset_id')
    if not dataset_id:
        return jsonify({"error": "dataset_id is required"}), 400
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            dbname="idsml",
            user="ilanali",
            password="Zssb7861"
        )
        cur = conn.cursor()
        cur.execute("SELECT stored_path FROM uploaded_datasets WHERE dataset_id = %s", (dataset_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return jsonify({"error": "dataset_id not found"}), 400
        stored_path = row[0]
    except Exception as e:
        print("DB lookup error:", e)
        return jsonify({"error": "database error"}), 500
    try:
        df = pd.read_csv(stored_path)
    except FileNotFoundError:
        print("Error: CSV not found at path", stored_path)
        return jsonify({"error": "csv not found"}), 400
    print(f"[RUN {run_id}] Label distribution:\n", df.Label.value_counts())
    X = df.drop(['Label'], axis=1)
    y = df['Label']
    X_train, X_test, y_train, y_test = train_test_split(X, y, train_size=0.8, test_size=0.2, random_state=0)
    from imblearn.over_sampling import SMOTE
    try:
        smote = SMOTE(n_jobs=-1, sampling_strategy={2:1000, 4:1000})
    except TypeError:
        smote = SMOTE(sampling_strategy={2:1000, 4:1000})
    X_train, y_train = smote.fit_resample(X_train, y_train)
    print('\nAfter SMOTE label counts:\n', pd.Series(y_train).value_counts())
    print('\nTraining LightGBM...')
    lg = lgb.LGBMClassifier()
    lg.fit(X_train, y_train)
    y_pred_lg = lg.predict(X_test)
    lg_f1 = f1_score(y_test, y_pred_lg, average=None)
    print('\nTraining XGBoost...')
    xg = xgb.XGBClassifier(use_label_encoder=False, eval_metric='mlogloss')
    X_train_x = X_train.values
    X_test_x = X_test.values
    xg.fit(X_train_x, y_train)
    y_pred_xg = xg.predict(X_test_x)
    xg_f1 = f1_score(y_test, y_pred_xg, average=None)
    print('\nTraining CatBoost...')
    cb = cbt.CatBoostClassifier(verbose=0, boosting_type='Plain')
    cb.fit(X_train, y_train)
    y_pred_cb = cb.predict(X_test)
    cb_f1 = f1_score(y_test, y_pred_cb, average=None)
    model = []
    for i in range(len(lg_f1)):
        if max(lg_f1[i], xg_f1[i], cb_f1[i]) == lg_f1[i]:
            model.append(lg)
        elif max(lg_f1[i], xg_f1[i], cb_f1[i]) == xg_f1[i]:
            model.append(xg)
        else:
            model.append(cb)
    def LCCDE_predict(X_test, y_test, m1, m2, m3):
        yt = []
        yp = []
        for xi, yi in stream.iter_pandas(X_test, y_test):
            xi2 = np.array(list(xi.values()))
            xi2 = xi2.reshape(1, -1)
            y_pred1 = int(m1.predict(xi2)[0])
            y_pred2 = int(m2.predict(xi2)[0])
            y_pred3 = int(m3.predict(xi2)[0])
            p1 = m1.predict_proba(xi2)
            p2 = m2.predict_proba(xi2)
            p3 = m3.predict_proba(xi2)
            y_pred_p1 = np.max(p1)
            y_pred_p2 = np.max(p2)
            y_pred_p3 = np.max(p3)
            if y_pred1 == y_pred2 == y_pred3:
                y_pred = y_pred1
            elif (y_pred1 != y_pred2) and (y_pred1 != y_pred3) and (y_pred2 != y_pred3):
                l = []
                pred_l = []
                pro_l = []
                if model[y_pred1] == m1:
                    l.append(m1)
                    pred_l.append(y_pred1)
                    pro_l.append(y_pred_p1)
                if model[y_pred2] == m2:
                    l.append(m2)
                    pred_l.append(y_pred2)
                    pro_l.append(y_pred_p2)
                if model[y_pred3] == m3:
                    l.append(m3)
                    pred_l.append(y_pred3)
                    pro_l.append(y_pred_p3)
                if len(l) == 0:
                    pro_l = [y_pred_p1, y_pred_p2, y_pred_p3]
                if len(l) == 1:
                    y_pred = pred_l[0]
                else:
                    max_p = max(pro_l)
                    if max_p == y_pred_p1:
                        y_pred = y_pred1
                    elif max_p == y_pred_p2:
                        y_pred = y_pred2
                    else:
                        y_pred = y_pred3
            else:
                n = int(mode([y_pred1, y_pred2, y_pred3]))
                y_pred = int(model[n].predict(xi2)[0])
            yt.append(yi)
            yp.append(y_pred)
        return yt, yp
    print('\nRunning LCCDE ensemble...')
    yt, yp = LCCDE_predict(X_test, y_test, m1=lg, m2=xg, m3=cb)
    print('\nLCCDE performance:')
    print('Accuracy of LCCDE: ', accuracy_score(yt, yp))
    print('Precision of LCCDE: ', precision_score(yt, yp, average='weighted'))
    print('Recall of LCCDE: ', recall_score(yt, yp, average='weighted'))
    print('Average F1 of LCCDE: ', f1_score(yt, yp, average='weighted'))
    print('F1 of LCCDE for each type of attack: ', f1_score(yt, yp, average=None))
    print('\nBase model F1s:')
    print('F1 of LightGBM for each type of attack: ', lg_f1)
    print('F1 of XGBoost for each type of attack: ', xg_f1)
    print('F1 of CatBoost for each type of attack: ', cb_f1)
    result_json = {
        'results': {
            'lccde': {
                'accuracy': accuracy_score(yt, yp),
                'precision': precision_score(yt, yp, average='weighted'),
                'recall': recall_score(yt, yp, average='weighted'),
                'average_f1': f1_score(yt, yp, average='weighted'),
                'f1_per_class': f1_score(yt, yp, average=None).tolist()
            },
            'base_models': {
                'lightgbm_f1_per_class': lg_f1.tolist(),
                'xgboost_f1_per_class': xg_f1.tolist(),
                'catboost_f1_per_class': cb_f1.tolist()
            }
        }
    }
    run_timestamp = datetime.now(timezone.utc)
    accuracy_val = result_json['results']['lccde']['accuracy']
    precision_val = result_json['results']['lccde']['precision']
    recall_val = result_json['results']['lccde']['recall']
    average_f1_val = result_json['results']['lccde']['average_f1']
    f1_list = result_json['results']['lccde']['f1_per_class']
    lg_list = result_json['results']['base_models']['lightgbm_f1_per_class']
    xg_list = result_json['results']['base_models']['xgboost_f1_per_class']
    cb_list = result_json['results']['base_models']['catboost_f1_per_class']
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            dbname="idsml",
            user="ilanali",
            password="Zssb7861"
        )
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS experiment_runs (
                run_id UUID PRIMARY KEY,
                run_timestamp TIMESTAMPTZ NOT NULL,
                dataset_id INTEGER REFERENCES uploaded_datasets(dataset_id),
                accuracy DOUBLE PRECISION NOT NULL,
                precision DOUBLE PRECISION NOT NULL,
                recall DOUBLE PRECISION NOT NULL,
                average_f1 DOUBLE PRECISION NOT NULL,
                f1_per_class DOUBLE PRECISION[] NOT NULL,
                lightgbm_f1_per_class DOUBLE PRECISION[] NOT NULL,
                xgboost_f1_per_class DOUBLE PRECISION[] NOT NULL,
                catboost_f1_per_class DOUBLE PRECISION[] NOT NULL,
                raw_json JSONB NOT NULL
            )
        """)
        cur.execute(
            """
            INSERT INTO experiment_runs (
                run_id,
                run_timestamp,
                dataset_id,
                accuracy,
                precision,
                recall,
                average_f1,
                f1_per_class,
                lightgbm_f1_per_class,
                xgboost_f1_per_class,
                catboost_f1_per_class,
                raw_json
            ) VALUES (
                %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s
            )
            """,
            (
                run_id,
                run_timestamp,
                dataset_id,
                float(accuracy_val),
                float(precision_val),
                float(recall_val),
                float(average_f1_val),
                f1_list,
                lg_list,
                xg_list,
                cb_list,
                json.dumps(result_json),
            )
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print("DB insert error:", e)
    return jsonify(result_json)

def test():
    print("hi")

FRONTEND_FOLDER = os.path.join(os.path.dirname(__file__), "..", "frontend")

@app.route("/")
def index():
    return send_from_directory(FRONTEND_FOLDER, "index.html")

@app.route("/<path:filename>")
def frontend_files(filename):
    return send_from_directory(FRONTEND_FOLDER, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
