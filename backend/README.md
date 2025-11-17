# Backend Server

Flask backend that accepts CSV uploads and runs the LCCDE experiment.

## How It Works

1. **Frontend uploads CSV** → POST to `/run` endpoint with multipart form data (field name: `dataset`)
2. **Backend saves file** → Temporary file created in `uploads/` directory
3. **Runs LCCDE** → Calls `run_experiment(csv_path)` from `models/LCCDE.py` in a process pool with 10-minute timeout
4. **Returns JSON** → Structured results with LCCDE metrics and base model F1 scores
5. **Cleanup** → Temp file deleted automatically

## Setup

```bash
# Create and activate virtual environment (from repo root)
python3 -m venv .venv
source .venv/bin/activate  # On macOS/Linux

# Install dependencies
pip install flask flask-cors pandas numpy scikit-learn lightgbm xgboost catboost imbalanced-learn river seaborn matplotlib
```

## Running the Server

```bash
# From the backend directory
cd backend
python app.py
```

Server runs on `http://localhost:5000`

## API Endpoint

### POST /run

Upload a CSV file and run LCCDE experiment.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: CSV file with field name `dataset`

**Response (Success):**
```json
{
  "success": true,
  "result": {
    "meta": {
      "n_rows": 1000,
      "n_test": 200,
      "duration_seconds": 45.2
    },
    "lccde": {
      "accuracy": 0.98,
      "precision": 0.97,
      "recall": 0.98,
      "f1": 0.975,
      "f1_per_class": [0.99, 0.95, 0.98]
    },
    "base_f1": {
      "lightgbm": [0.97, 0.93, 0.96],
      "xgboost": [0.98, 0.94, 0.97],
      "catboost": [0.96, 0.92, 0.95]
    }
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "CSV must contain a 'Label' column"
}
```

## Testing with curl

```bash
curl -X POST http://localhost:5000/run \
  -F "dataset=@/path/to/your/file.csv"
```

## File Structure

```
backend/
├── app.py              # Flask server
├── models/
│   ├── __init__.py     # Package marker
│   └── LCCDE.py        # ML experiment logic
├── uploads/            # Temp upload storage (created automatically)
└── README.md           # This file
```

## Notes

- CSV must have a `Label` column for classification
- Experiment timeout is 10 minutes (configurable in `app.py`)
- Uses ProcessPoolExecutor to isolate heavy ML work from Flask server
- CORS enabled for local development (disable in production)
