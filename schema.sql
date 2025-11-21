CREATE TABLE IF NOT EXISTS uploaded_datasets (
    dataset_id     SERIAL PRIMARY KEY,
    uploaded_at    TIMESTAMPTZ NOT NULL,
    original_name  TEXT        NOT NULL,
    stored_path    TEXT        NOT NULL,
    file_bytes     BYTEA       NOT NULL
);

CREATE TABLE IF NOT EXISTS experiment_runs (
    run_id                    UUID PRIMARY KEY,
    run_timestamp             TIMESTAMPTZ NOT NULL,
    dataset_id                INTEGER REFERENCES uploaded_datasets(dataset_id),

    accuracy                  DOUBLE PRECISION NOT NULL,
    precision                 DOUBLE PRECISION NOT NULL,
    recall                    DOUBLE PRECISION NOT NULL,
    average_f1                DOUBLE PRECISION NOT NULL,

    f1_per_class              DOUBLE PRECISION[] NOT NULL,
    lightgbm_f1_per_class     DOUBLE PRECISION[] NOT NULL,
    xgboost_f1_per_class      DOUBLE PRECISION[] NOT NULL,
    catboost_f1_per_class     DOUBLE PRECISION[] NOT NULL,

    raw_json                  JSONB NOT NULL
);

SELECT * FROM uploaded_datasets;
SELECT * FROM experiment_runs;
