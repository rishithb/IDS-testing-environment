"""Simple Flask backend to accept an uploaded CSV, run LCCDE.py on it,
and return structured JSON results to the frontend.

This version directly imports and calls the run_experiment function from
the LCCDE module for better performance and error handling.
"""

from flask import Flask, make_response, request, jsonify, Blueprint
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
from config import Config
from DBmodels import db, Experiment, Metric, Parameter

# Import the LCCDE experiment function


# Create the Flask app and enable CORS for local development.
app = Flask(__name__)
app.config.from_object(Config)
CORS(app)  # remove/lock down in production

# Initialize database with app
db.init_app(app)

# Import and register blueprints after db is initialized
from routes import api_bp
app.register_blueprint(api_bp, url_prefix='/db-api')

# Create tables if they don't exist
with app.app_context():
    # Import models to register them
    import DBmodels
    db.create_all()

# Directory to store uploaded files temporarily.
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'uploads'))
os.makedirs(UPLOAD_DIR, exist_ok=True)

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
	"""
	{
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
	"""
	return test_result

@app.route('/lccde', methods=['POST'])
def lccde():
	req = request.get_json()
	
	# Get the next run ID based on database count
	experiment_count = Experiment.query.count()
	run_id = f"{experiment_count + 1:03d}"  # e.g., "RUN-0001", "RUN-0002"
	
	print(req)
	try:
		df = pd.read_csv("CICIDS2017_sample_km.csv")
	except FileNotFoundError:
		print("Error: data/CICIDS2017_sample_km.csv not found. Make sure you run this from the repository root and the data file exists in the data/ folder.")
		return

	# Get parameters from nested object
	params = req.get('parameters', {})
	clusters = params.get('clusters')  # default 1000
	smote_samples = params.get('smote')  # default 1000
	if clusters is None:
		clusters = 1000  # enforce default
	if smote_samples is None:
		smote_samples = 1000  # enforce default
	if smote_samples < 100:
		smote_samples = 100  # enforce minimum
	print(f"[RUN {run_id}]Clusters received:", clusters)
	print(f"[RUN {run_id}]SMOTE settings received:", smote_samples)

	print(f"[RUN {run_id}]Label distribution:\n", df.Label.value_counts())

	# Split
	X = df.drop(['Label'], axis=1)
	y = df['Label']
	X_train, X_test, y_train, y_test = train_test_split(X, y, train_size=0.8, test_size=0.2, random_state=0)

	# SMOTE for class imbalance
	from imblearn.over_sampling import SMOTE
	# Some imbalanced-learn versions do not accept the `n_jobs` parameter in SMOTE.__init__.
	# Try to construct with n_jobs first, otherwise fall back without it for compatibility.
	try:
		smote = SMOTE(n_jobs=-1, sampling_strategy={2:smote_samples, 4:smote_samples})
	except TypeError:
		smote = SMOTE(sampling_strategy={2:smote_samples, 4:smote_samples})
	X_train, y_train = smote.fit_resample(X_train, y_train)

	"""
	# Check current class counts
	train_label_counts = pd.Series(y_train).value_counts()
	print(f"\n[RUN {run_id}]Original training label counts:\n", train_label_counts)

	# SMOTE for class imbalance - only if requested samples > existing samples
	if smote_samples and smote_samples > 0:
		# Check if SMOTE would actually increase samples for target classes
		class_2_count = train_label_counts.get(2, 0)
		class_4_count = train_label_counts.get(4, 0)
		
		if smote_samples > class_2_count or smote_samples > class_4_count:
			from imblearn.over_sampling import SMOTE
			print(f"[RUN {run_id}]Applying SMOTE to upsample classes 2 and 4 to {smote_samples} samples")
			try:
				smote = SMOTE(n_jobs=-1, sampling_strategy={2:smote_samples, 4:smote_samples})
			except TypeError:
				smote = SMOTE(sampling_strategy={2:smote_samples, 4:smote_samples})
			X_train, y_train = smote.fit_resample(X_train, y_train)
			print('\nAfter SMOTE label counts:\n', pd.Series(y_train).value_counts())
		else:
			print(f"[RUN {run_id}]Skipping SMOTE - requested samples ({smote_samples}) <= existing samples (class 2: {class_2_count}, class 4: {class_4_count})")
	else:
		print(f"[RUN {run_id}]Skipping SMOTE - no SMOTE samples specified")
	"""

	print('\nAfter SMOTE label counts:\n', pd.Series(y_train).value_counts())

	# Train base learners
	print('\nTraining LightGBM...')
	lg = lgb.LGBMClassifier()
	lg.fit(X_train, y_train)
	y_pred_lg = lg.predict(X_test)
	# print('\nLightGBM results:\n', classification_report(y_test, y_pred_lg))
	lg_f1 = f1_score(y_test, y_pred_lg, average=None)

	print('\nTraining XGBoost...')
	# suppress label encoder warning and set eval metric
	xg = xgb.XGBClassifier(use_label_encoder=False, eval_metric='mlogloss')
	X_train_x = X_train.values
	X_test_x = X_test.values
	xg.fit(X_train_x, y_train)
	y_pred_xg = xg.predict(X_test_x)
	# print('\nXGBoost results:\n', classification_report(y_test, y_pred_xg))
	xg_f1 = f1_score(y_test, y_pred_xg, average=None)

	print('\nTraining CatBoost...')
	cb = cbt.CatBoostClassifier(verbose=0, boosting_type='Plain')
	cb.fit(X_train, y_train)
	y_pred_cb = cb.predict(X_test)
	# print('\nCatBoost results:\n', classification_report(y_test, y_pred_cb))
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
	
	# Save experiment to database
	new_exp = Experiment(
		experiment_name = f"LCCDE-{run_id}",

		status = 'completed'
	)
	db.session.add(new_exp)
	db.session.flush()  # Get experiment_id before commit
	
	# Save LCCDE metrics
	metrics = [
		Metric(experiment_id=new_exp.experiment_id, metric_name='lccde_accuracy', metric_value=accuracy_score(yt, yp)),
		Metric(experiment_id=new_exp.experiment_id, metric_name='lccde_precision', metric_value=precision_score(yt, yp, average='weighted')),
		Metric(experiment_id=new_exp.experiment_id, metric_name='lccde_recall', metric_value=recall_score(yt, yp, average='weighted')),
		Metric(experiment_id=new_exp.experiment_id, metric_name='lccde_average_f1', metric_value=f1_score(yt, yp, average='weighted'))
	]
	
	# Save base model F1 scores (average across all classes)
	metrics.extend([
		Metric(experiment_id=new_exp.experiment_id, metric_name='lightgbm_avg_f1', metric_value=float(lg_f1.mean())),
		Metric(experiment_id=new_exp.experiment_id, metric_name='xgboost_avg_f1', metric_value=float(xg_f1.mean())),
		Metric(experiment_id=new_exp.experiment_id, metric_name='catboost_avg_f1', metric_value=float(cb_f1.mean()))
	])
	
	# Save parameters
	parameters = [
		Parameter(experiment_id=new_exp.experiment_id, param_name='clusters', param_value=str(clusters)),
		Parameter(experiment_id=new_exp.experiment_id, param_name='smote_samples', param_value=str(smote_samples))
	]
	
	db.session.add_all(metrics)
	db.session.add_all(parameters)
	db.session.commit()
	
	return result_json


if __name__ == '__main__':
    # Run in debug mode on port 5000 for local development.
    app.run(host='0.0.0.0', port=5000, debug=True)