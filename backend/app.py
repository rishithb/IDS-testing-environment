"""Simple Flask backend to accept an uploaded CSV, run LCCDE.py on it,
and return structured JSON results to the frontend.

This version directly imports and calls the run_experiment function from
the LCCDE module for better performance and error handling.
"""

from flask import Flask, make_response, request, jsonify
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

# Import the LCCDE experiment function


# Create the Flask app and enable CORS for local development.
app = Flask(__name__)
CORS(app)  # remove/lock down in production

# Directory to store uploaded files temporarily.
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'uploads'))
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Process pool for running experiments with timeout protection
executor = ProcessPoolExecutor(max_workers=2)

@app.route('/testing', methods=['POST'])

@app.route('/lccde', methods=['POST'])
def lccde():
	req = request.get_json()
	print(req)
	try:
		df = pd.read_csv("CICIDS2017_sample_km.csv")
	except FileNotFoundError:
		print("Error: data/CICIDS2017_sample_km.csv not found. Make sure you run this from the repository root and the data file exists in the data/ folder.")
		return

	print("Label distribution:\n", df.Label.value_counts())

	# Split
	X = df.drop(['Label'], axis=1)
	y = df['Label']
	X_train, X_test, y_train, y_test = train_test_split(X, y, train_size=0.8, test_size=0.2, random_state=0)

	# SMOTE for class imbalance
	from imblearn.over_sampling import SMOTE
	# Some imbalanced-learn versions do not accept the `n_jobs` parameter in SMOTE.__init__.
	# Try to construct with n_jobs first, otherwise fall back without it for compatibility.
	try:
		smote = SMOTE(n_jobs=-1, sampling_strategy={2:1000, 4:1000})
	except TypeError:
		smote = SMOTE(sampling_strategy={2:1000, 4:1000})
	X_train, y_train = smote.fit_resample(X_train, y_train)

	print('\nAfter SMOTE label counts:\n', pd.Series(y_train).value_counts())

	# Train base learners
	print('\nTraining LightGBM...')
	lg = lgb.LGBMClassifier()
	lg.fit(X_train, y_train)
	y_pred_lg = lg.predict(X_test)
	print('\nLightGBM results:\n', classification_report(y_test, y_pred_lg))
	lg_f1 = f1_score(y_test, y_pred_lg, average=None)

	print('\nTraining XGBoost...')
	# suppress label encoder warning and set eval metric
	xg = xgb.XGBClassifier(use_label_encoder=False, eval_metric='mlogloss')
	X_train_x = X_train.values
	X_test_x = X_test.values
	xg.fit(X_train_x, y_train)
	y_pred_xg = xg.predict(X_test_x)
	print('\nXGBoost results:\n', classification_report(y_test, y_pred_xg))
	xg_f1 = f1_score(y_test, y_pred_xg, average=None)

	print('\nTraining CatBoost...')
	cb = cbt.CatBoostClassifier(verbose=0, boosting_type='Plain')
	cb.fit(X_train, y_train)
	y_pred_cb = cb.predict(X_test)
	print('\nCatBoost results:\n', classification_report(y_test, y_pred_cb))
	cb_f1 = f1_score(y_test, y_pred_cb, average=None)

	# Build leading model list per class
	model = []
	# Assumes classes are 0..(n-1) matching the f1 arrays length
	for i in range(len(lg_f1)):
		if max(lg_f1[i], xg_f1[i], cb_f1[i]) == lg_f1[i]:
			model.append(lg)
		elif max(lg_f1[i], xg_f1[i], cb_f1[i]) == xg_f1[i]:
			model.append(xg)
		else:
			model.append(cb)


	def LCCDE(X_test, y_test, m1, m2, m3):
		yt = []
		yp = []

		for xi, yi in stream.iter_pandas(X_test, y_test):
			xi2 = np.array(list(xi.values()))

			y_pred1 = int(m1.predict(xi2.reshape(1, -1))[0])
			y_pred2 = int(m2.predict(xi2.reshape(1, -1))[0])
			y_pred3 = int(m3.predict(xi2.reshape(1, -1))[0])

			p1 = m1.predict_proba(xi2.reshape(1, -1))
			p2 = m2.predict_proba(xi2.reshape(1, -1))
			p3 = m3.predict_proba(xi2.reshape(1, -1))

			y_pred_p1 = np.max(p1)
			y_pred_p2 = np.max(p2)
			y_pred_p3 = np.max(p3)

			# All three agree
			if y_pred1 == y_pred2 == y_pred3:
				y_pred = y_pred1

			# All three different
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

			# Two agree
			else:
				n = int(mode([y_pred1, y_pred2, y_pred3]))
				y_pred = int(model[n].predict(xi2.reshape(1, -1))[0])

			yt.append(yi)
			yp.append(y_pred)

		return yt, yp

	# Run LCCDE
	print('\nRunning LCCDE ensemble...')
	yt, yp = LCCDE(X_test, y_test, m1=lg, m2=xg, m3=cb)

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
	res = make_response(jsonify({"message": "LCCDE endpoint reached"}), 200)
	###response = make_response(jsonify(runLCCDE()), 200)
	return result_json

def test():
    print("hi")

    """
    Endpoint: POST /run

    Runs the LCCDE experiment on the default CSV file.
    """

    # Use the default CSV file from uploads folder (absolute path)
    ### path = 'CICIDS2017_sample_km.csv'
    """
    req = request.get_json()
    path = req.get('dataset')

    print(req)

    res = make_response(jsonify({"message": "LCCDE endpoint reached"}), 200)
    response = make_response(jsonify(runLCCDE()), 200)

    return response
    """
    
    

if __name__ == '__main__':
    # Run in debug mode on port 5000 for local development.
    app.run(host='0.0.0.0', port=5000)