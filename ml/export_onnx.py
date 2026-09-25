"""
export_onnx.py

Loads the trained autoencoder (keystroke_autoencoder.pt) and exports it to
ONNX format, ready to be optimized via Qualcomm AI Hub and run on-device
with ONNX Runtime + the QNN execution provider.

Run this AFTER train_model.py has produced keystroke_autoencoder.pt.
"""

import json

import torch

from train_model import KeystrokeAutoencoder, FEATURE_DIM

CHECKPOINT_PATH = "keystroke_autoencoder.pt"
ONNX_OUTPUT_PATH = "keystroke_autoencoder.onnx"
STATS_OUTPUT_PATH = "model_stats.json"


def export():
    checkpoint = torch.load(CHECKPOINT_PATH, weights_only=False)

    model = KeystrokeAutoencoder()
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    # Dummy input matching (batch_size=1, FEATURE_DIM) shape
    dummy_input = torch.randn(1, FEATURE_DIM, dtype=torch.float32)

    torch.onnx.export(
        model,
        dummy_input,
        ONNX_OUTPUT_PATH,
        input_names=["features"],
        output_names=["reconstruction"],
        dynamic_axes={"features": {0: "batch_size"}, "reconstruction": {0: "batch_size"}},
        opset_version=17,
    )
    print(f"Exported ONNX model to: {ONNX_OUTPUT_PATH}")

    # Save normalization stats + threshold separately as JSON so the native
    # client can use them without needing PyTorch installed at inference time
    stats = {
        "feature_mean": checkpoint["feature_mean"].tolist(),
        "feature_std": checkpoint["feature_std"].tolist(),
        "anomaly_threshold": checkpoint["anomaly_threshold"],
        "feature_order": [
            "avg_dwell_time",
            "avg_flight_time",
            "typing_speed",
            "error_rate",
            "dwell_variance",
            "flight_variance",
            "grip_strength",
            "grip_asymmetry",
        ],
    }
    with open(STATS_OUTPUT_PATH, "w") as f:
        json.dump(stats, f, indent=2)
    print(f"Saved normalization stats + threshold to: {STATS_OUTPUT_PATH}")

    print("\nNext step: optimize this .onnx file via Qualcomm AI Hub")
    print("  pip install qai_hub_models qai-hub")
    print("  qai-hub configure --api_token <YOUR_API_TOKEN>")
    print("  (then submit a compile/profile job targeting your Snapdragon device)")


if __name__ == "__main__":
    export()