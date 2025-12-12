from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Create db instance here (will be initialized in app.py)
db = SQLAlchemy()

# ---------------- USERS ----------------
class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    experiments = db.relationship('Experiment', back_populates='user')


# ---------------- MODELS ----------------
class MLModel(db.Model):
    __tablename__ = 'models'
    model_id = db.Column(db.Integer, primary_key=True)
    model_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    framework = db.Column(db.String(50), default='scikit-learn')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    experiments = db.relationship('Experiment', back_populates='model')


# ---------------- DATASETS ----------------
class Dataset(db.Model):
    __tablename__ = 'datasets'
    dataset_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    source_url = db.Column(db.Text)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

    experiments = db.relationship('Experiment', back_populates='dataset')


# ---------------- EXPERIMENTS ----------------
class Experiment(db.Model):
    __tablename__ = 'experiments'
    experiment_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    model_id = db.Column(db.Integer, db.ForeignKey('models.model_id'))
    dataset_id = db.Column(db.Integer, db.ForeignKey('datasets.dataset_id'))
    experiment_name = db.Column(db.String(150))
    run_timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), default='completed')
    notes = db.Column(db.Text)

    user = db.relationship('User', back_populates='experiments')
    model = db.relationship('MLModel', back_populates='experiments')
    dataset = db.relationship('Dataset', back_populates='experiments')

    parameters = db.relationship('Parameter', cascade='all, delete', back_populates='experiment')
    metrics = db.relationship('Metric', cascade='all, delete', back_populates='experiment')
    logs = db.relationship('Log', cascade='all, delete', back_populates='experiment')

    def to_dict(self):
        return {
            'experiment_id': self.experiment_id,
            'user_id': self.user_id,
            'model_id': self.model_id,
            'dataset_id': self.dataset_id,
            'experiment_name': self.experiment_name,
            'run_timestamp': self.run_timestamp.isoformat() if self.run_timestamp else None,
            'status': self.status,
            'notes': self.notes,
            'parameters': [{'param_name': p.param_name, 'param_value': p.param_value} for p in self.parameters],
            'metrics': [{'metric_name': m.metric_name, 'metric_value': m.metric_value} for m in self.metrics],
            'logs': [{'log_message': l.log_message, 'log_level': l.log_level, 'created_at': l.created_at.isoformat() if l.created_at else None} for l in self.logs]
        }


# ---------------- PARAMETERS ----------------
class Parameter(db.Model):
    __tablename__ = 'parameters'
    param_id = db.Column(db.Integer, primary_key=True)
    experiment_id = db.Column(db.Integer, db.ForeignKey('experiments.experiment_id'))
    param_name = db.Column(db.String(100), nullable=False)
    param_value = db.Column(db.String(255))

    experiment = db.relationship('Experiment', back_populates='parameters')


# ---------------- METRICS ----------------
class Metric(db.Model):
    __tablename__ = 'metrics'
    metric_id = db.Column(db.Integer, primary_key=True)
    experiment_id = db.Column(db.Integer, db.ForeignKey('experiments.experiment_id'))
    metric_name = db.Column(db.String(100), nullable=False)
    metric_value = db.Column(db.Float)

    experiment = db.relationship('Experiment', back_populates='metrics')


# ---------------- LOGS ----------------
class Log(db.Model):
    __tablename__ = 'logs'
    log_id = db.Column(db.Integer, primary_key=True)
    experiment_id = db.Column(db.Integer, db.ForeignKey('experiments.experiment_id'))
    log_message = db.Column(db.Text)
    log_level = db.Column(db.String(20), default='INFO')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    experiment = db.relationship('Experiment', back_populates='logs')
