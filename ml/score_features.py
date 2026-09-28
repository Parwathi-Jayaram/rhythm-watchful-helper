"""
score_features.py

Loads the trained model + normalization stats, and scores feature vectors
for anomaly detection. Run this to sanity-check the model against your own
typing data before wiring it into the live capture loop.

Usage:
    python score_features.py

Expects (in the same folder):
    optimized_keystroke_model.onnx   (or keystroke_autoencoder.onnx)
    model_stats.json
"""

import json
import numpy as np
import onnxruntime as ort

MODEL_PATH = "optimized_keystroke_model.onnx"
STATS_PATH = "model_stats.json"


def load_stats():
    with open(STATS_PATH) as f:
        return json.load(f)


def score_vector(session, input_name, vector, mean, std, threshold):
    """Returns (mse, is_anomaly) for a single 8-value feature vector."""
    vector = np.array(vector, dtype=np.float32)
    normalized = (vector - np.array(mean, dtype=np.float32)) / np.array(std, dtype=np.float32)
    input_tensor = normalized.reshape(1, -1).astype(np.float32)

    outputs = session.run(None, {input_name: input_tensor})
    reconstruction = outputs[0][0]

    mse = float(np.mean((reconstruction - normalized) ** 2))
    is_anomaly = mse > threshold
    return mse, is_anomaly


def main():
    stats = load_stats()
    mean = stats["feature_mean"]
    std = stats["feature_std"]
    threshold = stats["anomaly_threshold"]

    print(f"Loaded stats. Threshold = {threshold:.4f}")
    print(f"Feature order: {stats['feature_order']}\n")

    session = ort.InferenceSession(MODEL_PATH)
    input_name = session.get_inputs()[0].name

    # A few test vectors: one "typical" (close to your training data),
    # one deliberately exaggerated to simulate an anomaly.
    test_vectors = {
        "typical (from your real data)": [68.0, 165.0, 2.5, 1.0, 22.0, 150.0, 0.75, 0.05],
        "exaggerated anomaly (slow, high error)": [180.0, 500.0, 0.8, 25.0, 150.0, 400.0, 0.4, 0.3],
    }

    for label, vector in test_vectors.items():
        mse, is_anomaly = score_vector(session, input_name, vector, mean, std, threshold)
        status = "ANOMALY" if is_anomaly else "normal"
        print(f"[{status}] {label}: mse={mse:.4f} (threshold={threshold:.4f})")


if __name__ == "__main__":
    main()