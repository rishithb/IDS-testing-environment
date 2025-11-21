from flask import Blueprint, request, jsonify
from DBmodels import db, Experiment, Metric, Parameter

api_bp = Blueprint('db-api', __name__)

@api_bp.route('/experiments', methods=['GET'])
def list_experiments():
    experiments = Experiment.query.all()
    """
    data = [
        {
            "experiment_id": e.experiment_id,
            "experiment_name": e.experiment_name,
            "status": e.status,
            "run_timestamp": e.run_timestamp
        }
        for e in experiments
    ]
    return jsonify(data)
    """
    return jsonify([e.to_dict() for e in experiments])


@api_bp.route('/experiments', methods=['POST'])
def create_experiment():
    data = request.json
    new_exp = Experiment(
        user_id=data.get('user_id'),
        model_id=data.get('model_id'),
        dataset_id=data.get('dataset_id'),
        experiment_name=data.get('experiment_name'),
        status='running'
    )
    db.session.add(new_exp)
    db.session.commit()

    return jsonify({"message": "Experiment created", "experiment_id": new_exp.experiment_id})
